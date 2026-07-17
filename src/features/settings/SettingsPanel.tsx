import { useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useI18n } from '@/features/localization/I18nProvider';
import { AVAILABLE_LOCALES } from '@/features/localization/catalogues';
import type { ThemePreference } from '@/domain/schemas';

function maskKey(key: string): string {
  if (key.length <= 6) return '••••';
  return `••••••••${key.slice(-4)}`;
}

export function SettingsPanel() {
  const { settings, effectiveMapsKey, saveMapsKey, removeMapsKey, setTheme, setLocale } =
    useAppStore();
  const { t } = useI18n();
  const [keyInput, setKeyInput] = useState('');
  const [editing, setEditing] = useState(!settings.googleMapsApiKey);

  const hasKey = Boolean(settings.googleMapsApiKey);

  const save = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    await saveMapsKey(trimmed);
    setKeyInput('');
    setEditing(false);
    // The Maps loader cannot swap keys after init; reload to apply.
    window.location.reload();
  };

  return (
    <div className="stack">
      <section className="card stack">
        <h3 className="section-title" style={{ margin: 0 }}>
          {t('settings.mapsKeyTitle')}
        </h3>

        <div className="row">
          <span
            className="chip"
            style={
              effectiveMapsKey
                ? { background: 'var(--color-success)', color: '#04120b', borderColor: 'transparent' }
                : undefined
            }
          >
            {effectiveMapsKey ? t('settings.keyConfigured') : t('settings.keyNotConfigured')}
          </span>
          {hasKey && !editing && (
            <span className="faint">{maskKey(settings.googleMapsApiKey!)}</span>
          )}
        </div>

        {editing ? (
          <>
            <div className="field">
              <label htmlFor="maps-key">{t('settings.mapsKeyLabel')}</label>
              <input
                id="maps-key"
                type="password"
                autoComplete="off"
                value={keyInput}
                placeholder={t('settings.mapsKeyPlaceholder')}
                onChange={(event) => setKeyInput(event.target.value)}
              />
            </div>
            <p className="faint">{t('settings.mapsKeyHelp')}</p>
            <p className="notice">{t('settings.mapsKeyWarning')}</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              {hasKey && (
                <button className="btn btn--ghost" onClick={() => setEditing(false)}>
                  {t('common.cancel')}
                </button>
              )}
              <button className="btn btn--primary" onClick={save} disabled={!keyInput.trim()}>
                {t('settings.saveKey')}
              </button>
            </div>
          </>
        ) : (
          <div className="row">
            <button className="btn" onClick={() => setEditing(true)}>
              {t('settings.replaceKey')}
            </button>
            <button
              className="btn btn--danger"
              onClick={async () => {
                await removeMapsKey();
                window.location.reload();
              }}
            >
              {t('settings.removeKey')}
            </button>
          </div>
        )}

        <a
          href="https://developers.google.com/maps/documentation/javascript/get-api-key"
          target="_blank"
          rel="noreferrer noopener"
          className="faint"
        >
          {t('settings.docLink')} ↗
        </a>
      </section>

      <section className="card stack">
        <h3 className="section-title" style={{ margin: 0 }}>
          {t('settings.theme')}
        </h3>
        <div className="row">
          {(['dark', 'light'] as ThemePreference[]).map((theme) => (
            <button
              key={theme}
              className={`chip ${settings.theme === theme ? 'chip--active' : ''}`}
              aria-pressed={settings.theme === theme}
              onClick={() => setTheme(theme)}
            >
              {t(`settings.theme.${theme}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h3 className="section-title" style={{ margin: 0 }}>
          {t('settings.language')}
        </h3>
        <select
          value={settings.locale}
          onChange={(event) => setLocale(event.target.value)}
          aria-label={t('settings.language')}
        >
          {AVAILABLE_LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {locale}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}
