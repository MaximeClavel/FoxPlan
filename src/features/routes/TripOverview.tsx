import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import type { GeoPoint, SavedPlace, TransportMode } from '@/domain/schemas';
import { haversineDistanceMeters } from '@/shared/lib/geo';
import { computeRoute } from '@/infrastructure/google/routesGateway';
import { CATEGORY_ICON } from '@/features/map/categoryStyle';

const OVERVIEW_MODES: TransportMode[] = [
  'DRIVING',
  'TRANSIT',
  'BICYCLING',
  'WALKING',
  'TWO_WHEELER',
  'FLIGHT',
];

// Above this straight-line distance a flight is assumed by default.
const FLIGHT_THRESHOLD_M = 700_000;

interface SegmentResult {
  flight: boolean;
  available: boolean;
  durationSeconds: number;
  distanceMeters: number;
  path: GeoPoint[];
}

function defaultMode(from: GeoPoint, to: GeoPoint): TransportMode {
  return haversineDistanceMeters(from, to) > FLIGHT_THRESHOLD_M ? 'FLIGHT' : 'DRIVING';
}

function sortByDate(places: SavedPlace[]): SavedPlace[] {
  return [...places].sort((a, b) => {
    const da = a.visitStartDate ?? '';
    const db = b.visitStartDate ?? '';
    if (da !== db) return da.localeCompare(db);
    return (a.visitEndDate ?? '').localeCompare(b.visitEndDate ?? '');
  });
}

export function TripOverview() {
  const { savedPlaces, effectiveMapsKey } = useAppStore();
  const { setRoutePath, focusOn } = useWorkspace();
  const { t, formatDate, formatDuration, formatDistance } = useI18n();

  const [modeOverrides, setModeOverrides] = useState<Record<string, TransportMode>>({});
  const [results, setResults] = useState<Record<string, SegmentResult>>({});
  const [calculating, setCalculating] = useState(false);
  const runRef = useRef(0);

  const dated = useMemo(
    () => sortByDate(savedPlaces.filter((place) => place.visitStartDate)),
    [savedPlaces],
  );
  const undated = useMemo(
    () => savedPlaces.filter((place) => !place.visitStartDate),
    [savedPlaces],
  );

  const segments = useMemo(() => {
    const list: { key: string; from: SavedPlace; to: SavedPlace; mode: TransportMode }[] = [];
    for (let i = 0; i < dated.length - 1; i += 1) {
      const from = dated[i];
      const to = dated[i + 1];
      const key = `${from.id}__${to.id}`;
      const mode =
        modeOverrides[key] ??
        defaultMode(from.reference.coordinates, to.reference.coordinates);
      list.push({ key, from, to, mode });
    }
    return list;
  }, [dated, modeOverrides]);

  // Signature that changes only when the computation inputs change.
  const signature = useMemo(
    () => segments.map((s) => `${s.key}:${s.mode}`).join('|'),
    [segments],
  );

  useEffect(() => {
    if (!effectiveMapsKey || segments.length === 0) {
      setResults({});
      setRoutePath([]);
      return;
    }
    const runId = ++runRef.current;
    let cancelled = false;
    setCalculating(true);

    (async () => {
      const next: Record<string, SegmentResult> = {};
      const combinedPath: GeoPoint[] = [];

      for (const segment of segments) {
        const from = segment.from.reference.coordinates;
        const to = segment.to.reference.coordinates;

        if (segment.mode === 'FLIGHT') {
          next[segment.key] = {
            flight: true,
            available: true,
            durationSeconds: 0,
            distanceMeters: haversineDistanceMeters(from, to),
            path: [],
          };
          continue;
        }

        const route = await computeRoute(
          [
            { coordinates: from, label: segment.from.reference.displayName },
            { coordinates: to, label: segment.to.reference.displayName },
          ],
          segment.mode,
        );
        if (cancelled || runId !== runRef.current) return;
        next[segment.key] = {
          flight: false,
          available: route.available,
          durationSeconds: route.totalDurationSeconds,
          distanceMeters: route.totalDistanceMeters,
          path: route.path,
        };
        combinedPath.push(...route.path);
      }

      if (cancelled || runId !== runRef.current) return;
      setResults(next);
      setRoutePath(combinedPath);
      setCalculating(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, effectiveMapsKey]);

  if (dated.length === 0) {
    return (
      <div className="stack">
        <p className="notice">{t('overview.intro')}</p>
        <p className="empty-state">{t('overview.noPlaces')}</p>
        {undated.length > 0 && <UndatedList places={undated} />}
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="notice">{t('overview.intro')}</p>
      {calculating && <p className="muted">{t('overview.calculating')}</p>}

      <div className="timeline">
        {dated.map((place, index) => {
          const segment = segments[index];
          const result = segment ? results[segment.key] : undefined;
          return (
            <div key={place.id}>
              <div className="timeline__node card">
                <button
                  className="result-item__title"
                  style={{ background: 'none', border: 'none', color: 'inherit', textAlign: 'left' }}
                  onClick={() => focusOn(place.reference.coordinates)}
                >
                  {CATEGORY_ICON[place.category]} {place.reference.displayName}
                </button>
                {place.visitStartDate && (
                  <div className="faint" style={{ marginTop: 4 }}>
                    📅 {formatDate(place.visitStartDate)}
                    {place.visitEndDate ? ` → ${formatDate(place.visitEndDate)}` : ''}
                  </div>
                )}
              </div>

              {segment && (
                <div className="timeline__segment">
                  <span className="timeline__connector" aria-hidden="true" />
                  <div className="segment-info">
                    <select
                      aria-label={t('overview.segmentMode')}
                      value={segment.mode}
                      onChange={(event) =>
                        setModeOverrides((prev) => ({
                          ...prev,
                          [segment.key]: event.target.value as TransportMode,
                        }))
                      }
                      style={{ width: 'auto' }}
                    >
                      {OVERVIEW_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {t(`routes.mode.${mode}`)}
                        </option>
                      ))}
                    </select>
                    <span className="segment-info__value">
                      {result?.flight ? (
                        <>
                          ✈ {t('overview.flightNoRoute')} · ~{formatDistance(result.distanceMeters)}
                        </>
                      ) : result?.available ? (
                        <>
                          {formatDuration(result.durationSeconds)} ·{' '}
                          {formatDistance(result.distanceMeters)}
                        </>
                      ) : result ? (
                        t('routes.unavailable')
                      ) : (
                        t('common.loading')
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {undated.length > 0 && <UndatedList places={undated} />}
    </div>
  );
}

function UndatedList({ places }: { places: SavedPlace[] }) {
  const { focusOn } = useWorkspace();
  const { t } = useI18n();
  return (
    <section>
      <h4 className="section-title">
        {t('overview.undated')} ({places.length})
      </h4>
      <div className="list">
        {places.map((place) => (
          <button
            key={place.id}
            className="stop"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => focusOn(place.reference.coordinates)}
          >
            <span className="stop__label">
              {CATEGORY_ICON[place.category]} {place.reference.displayName}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
