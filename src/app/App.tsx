import { AppStoreProvider, useAppStore } from '@/app/store/AppStore';
import { WorkspaceProvider } from '@/app/workspace/WorkspaceContext';
import { I18nProvider } from '@/features/localization/I18nProvider';
import { Shell } from '@/app/Shell';

function LocalizedShell() {
  const { ready, settings } = useAppStore();

  if (!ready) {
    return (
      <div className="map-overlay" style={{ height: '100vh' }}>
        Chargement…
      </div>
    );
  }

  return (
    <I18nProvider locale={settings.locale}>
      <WorkspaceProvider>
        <Shell />
      </WorkspaceProvider>
    </I18nProvider>
  );
}

export function App() {
  return (
    <AppStoreProvider>
      <LocalizedShell />
    </AppStoreProvider>
  );
}
