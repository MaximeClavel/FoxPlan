import { useMemo, useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import type { AccommodationCandidate, GeoPoint, Provider } from '@/domain/schemas';
import { providerList, providerAdapters } from './providers';
import { haversineDistanceMeters } from '@/shared/lib/geo';
import { computeRoute } from '@/infrastructure/google/routesGateway';
import { CATEGORY_ICON } from '@/features/map/categoryStyle';

function SearchForm() {
  const { activeTrip } = useAppStore();
  const { t } = useI18n();
  const [destination, setDestination] = useState(activeTrip?.destination ?? '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [budgetMax, setBudgetMax] = useState('');
  const [provider, setProvider] = useState<Exclude<Provider, 'other'>>('booking');

  const openSearch = () => {
    if (!destination.trim()) return;
    const adapter = providerAdapters[provider];
    const url = adapter.buildSearchUrl({
      destination,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      adults,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      currency: activeTrip?.currency ?? 'EUR',
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="card stack">
      <h3 className="section-title" style={{ margin: 0 }}>
        {t('accommodation.searchTitle')}
      </h3>
      <div className="field">
        <label htmlFor="stay-dest">{t('accommodation.destination')}</label>
        <input
          id="stay-dest"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
        />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="stay-in">{t('accommodation.checkIn')}</label>
          <input
            id="stay-in"
            type="date"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="stay-out">{t('accommodation.checkOut')}</label>
          <input
            id="stay-out"
            type="date"
            value={checkOut}
            min={checkIn || undefined}
            onChange={(event) => setCheckOut(event.target.value)}
          />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="stay-adults">{t('accommodation.adults')}</label>
          <input
            id="stay-adults"
            type="number"
            min={1}
            value={adults}
            onChange={(event) => setAdults(Math.max(1, Number(event.target.value)))}
          />
        </div>
        <div className="field">
          <label htmlFor="stay-budget">{t('accommodation.budgetMax')}</label>
          <input
            id="stay-budget"
            type="number"
            min={0}
            value={budgetMax}
            onChange={(event) => setBudgetMax(event.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="stay-provider">{t('accommodation.provider')}</label>
        <select
          id="stay-provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value as Exclude<Provider, 'other'>)}
        >
          {providerList.map((adapter) => (
            <option key={adapter.provider} value={adapter.provider}>
              {adapter.label}
            </option>
          ))}
        </select>
      </div>
      <button className="btn btn--primary" onClick={openSearch} disabled={!destination.trim()}>
        {t('accommodation.openSearch')} ↗
      </button>
      <p className="notice">{t('accommodation.disclaimer')}</p>
    </section>
  );
}

function ProximityRow({ from }: { from: GeoPoint }) {
  const { savedPlaces, effectiveMapsKey } = useAppStore();
  const { t, formatDistance, formatDuration } = useI18n();
  const [routeInfo, setRouteInfo] = useState<Record<string, string>>({});

  const nearest = useMemo(() => {
    return savedPlaces
      .map((place) => ({
        place,
        meters: haversineDistanceMeters(from, place.reference.coordinates),
      }))
      .sort((a, b) => a.meters - b.meters)
      .slice(0, 5);
  }, [savedPlaces, from]);

  if (nearest.length === 0) {
    return <p className="faint">{t('proximity.pickReference')}</p>;
  }

  const computeDriving = async (placeId: string, to: GeoPoint) => {
    if (!effectiveMapsKey) return;
    setRouteInfo((prev) => ({ ...prev, [placeId]: '…' }));
    const result = await computeRoute(
      [
        { coordinates: from, label: 'from' },
        { coordinates: to, label: 'to' },
      ],
      'DRIVING',
    );
    setRouteInfo((prev) => ({
      ...prev,
      [placeId]: result.available
        ? `${formatDuration(result.totalDurationSeconds)} · ${formatDistance(
            result.totalDistanceMeters,
          )}`
        : t('routes.unavailable'),
    }));
  };

  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="faint">{t('proximity.title')}</span>
      {nearest.map(({ place, meters }) => (
        <div key={place.id} className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
          <span className="stop__label">
            {CATEGORY_ICON[place.category]} {place.reference.displayName}
          </span>
          <span className="faint" title={t('proximity.straightLine')}>
            ~{formatDistance(meters)}
          </span>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => computeDriving(place.id, place.reference.coordinates)}
            disabled={!effectiveMapsKey}
          >
            {routeInfo[place.id] ?? t('proximity.route')}
          </button>
        </div>
      ))}
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: AccommodationCandidate }) {
  const { removeCandidate } = useAppStore();
  const { focusOn, selectPlace, selectedPlaceId } = useWorkspace();
  const { t, formatCurrency } = useI18n();
  const selected = selectedPlaceId === candidate.id;

  return (
    <div
      className="card"
      style={selected ? { borderColor: 'var(--color-primary)' } : undefined}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button
          className="result-item__title"
          style={{ background: 'none', border: 'none', color: 'inherit', textAlign: 'left' }}
          onClick={() => {
            selectPlace(candidate.id);
            focusOn(candidate.location.coordinates);
          }}
        >
          🏨 {candidate.name}
        </button>
        <button className="btn btn--danger btn--sm" onClick={() => removeCandidate(candidate.id)}>
          {t('accommodation.remove')}
        </button>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <span className="chip">{candidate.provider}</span>
        {candidate.price && (
          <span className="muted">
            {formatCurrency(candidate.price.amount, candidate.price.currency)}
          </span>
        )}
        {candidate.sourceUrl && (
          <a href={candidate.sourceUrl} target="_blank" rel="noreferrer noopener" className="faint">
            ↗
          </a>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <ProximityRow from={candidate.location.coordinates} />
      </div>
    </div>
  );
}

function SaveCandidateForm() {
  const { addCandidate, activeTrip } = useAppStore();
  const { searchResults, selectedPlaceId } = useWorkspace();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<Exclude<Provider, 'other'>>('booking');
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');

  const selectedResult = searchResults.find((result) => result.placeId === selectedPlaceId);
  const location = selectedResult
    ? {
        placeId: selectedResult.placeId,
        coordinates: selectedResult.coordinates,
        displayName: selectedResult.displayName,
        address: selectedResult.address,
      }
    : activeTrip?.destinationPoint
      ? { coordinates: activeTrip.destinationPoint, displayName: name || 'Hébergement' }
      : null;

  const submit = () => {
    if (!name.trim() || !location) return;
    addCandidate({
      name: name.trim(),
      provider,
      sourceUrl: url.trim() || undefined,
      location: { ...location, displayName: name.trim() },
      price: price
        ? { amount: Number(price), currency: activeTrip?.currency ?? 'EUR', period: 'night' }
        : undefined,
    });
    setName('');
    setUrl('');
    setPrice('');
  };

  return (
    <section className="card stack">
      <h3 className="section-title" style={{ margin: 0 }}>
        {t('accommodation.saveCandidate')}
      </h3>
      <div className="field">
        <label htmlFor="cand-name">{t('accommodation.name')}</label>
        <input id="cand-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="cand-provider">{t('accommodation.provider')}</label>
          <select
            id="cand-provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as Exclude<Provider, 'other'>)}
          >
            {providerList.map((adapter) => (
              <option key={adapter.provider} value={adapter.provider}>
                {adapter.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cand-price">{t('accommodation.price')}</label>
          <input
            id="cand-price"
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cand-url">
          {t('accommodation.sourceUrl')} ({t('common.optional')})
        </label>
        <input id="cand-url" value={url} onChange={(event) => setUrl(event.target.value)} />
      </div>
      {!location && <p className="faint">{t('proximity.pickReference')}</p>}
      <button className="btn btn--primary" onClick={submit} disabled={!name.trim() || !location}>
        {t('common.save')}
      </button>
    </section>
  );
}

export function AccommodationPanel() {
  const { candidates } = useAppStore();
  const { t } = useI18n();

  return (
    <div className="stack">
      <SearchForm />
      <SaveCandidateForm />
      <section>
        <h3 className="section-title">
          {t('accommodation.candidates')} ({candidates.length})
        </h3>
        {candidates.length === 0 ? (
          <p className="empty-state">{t('accommodation.noCandidates')}</p>
        ) : (
          <div className="list">
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
