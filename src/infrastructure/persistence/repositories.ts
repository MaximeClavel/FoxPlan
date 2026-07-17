import type {
  AccommodationCandidate,
  RoutePlan,
  SavedPlace,
  Trip,
} from '@/domain/schemas';
import type {
  AccommodationRepository,
  DataPortRepository,
  RoutePlanRepository,
  SavedPlaceRepository,
  SettingsRepository,
  TripRepository,
} from '@/domain/repositories';
import { getDb } from './db';

const SETTINGS_KEY = 'app-settings';

export const tripRepository: TripRepository = {
  async list() {
    const db = await getDb();
    const trips = await db.getAll('trips');
    return trips.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async get(id) {
    const db = await getDb();
    return db.get('trips', id);
  },
  async save(trip) {
    const db = await getDb();
    await db.put('trips', trip);
  },
  async delete(id) {
    const db = await getDb();
    const tx = db.transaction(
      ['trips', 'savedPlaces', 'accommodationCandidates', 'routePlans'],
      'readwrite',
    );
    await tx.objectStore('trips').delete(id);
    await deleteByIndex(tx.objectStore('savedPlaces'), id);
    await deleteByIndex(tx.objectStore('accommodationCandidates'), id);
    await deleteByIndex(tx.objectStore('routePlans'), id);
    await tx.done;
  },
};

async function deleteByIndex(
  store: {
    index: (name: 'by-trip') => { getAllKeys: (key: string) => Promise<string[]> };
    delete: (key: string) => Promise<void>;
  },
  tripId: string,
): Promise<void> {
  const keys = await store.index('by-trip').getAllKeys(tripId);
  await Promise.all(keys.map((key) => store.delete(key)));
}

function createTripScopedRepository<
  T extends { id: string; tripId: string },
  S extends 'savedPlaces' | 'accommodationCandidates' | 'routePlans',
>(storeName: S) {
  return {
    async listByTrip(tripId: string): Promise<T[]> {
      const db = await getDb();
      return (await db.getAllFromIndex(
        storeName,
        'by-trip',
        tripId as never,
      )) as unknown as T[];
    },
    async get(id: string): Promise<T | undefined> {
      const db = await getDb();
      return (await db.get(storeName, id)) as unknown as T | undefined;
    },
    async save(entity: T): Promise<void> {
      const db = await getDb();
      await db.put(storeName, entity as never);
    },
    async delete(id: string): Promise<void> {
      const db = await getDb();
      await db.delete(storeName, id);
    },
    async deleteByTrip(tripId: string): Promise<void> {
      const db = await getDb();
      const keys = await db.getAllKeysFromIndex(storeName, 'by-trip', tripId as never);
      const tx = db.transaction(storeName, 'readwrite');
      await Promise.all(keys.map((key) => tx.store.delete(key)));
      await tx.done;
    },
  };
}

export const savedPlaceRepository: SavedPlaceRepository =
  createTripScopedRepository<SavedPlace, 'savedPlaces'>('savedPlaces');

export const accommodationRepository: AccommodationRepository =
  createTripScopedRepository<AccommodationCandidate, 'accommodationCandidates'>(
    'accommodationCandidates',
  );

export const routePlanRepository: RoutePlanRepository =
  createTripScopedRepository<RoutePlan, 'routePlans'>('routePlans');

export const settingsRepository: SettingsRepository = {
  async get() {
    const db = await getDb();
    return db.get('settings', SETTINGS_KEY);
  },
  async save(settings) {
    const db = await getDb();
    await db.put('settings', settings);
  },
};

export const dataPortRepository: DataPortRepository = {
  async exportAll() {
    const db = await getDb();
    const [trips, savedPlaces, accommodationCandidates, routePlans] = await Promise.all([
      db.getAll('trips'),
      db.getAll('savedPlaces'),
      db.getAll('accommodationCandidates'),
      db.getAll('routePlans'),
    ]);
    return { trips, savedPlaces, accommodationCandidates, routePlans };
  },
  async replaceAll(data) {
    const db = await getDb();
    const tx = db.transaction(
      ['trips', 'savedPlaces', 'accommodationCandidates', 'routePlans'],
      'readwrite',
    );
    await Promise.all([
      tx.objectStore('trips').clear(),
      tx.objectStore('savedPlaces').clear(),
      tx.objectStore('accommodationCandidates').clear(),
      tx.objectStore('routePlans').clear(),
    ]);
    const cleared: Promise<unknown>[] = [];
    for (const trip of data.trips) cleared.push(tx.objectStore('trips').put(trip));
    for (const place of data.savedPlaces) cleared.push(tx.objectStore('savedPlaces').put(place));
    for (const candidate of data.accommodationCandidates)
      cleared.push(tx.objectStore('accommodationCandidates').put(candidate));
    for (const route of data.routePlans) cleared.push(tx.objectStore('routePlans').put(route));
    await Promise.all(cleared);
    await tx.done;
  },
  async mergeAll(data) {
    const db = await getDb();
    const tx = db.transaction(
      ['trips', 'savedPlaces', 'accommodationCandidates', 'routePlans'],
      'readwrite',
    );
    const puts: Promise<unknown>[] = [];
    for (const trip of data.trips) puts.push(tx.objectStore('trips').put(trip));
    for (const place of data.savedPlaces) puts.push(tx.objectStore('savedPlaces').put(place));
    for (const candidate of data.accommodationCandidates)
      puts.push(tx.objectStore('accommodationCandidates').put(candidate));
    for (const route of data.routePlans) puts.push(tx.objectStore('routePlans').put(route));
    await Promise.all(puts);
    await tx.done;
  },
};

export type { Trip, SavedPlace, AccommodationCandidate, RoutePlan };
