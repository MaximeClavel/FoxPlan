import { useMemo, useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import { createId } from '@/domain/ids';
import type { RouteStop, TransportMode } from '@/domain/schemas';
import {
  computeRoute,
  SUPPORTED_MODES,
  type RouteResult,
} from '@/infrastructure/google/routesGateway';
import { TripOverview } from './TripOverview';

type SubTab = 'route' | 'overview';

export function ItineraryPanel() {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<SubTab>('overview');

  return (
    <div className="stack">
      <div className="row" style={{ gap: 6 }}>
        <button
          className={`chip ${subTab === 'overview' ? 'chip--active' : ''}`}
          aria-pressed={subTab === 'overview'}
          onClick={() => setSubTab('overview')}
        >
          {t('routes.tab.overview')}
        </button>
        <button
          className={`chip ${subTab === 'route' ? 'chip--active' : ''}`}
          aria-pressed={subTab === 'route'}
          onClick={() => setSubTab('route')}
        >
          {t('routes.tab.route')}
        </button>
      </div>
      {subTab === 'overview' ? <TripOverview /> : <RoutePlanner />}
    </div>
  );
}

function RoutePlanner() {
  const { effectiveMapsKey, routePlan, savedPlaces, candidates, setRouteStops, setRouteMode } =
    useAppStore();
  const { setRoutePath, focusOn } = useWorkspace();
  const { t, formatDuration, formatDistance } = useI18n();

  const [results, setResults] = useState<Record<string, RouteResult>>({});
  const [calculating, setCalculating] = useState(false);
  const [addValue, setAddValue] = useState('');

  const stops = routePlan?.stops ?? [];
  const selectedMode = routePlan?.selectedMode ?? 'DRIVING';

  const options = useMemo(() => {
    const placeOptions = savedPlaces.map((place) => ({
      key: `place:${place.id}`,
      label: place.reference.displayName,
      reference: place.reference,
    }));
    const stayOptions = candidates.map((candidate) => ({
      key: `stay:${candidate.id}`,
      label: `🏨 ${candidate.name}`,
      reference: candidate.location,
    }));
    return [...placeOptions, ...stayOptions];
  }, [savedPlaces, candidates]);

  const persistStops = (next: RouteStop[]) => {
    const reindexed = next.map((stop, index) => ({ ...stop, position: index }));
    setRouteStops(reindexed);
  };

  const addStop = () => {
    const option = options.find((item) => item.key === addValue);
    if (!option) return;
    persistStops([
      ...stops,
      { id: createId('stop'), position: stops.length, reference: option.reference },
    ]);
    setAddValue('');
  };

  const move = (index: number, delta: number) => {
    const next = [...stops];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persistStops(next);
  };

  const remove = (id: string) => {
    persistStops(stops.filter((stop) => stop.id !== id));
  };

  const calculate = async () => {
    if (stops.length < 2 || !effectiveMapsKey) return;
    setCalculating(true);
    const payload = stops.map((stop) => ({
      coordinates: stop.reference.coordinates,
      label: stop.reference.displayName,
    }));
    const computed: Record<string, RouteResult> = {};
    for (const mode of SUPPORTED_MODES) {
      computed[mode] = await computeRoute(payload, mode);
    }
    setResults(computed);
    setCalculating(false);
    const selected = computed[selectedMode];
    if (selected?.available) setRoutePath(selected.path);
  };

  const selectMode = (mode: TransportMode) => {
    setRouteMode(mode);
    const result = results[mode];
    if (result?.available) setRoutePath(result.path);
  };

  return (
    <div className="stack">
      <h3 className="section-title">{t('routes.title')}</h3>

      {stops.length === 0 ? (
        <p className="empty-state">{t('routes.noStops')}</p>
      ) : (
        <div className="list">
          {stops.map((stop, index) => (
            <div key={stop.id} className="stop">
              <span className="stop__index">{index + 1}</span>
              <button
                className="stop__label"
                style={{ background: 'none', border: 'none', color: 'inherit', textAlign: 'left' }}
                onClick={() => focusOn(stop.reference.coordinates)}
              >
                {stop.reference.displayName}
              </button>
              <button
                className="btn btn--ghost btn--sm"
                aria-label={t('routes.moveUp')}
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                className="btn btn--ghost btn--sm"
                aria-label={t('routes.moveDown')}
                onClick={() => move(index, 1)}
                disabled={index === stops.length - 1}
              >
                ↓
              </button>
              <button
                className="btn btn--danger btn--sm"
                aria-label={t('routes.removeStop')}
                onClick={() => remove(stop.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row">
        <select
          value={addValue}
          onChange={(event) => setAddValue(event.target.value)}
          aria-label={t('routes.addStop')}
        >
          <option value="">{t('routes.addStop')}…</option>
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={addStop} disabled={!addValue}>
          +
        </button>
      </div>

      <button
        className="btn btn--primary"
        onClick={calculate}
        disabled={stops.length < 2 || calculating || !effectiveMapsKey}
      >
        {calculating ? t('common.loading') : t('routes.calculate')}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="mode-grid">
          {SUPPORTED_MODES.map((mode) => {
            const result = results[mode];
            const available = result?.available;
            const isSelected = selectedMode === mode;
            return (
              <button
                key={mode}
                className={`mode-card ${isSelected ? 'mode-card--selected' : ''} ${
                  available ? '' : 'mode-card--unavailable'
                }`}
                onClick={() => available && selectMode(mode)}
                disabled={!available}
              >
                <div className="muted">{t(`routes.mode.${mode}`)}</div>
                {available ? (
                  <>
                    <div className="mode-card__value">
                      {formatDuration(result.totalDurationSeconds)}
                    </div>
                    <div className="faint">
                      {formatDistance(result.totalDistanceMeters)}
                    </div>
                  </>
                ) : (
                  <div className="faint">{t('routes.unavailable')}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
