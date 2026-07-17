import type {
  AccommodationCandidate,
  ApplicationSettings,
  RoutePlan,
  SavedPlace,
  Trip,
} from '@/domain/schemas';

/**
 * Persistence ports. Features depend on these interfaces, not on IndexedDB,
 * so a future cloud adapter can replace the implementation.
 */
export interface TripRepository {
  list(): Promise<Trip[]>;
  get(id: string): Promise<Trip | undefined>;
  save(trip: Trip): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TripScopedRepository<T> {
  listByTrip(tripId: string): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByTrip(tripId: string): Promise<void>;
}

export type SavedPlaceRepository = TripScopedRepository<SavedPlace>;
export type AccommodationRepository = TripScopedRepository<AccommodationCandidate>;
export type RoutePlanRepository = TripScopedRepository<RoutePlan>;

export interface SettingsRepository {
  get(): Promise<ApplicationSettings | undefined>;
  save(settings: ApplicationSettings): Promise<void>;
}

export interface ExportData {
  trips: Trip[];
  savedPlaces: SavedPlace[];
  accommodationCandidates: AccommodationCandidate[];
  routePlans: RoutePlan[];
}

export interface DataPortRepository {
  exportAll(): Promise<ExportData>;
  /** Replace all planning data atomically (settings/keys are never touched). */
  replaceAll(data: ExportData): Promise<void>;
  /** Merge imported data, overwriting entities that share an id. */
  mergeAll(data: ExportData): Promise<void>;
}
