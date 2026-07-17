import { useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useI18n } from '@/features/localization/I18nProvider';
import { Modal } from '@/shared/ui/Modal';

export function TripsSidebar() {
  const { trips, activeTrip, createTrip, selectTrip, deleteTrip, duplicateTrip } = useAppStore();
  const { t } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    await createTrip({ name, destination });
    setName('');
    setDestination('');
    setShowCreate(false);
  };

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="section-title" style={{ margin: 0 }}>
          {t('trips.title')}
        </span>
        <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
          + {t('trips.new')}
        </button>
      </div>

      {trips.length === 0 ? (
        <p className="empty-state">{t('trips.empty')}</p>
      ) : (
        <div className="list">
          {trips.map((trip) => {
            const isActive = trip.id === activeTrip?.id;
            return (
              <div
                key={trip.id}
                className={`result-item ${isActive ? 'result-item--active' : ''}`}
                style={
                  isActive ? { borderColor: 'var(--color-primary)' } : undefined
                }
              >
                <button
                  className="nav__item"
                  style={{ padding: 0 }}
                  onClick={() => selectTrip(trip.id)}
                  aria-current={isActive}
                >
                  <span className="result-item__title">{trip.name}</span>
                </button>
                {trip.destination && <span className="faint">{trip.destination}</span>}
                <div className="row" style={{ gap: 4 }}>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => duplicateTrip(trip.id)}
                  >
                    {t('trips.duplicate')}
                  </button>
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => {
                      if (window.confirm(t('trips.deleteConfirm'))) deleteTrip(trip.id);
                    }}
                  >
                    {t('trips.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <Modal title={t('trips.new')} onClose={() => setShowCreate(false)} closeLabel={t('common.close')}>
          <div className="stack">
            <div className="field">
              <label htmlFor="trip-name">{t('trips.namePlaceholder')}</label>
              <input
                id="trip-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit();
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="trip-dest">{t('trips.destinationPlaceholder')}</label>
              <input
                id="trip-dest"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              />
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn--primary" onClick={submit} disabled={!name.trim()}>
                {t('trips.create')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
