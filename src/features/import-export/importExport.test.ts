import { describe, expect, it } from 'vitest';
import { buildEnvelope, parseImport, filterByTripIds } from './importExport';
import { SCHEMA_VERSION } from '@/domain/schemas';

const emptyData = {
  trips: [],
  savedPlaces: [],
  accommodationCandidates: [],
  routePlans: [],
};

const validTrip = {
  id: 'trip_1',
  name: 'Portugal',
  locale: 'fr-FR',
  currency: 'EUR',
  days: [],
  mapPreferences: {},
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
};

describe('import/export envelope', () => {
  it('builds an envelope with the current schema version', () => {
    const envelope = buildEnvelope(emptyData);
    expect(envelope.schemaVersion).toBe(SCHEMA_VERSION);
    expect(envelope.trips).toEqual([]);
    expect(typeof envelope.exportedAt).toBe('string');
  });

  it('rejects non-JSON input', () => {
    const result = parseImport('not json');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid-json');
  });

  it('rejects an invalid schema', () => {
    const result = parseImport(JSON.stringify({ foo: 'bar' }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid-schema');
  });

  it('rejects an unsupported future version', () => {
    const envelope = { ...buildEnvelope(emptyData), schemaVersion: SCHEMA_VERSION + 1 };
    const result = parseImport(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('unsupported-version');
  });

  it('accepts a valid envelope with a trip', () => {
    const envelope = buildEnvelope({ ...emptyData, trips: [validTrip] });
    const result = parseImport(JSON.stringify(envelope));
    expect(result.ok).toBe(true);
    expect(result.data?.trips).toHaveLength(1);
    expect(result.data?.trips[0]?.name).toBe('Portugal');
  });

  it('round-trips built envelopes', () => {
    const envelope = buildEnvelope({ ...emptyData, trips: [validTrip] });
    const result = parseImport(JSON.stringify(envelope));
    expect(result.ok).toBe(true);
  });
});

describe('filterByTripIds', () => {
  const secondTrip = { ...validTrip, id: 'trip_2', name: 'Italie' };
  const data = {
    trips: [validTrip, secondTrip],
    savedPlaces: [
      {
        id: 'place_1',
        tripId: 'trip_1',
        category: 'restaurant' as const,
        reference: { coordinates: { lat: 1, lng: 2 }, displayName: 'A' },
        tags: [],
        dayIds: [],
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-01T10:00:00.000Z',
      },
      {
        id: 'place_2',
        tripId: 'trip_2',
        category: 'city' as const,
        reference: { coordinates: { lat: 3, lng: 4 }, displayName: 'B' },
        tags: [],
        dayIds: [],
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-01T10:00:00.000Z',
      },
    ],
    accommodationCandidates: [],
    routePlans: [],
  };

  it('keeps only the selected trip and its children', () => {
    const filtered = filterByTripIds(data, ['trip_1']);
    expect(filtered.trips).toHaveLength(1);
    expect(filtered.trips[0]?.id).toBe('trip_1');
    expect(filtered.savedPlaces).toHaveLength(1);
    expect(filtered.savedPlaces[0]?.tripId).toBe('trip_1');
  });

  it('returns empty sets for an unknown trip id', () => {
    const filtered = filterByTripIds(data, ['missing']);
    expect(filtered.trips).toHaveLength(0);
    expect(filtered.savedPlaces).toHaveLength(0);
  });
});
