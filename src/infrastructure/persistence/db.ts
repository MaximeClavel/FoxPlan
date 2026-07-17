import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  AccommodationCandidate,
  ApplicationSettings,
  RoutePlan,
  SavedPlace,
  Trip,
} from '@/domain/schemas';

export const DB_NAME = 'foxplan';
export const DB_VERSION = 1;

interface FoxPlanDB extends DBSchema {
  trips: {
    key: string;
    value: Trip;
  };
  savedPlaces: {
    key: string;
    value: SavedPlace;
    indexes: { 'by-trip': string };
  };
  accommodationCandidates: {
    key: string;
    value: AccommodationCandidate;
    indexes: { 'by-trip': string };
  };
  routePlans: {
    key: string;
    value: RoutePlan;
    indexes: { 'by-trip': string };
  };
  settings: {
    key: string;
    value: ApplicationSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<FoxPlanDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<FoxPlanDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FoxPlanDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Versioned migrations. Each block upgrades from the previous version.
        if (oldVersion < 1) {
          db.createObjectStore('trips', { keyPath: 'id' });

          const saved = db.createObjectStore('savedPlaces', { keyPath: 'id' });
          saved.createIndex('by-trip', 'tripId');

          const candidates = db.createObjectStore('accommodationCandidates', {
            keyPath: 'id',
          });
          candidates.createIndex('by-trip', 'tripId');

          const routes = db.createObjectStore('routePlans', { keyPath: 'id' });
          routes.createIndex('by-trip', 'tripId');

          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/** Test-only: reset the cached connection. */
export function resetDbConnectionForTests(): void {
  dbPromise = null;
}

export type { FoxPlanDB };
