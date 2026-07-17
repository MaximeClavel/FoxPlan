import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace, type PanelTab } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import { TripsSidebar } from '@/features/trips/TripsSidebar';
import { MapView } from '@/features/map/MapView';
import { MapOverlayControls } from '@/features/map/MapOverlayControls';
import { PlacesPanel } from '@/features/places/PlacesPanel';
import { ItineraryPanel } from '@/features/routes/ItineraryPanel';
import { AccommodationPanel } from '@/features/accommodation/AccommodationPanel';
import { SettingsPanel } from '@/features/settings/SettingsPanel';
import { DataPanel } from '@/features/import-export/DataPanel';
import type { TranslationKey } from '@/features/localization/catalogues';

const PANELS: { tab: PanelTab; labelKey: TranslationKey }[] = [
  { tab: 'places', labelKey: 'nav.places' },
  { tab: 'itinerary', labelKey: 'nav.itinerary' },
  { tab: 'accommodation', labelKey: 'nav.accommodation' },
  { tab: 'settings', labelKey: 'nav.settings' },
  { tab: 'data', labelKey: 'nav.data' },
];

function ActivePanel({ tab }: { tab: PanelTab }) {
  switch (tab) {
    case 'places':
      return <PlacesPanel />;
    case 'itinerary':
      return <ItineraryPanel />;
    case 'accommodation':
      return <AccommodationPanel />;
    case 'settings':
      return <SettingsPanel />;
    case 'data':
      return <DataPanel />;
    default:
      return null;
  }
}

export function Shell() {
  const { activeTrip, trips, selectTrip, settings, setTheme } = useAppStore();
  const { activePanel, setActivePanel } = useWorkspace();
  const { t } = useI18n();

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" aria-hidden="true" />
          <span>{t('app.name')}</span>
        </div>
        <div className="header-actions">
          {trips.length > 0 && (
            <select
              className="trip-switcher"
              value={activeTrip?.id ?? ''}
              onChange={(event) => selectTrip(event.target.value)}
              aria-label={t('trips.active')}
            >
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
            aria-label={t('settings.theme')}
          >
            {settings.theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <aside className="shell__sidebar">
        <TripsSidebar />
        <nav className="nav" style={{ marginTop: 16 }} aria-label={t('nav.map')}>
          {PANELS.map(({ tab, labelKey }) => (
            <button
              key={tab}
              className={`nav__item ${activePanel === tab ? 'nav__item--active' : ''}`}
              onClick={() => setActivePanel(tab)}
            >
              {t(labelKey)}
            </button>
          ))}
        </nav>
      </aside>

      <main className="shell__map">
        {activeTrip ? (
          <>
            <MapView />
            <MapOverlayControls />
          </>
        ) : (
          <div className="map-overlay">{t('map.noTrip')}</div>
        )}
      </main>

      <section className="shell__panel" aria-label={t(PANELS.find((p) => p.tab === activePanel)!.labelKey)}>
        <div className="nav" style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
          {PANELS.map(({ tab, labelKey }) => (
            <button
              key={tab}
              className={`chip ${activePanel === tab ? 'chip--active' : ''}`}
              aria-pressed={activePanel === tab}
              onClick={() => setActivePanel(tab)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        {activeTrip || activePanel === 'settings' || activePanel === 'data' ? (
          <ActivePanel tab={activePanel} />
        ) : (
          <p className="empty-state">{t('map.noTrip')}</p>
        )}
      </section>
    </div>
  );
}
