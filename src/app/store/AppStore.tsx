import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AccommodationCandidate,
  ApplicationSettings,
  PlaceCategory,
  RoutePlan,
  SavedPlace,
  ThemePreference,
  Trip,
  TransportMode,
} from '@/domain/schemas';
import { createId, nowIso } from '@/domain/ids';
import {
  accommodationRepository,
  dataPortRepository,
  routePlanRepository,
  savedPlaceRepository,
  settingsRepository,
  tripRepository,
} from '@/infrastructure/persistence/repositories';
import { exportToBlob, importFromText } from '@/features/import-export/importExport';
import type { PlaceSearchResult } from '@/infrastructure/google/placesGateway';

const DEFAULT_SETTINGS: ApplicationSettings = {
  id: 'app-settings',
  theme: 'dark',
  locale: 'fr-FR',
  googleMapsApiKey: undefined,
  activeTripId: undefined,
  updatedAt: nowIso(),
};

interface AppStoreValue {
  ready: boolean;
  settings: ApplicationSettings;
  effectiveMapsKey: string | undefined;
  trips: Trip[];
  activeTrip: Trip | undefined;
  savedPlaces: SavedPlace[];
  candidates: AccommodationCandidate[];
  routePlan: RoutePlan | undefined;

  // Settings
  saveMapsKey(key: string): Promise<void>;
  removeMapsKey(): Promise<void>;
  setTheme(theme: ThemePreference): Promise<void>;
  setLocale(locale: string): Promise<void>;

  // Trips
  createTrip(input: { name: string; destination?: string }): Promise<Trip>;
  renameTrip(id: string, name: string): Promise<void>;
  updateTrip(id: string, patch: Partial<Trip>): Promise<void>;
  duplicateTrip(id: string): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  selectTrip(id: string): Promise<void>;

  // Places
  savePlace(
    result: PlaceSearchResult,
    category: PlaceCategory,
    extra?: { visitStartDate?: string; visitEndDate?: string; notes?: string },
  ): Promise<void>;
  updateSavedPlace(place: SavedPlace): Promise<void>;
  removeSavedPlace(id: string): Promise<void>;

  // Accommodation
  addCandidate(
    input: Omit<AccommodationCandidate, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>,
  ): Promise<void>;
  removeCandidate(id: string): Promise<void>;

  // Route
  setRouteStops(stops: RoutePlan['stops']): Promise<void>;
  setRouteMode(mode: TransportMode): Promise<void>;

  // Data
  exportData(scope: 'all' | 'active'): Promise<Blob | null>;
  importData(
    text: string,
    strategy: 'replace' | 'merge',
    tripIds?: string[],
  ): Promise<boolean>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<ApplicationSettings>(DEFAULT_SETTINGS);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | undefined>(undefined);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [candidates, setCandidates] = useState<AccommodationCandidate[]>([]);
  const [routePlan, setRoutePlan] = useState<RoutePlan | undefined>(undefined);

  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || undefined;
  const effectiveMapsKey = settings.googleMapsApiKey?.trim() || envKey;

  const persistSettings = useCallback(async (next: ApplicationSettings) => {
    const withStamp = { ...next, updatedAt: nowIso() };
    setSettings(withStamp);
    await settingsRepository.save(withStamp);
  }, []);

  const loadTripData = useCallback(async (tripId: string | undefined) => {
    if (!tripId) {
      setSavedPlaces([]);
      setCandidates([]);
      setRoutePlan(undefined);
      return;
    }
    const [places, cands, routes] = await Promise.all([
      savedPlaceRepository.listByTrip(tripId),
      accommodationRepository.listByTrip(tripId),
      routePlanRepository.listByTrip(tripId),
    ]);
    setSavedPlaces(places);
    setCandidates(cands);
    setRoutePlan(routes[0]);
  }, []);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSettings, loadedTrips] = await Promise.all([
        settingsRepository.get(),
        tripRepository.list(),
      ]);
      if (cancelled) return;
      const nextSettings = loadedSettings ?? DEFAULT_SETTINGS;
      setSettings(nextSettings);
      setTrips(loadedTrips);
      const active =
        nextSettings.activeTripId &&
        loadedTrips.some((trip) => trip.id === nextSettings.activeTripId)
          ? nextSettings.activeTripId
          : loadedTrips[0]?.id;
      setActiveTripId(active);
      await loadTripData(active);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTripData]);

  const activeTrip = useMemo(
    () => trips.find((trip) => trip.id === activeTripId),
    [trips, activeTripId],
  );

  const ensureRoutePlan = useCallback(
    async (tripId: string): Promise<RoutePlan> => {
      if (routePlan && routePlan.tripId === tripId) return routePlan;
      const created: RoutePlan = {
        id: createId('route'),
        tripId,
        stops: [],
        selectedMode: 'DRIVING',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await routePlanRepository.save(created);
      setRoutePlan(created);
      return created;
    },
    [routePlan],
  );

  const value = useMemo<AppStoreValue>(() => {
    return {
      ready,
      settings,
      effectiveMapsKey,
      trips,
      activeTrip,
      savedPlaces,
      candidates,
      routePlan,

      async saveMapsKey(key) {
        await persistSettings({ ...settings, googleMapsApiKey: key.trim() });
      },
      async removeMapsKey() {
        await persistSettings({ ...settings, googleMapsApiKey: undefined });
      },
      async setTheme(theme) {
        await persistSettings({ ...settings, theme });
      },
      async setLocale(locale) {
        await persistSettings({ ...settings, locale });
      },

      async createTrip({ name, destination }) {
        const trip: Trip = {
          id: createId('trip'),
          name: name.trim() || 'Voyage',
          destination: destination?.trim() || undefined,
          locale: settings.locale,
          currency: 'EUR',
          days: [],
          mapPreferences: {},
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await tripRepository.save(trip);
        setTrips((prev) => [trip, ...prev]);
        setActiveTripId(trip.id);
        await persistSettings({ ...settings, activeTripId: trip.id });
        await loadTripData(trip.id);
        return trip;
      },
      async renameTrip(id, name) {
        const trip = trips.find((item) => item.id === id);
        if (!trip) return;
        const updated = { ...trip, name: name.trim() || trip.name, updatedAt: nowIso() };
        await tripRepository.save(updated);
        setTrips((prev) => prev.map((item) => (item.id === id ? updated : item)));
      },
      async updateTrip(id, patch) {
        const trip = trips.find((item) => item.id === id);
        if (!trip) return;
        const updated = { ...trip, ...patch, id: trip.id, updatedAt: nowIso() };
        await tripRepository.save(updated);
        setTrips((prev) => prev.map((item) => (item.id === id ? updated : item)));
      },
      async duplicateTrip(id) {
        const trip = trips.find((item) => item.id === id);
        if (!trip) return;
        const copyId = createId('trip');
        const copy: Trip = {
          ...trip,
          id: copyId,
          name: `${trip.name} (copie)`,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await tripRepository.save(copy);
        const [places, cands, routes] = await Promise.all([
          savedPlaceRepository.listByTrip(id),
          accommodationRepository.listByTrip(id),
          routePlanRepository.listByTrip(id),
        ]);
        await Promise.all([
          ...places.map((place) =>
            savedPlaceRepository.save({ ...place, id: createId('place'), tripId: copyId }),
          ),
          ...cands.map((cand) =>
            accommodationRepository.save({ ...cand, id: createId('stay'), tripId: copyId }),
          ),
          ...routes.map((route) =>
            routePlanRepository.save({ ...route, id: createId('route'), tripId: copyId }),
          ),
        ]);
        setTrips((prev) => [copy, ...prev]);
      },
      async deleteTrip(id) {
        await tripRepository.delete(id);
        const remaining = trips.filter((item) => item.id !== id);
        setTrips(remaining);
        if (activeTripId === id) {
          const nextActive = remaining[0]?.id;
          setActiveTripId(nextActive);
          await persistSettings({ ...settings, activeTripId: nextActive });
          await loadTripData(nextActive);
        }
      },
      async selectTrip(id) {
        setActiveTripId(id);
        await persistSettings({ ...settings, activeTripId: id });
        await loadTripData(id);
      },

      async savePlace(result, category, extra) {
        if (!activeTripId) return;
        const place: SavedPlace = {
          id: createId('place'),
          tripId: activeTripId,
          category,
          reference: {
            placeId: result.placeId,
            coordinates: result.coordinates,
            displayName: result.displayName,
            address: result.address,
          },
          tags: [],
          dayIds: [],
          visitStartDate: extra?.visitStartDate,
          visitEndDate: extra?.visitEndDate,
          notes: extra?.notes,
          rating: result.rating,
          priceLevel: result.priceLevel,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await savedPlaceRepository.save(place);
        setSavedPlaces((prev) => [...prev, place]);
      },
      async updateSavedPlace(place) {
        const updated = { ...place, updatedAt: nowIso() };
        await savedPlaceRepository.save(updated);
        setSavedPlaces((prev) => prev.map((item) => (item.id === place.id ? updated : item)));
      },
      async removeSavedPlace(id) {
        await savedPlaceRepository.delete(id);
        setSavedPlaces((prev) => prev.filter((item) => item.id !== id));
      },

      async addCandidate(input) {
        if (!activeTripId) return;
        const candidate: AccommodationCandidate = {
          ...input,
          id: createId('stay'),
          tripId: activeTripId,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await accommodationRepository.save(candidate);
        setCandidates((prev) => [...prev, candidate]);
      },
      async removeCandidate(id) {
        await accommodationRepository.delete(id);
        setCandidates((prev) => prev.filter((item) => item.id !== id));
      },

      async setRouteStops(stops) {
        if (!activeTripId) return;
        const plan = await ensureRoutePlan(activeTripId);
        const updated = { ...plan, stops, updatedAt: nowIso() };
        await routePlanRepository.save(updated);
        setRoutePlan(updated);
      },
      async setRouteMode(mode) {
        if (!activeTripId) return;
        const plan = await ensureRoutePlan(activeTripId);
        const updated = { ...plan, selectedMode: mode, updatedAt: nowIso() };
        await routePlanRepository.save(updated);
        setRoutePlan(updated);
      },

      async exportData(scope) {
        if (scope === 'active') {
          if (!activeTripId) return null;
          return exportToBlob(dataPortRepository, { tripIds: [activeTripId] });
        }
        return exportToBlob(dataPortRepository);
      },
      async importData(text, strategy, tripIds) {
        const result = await importFromText(
          dataPortRepository,
          text,
          strategy,
          tripIds && tripIds.length > 0 ? { tripIds } : undefined,
        );
        if (!result.ok) return false;
        const refreshed = await tripRepository.list();
        setTrips(refreshed);
        const nextActive = refreshed.some((trip) => trip.id === activeTripId)
          ? activeTripId
          : refreshed[0]?.id;
        setActiveTripId(nextActive);
        await persistSettings({ ...settings, activeTripId: nextActive });
        await loadTripData(nextActive);
        return true;
      },
    };
  }, [
    ready,
    settings,
    effectiveMapsKey,
    trips,
    activeTrip,
    savedPlaces,
    candidates,
    routePlan,
    activeTripId,
    persistSettings,
    loadTripData,
    ensureRoutePlan,
  ]);

  // Reflect theme + locale on the document.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', settings.theme === 'dark');
    root.classList.toggle('theme-light', settings.theme === 'light');
    root.style.colorScheme = settings.theme;
    root.lang = settings.locale.slice(0, 2);
  }, [settings.theme, settings.locale]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within an AppStoreProvider');
  return ctx;
}
