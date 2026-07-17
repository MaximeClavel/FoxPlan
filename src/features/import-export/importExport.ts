import {
  exportEnvelopeSchema,
  SCHEMA_VERSION,
  type ExportEnvelope,
} from '@/domain/schemas';
import type { DataPortRepository, ExportData } from '@/domain/repositories';
import { nowIso } from '@/domain/ids';

export function buildEnvelope(data: ExportData): ExportEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    trips: data.trips,
    savedPlaces: data.savedPlaces,
    accommodationCandidates: data.accommodationCandidates,
    routePlans: data.routePlans,
  };
}

export interface ParseResult {
  ok: boolean;
  data?: ExportData;
  error?: string;
}

/** Validates untrusted JSON text into an ExportData payload. */
export function parseImport(jsonText: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }

  const parsed = exportEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'invalid-schema' };
  }

  if (parsed.data.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'unsupported-version' };
  }

  const { trips, savedPlaces, accommodationCandidates, routePlans } = parsed.data;
  return {
    ok: true,
    data: { trips, savedPlaces, accommodationCandidates, routePlans },
  };
}

/** Restricts an ExportData payload to the given trip ids. */
export function filterByTripIds(data: ExportData, tripIds: string[]): ExportData {
  const ids = new Set(tripIds);
  return {
    trips: data.trips.filter((trip) => ids.has(trip.id)),
    savedPlaces: data.savedPlaces.filter((place) => ids.has(place.tripId)),
    accommodationCandidates: data.accommodationCandidates.filter((candidate) =>
      ids.has(candidate.tripId),
    ),
    routePlans: data.routePlans.filter((route) => ids.has(route.tripId)),
  };
}

export async function exportToBlob(
  repo: DataPortRepository,
  options?: { tripIds?: string[] },
): Promise<Blob> {
  const all = await repo.exportAll();
  const data = options?.tripIds ? filterByTripIds(all, options.tripIds) : all;
  const envelope = buildEnvelope(data);
  return new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
}

export async function importFromText(
  repo: DataPortRepository,
  jsonText: string,
  strategy: 'replace' | 'merge',
  options?: { tripIds?: string[] },
): Promise<ParseResult> {
  const result = parseImport(jsonText);
  if (!result.ok || !result.data) return result;

  const data = options?.tripIds ? filterByTripIds(result.data, options.tripIds) : result.data;

  if (strategy === 'replace') {
    await repo.replaceAll(data);
  } else {
    await repo.mergeAll(data);
  }
  return { ok: true, data };
}
