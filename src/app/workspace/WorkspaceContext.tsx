import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GeoPoint, PlaceCategory } from '@/domain/schemas';
import {
  searchPlacesByText,
  type PlaceSearchResult,
} from '@/infrastructure/google/placesGateway';

export type PanelTab =
  | 'places'
  | 'itinerary'
  | 'accommodation'
  | 'settings'
  | 'data';

export const ALL_CATEGORIES: PlaceCategory[] = [
  'city',
  'restaurant',
  'activity',
  'attraction',
  'airport',
  'transport',
  'lodging',
  'other',
];

interface WorkspaceValue {
  activePanel: PanelTab;
  setActivePanel(tab: PanelTab): void;

  searchResults: PlaceSearchResult[];
  searching: boolean;
  searchError: string | null;
  runSearch(query: string, options?: { category?: PlaceCategory; bias?: GeoPoint }): Promise<void>;
  clearSearch(): void;
  presentPlace(result: PlaceSearchResult): void;

  selectedPlaceId: string | null;
  selectPlace(id: string | null): void;

  visibleCategories: Set<PlaceCategory>;
  toggleCategory(category: PlaceCategory): void;

  focusPoint: GeoPoint | null;
  focusOn(point: GeoPoint | null): void;

  routePath: GeoPoint[];
  setRoutePath(path: GeoPoint[]): void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelTab>('places');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<Set<PlaceCategory>>(
    () => new Set(ALL_CATEGORIES),
  );
  const [focusPoint, setFocusPoint] = useState<GeoPoint | null>(null);
  const [routePath, setRoutePath] = useState<GeoPoint[]>([]);

  const requestSeq = useRef(0);

  const runSearch = useCallback<WorkspaceValue['runSearch']>(async (query, options) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const seq = ++requestSeq.current;
    setSearching(true);
    setSearchError(null);
    setActivePanel('places');
    try {
      const results = await searchPlacesByText(trimmed, {
        category: options?.category,
        locationBias: options?.bias,
      });
      if (seq !== requestSeq.current) return; // stale
      setSearchResults(results);
    } catch {
      if (seq !== requestSeq.current) return;
      setSearchError('search-failed');
      setSearchResults([]);
    } finally {
      if (seq === requestSeq.current) setSearching(false);
    }
  }, []);

  const value = useMemo<WorkspaceValue>(
    () => ({
      activePanel,
      setActivePanel,
      searchResults,
      searching,
      searchError,
      runSearch,
      clearSearch() {
        requestSeq.current++;
        setSearchResults([]);
        setSearchError(null);
      },
      presentPlace(result) {
        requestSeq.current++;
        setActivePanel('places');
        setSearchResults([result]);
        setSearchError(null);
        setSelectedPlaceId(result.placeId);
        setFocusPoint(result.coordinates);
      },
      selectedPlaceId,
      selectPlace: setSelectedPlaceId,
      visibleCategories,
      toggleCategory(category) {
        setVisibleCategories((prev) => {
          const next = new Set(prev);
          if (next.has(category)) next.delete(category);
          else next.add(category);
          return next;
        });
      },
      focusPoint,
      focusOn: setFocusPoint,
      routePath,
      setRoutePath,
    }),
    [
      activePanel,
      searchResults,
      searching,
      searchError,
      runSearch,
      selectedPlaceId,
      visibleCategories,
      focusPoint,
      routePath,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}
