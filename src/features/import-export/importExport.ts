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

export async function exportToBlob(repo: DataPortRepository): Promise<Blob> {
  const data = await repo.exportAll();
  const envelope = buildEnvelope(data);
  return new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
}

export async function importFromText(
  repo: DataPortRepository,
  jsonText: string,
  strategy: 'replace' | 'merge',
): Promise<ParseResult> {
  const result = parseImport(jsonText);
  if (!result.ok || !result.data) return result;

  if (strategy === 'replace') {
    await repo.replaceAll(result.data);
  } else {
    await repo.mergeAll(result.data);
  }
  return result;
}
