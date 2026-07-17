import { useRef, useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useI18n } from '@/features/localization/I18nProvider';
import { parseImport } from './importExport';
import type { ExportData } from '@/domain/repositories';

type ExportScope = 'all' | 'active';

interface PendingImport {
  text: string;
  data: ExportData;
}

export function DataPanel() {
  const { exportData, importData, activeTrip } = useAppStore();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [strategy, setStrategy] = useState<'replace' | 'merge'>('merge');
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const doExport = async () => {
    setMessage(null);
    const blob = await exportData(exportScope);
    if (!blob) {
      setMessage({ kind: 'error', text: t('data.noActiveTrip') });
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = exportScope === 'active' ? '-voyage' : '';
    link.href = url;
    link.download = `foxplan${suffix}-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    setMessage(null);
    const text = await file.text();
    const result = parseImport(text);
    if (!result.ok || !result.data) {
      setPending(null);
      setMessage({ kind: 'error', text: t('data.importError') });
      return;
    }
    setPending({ text, data: result.data });
    setSelectedTripId('all');
  };

  const applyImport = async () => {
    if (!pending) return;
    const tripIds = selectedTripId === 'all' ? undefined : [selectedTripId];
    const ok = await importData(pending.text, strategy, tripIds);
    setMessage(
      ok
        ? { kind: 'ok', text: t('data.importSuccess') }
        : { kind: 'error', text: t('data.importError') },
    );
    if (ok) setPending(null);
  };

  return (
    <div className="stack">
      <h3 className="section-title">{t('data.title')}</h3>
      <p className="notice">{t('data.notice')}</p>

      <section className="card stack">
        <span className="section-title" style={{ margin: 0 }}>
          {t('data.export')}
        </span>
        <div className="row">
          <button
            className={`chip ${exportScope === 'all' ? 'chip--active' : ''}`}
            aria-pressed={exportScope === 'all'}
            onClick={() => setExportScope('all')}
          >
            {t('data.scopeAll')}
          </button>
          <button
            className={`chip ${exportScope === 'active' ? 'chip--active' : ''}`}
            aria-pressed={exportScope === 'active'}
            onClick={() => setExportScope('active')}
            disabled={!activeTrip}
          >
            {t('data.scopeActive')}
            {activeTrip ? ` — ${activeTrip.name}` : ''}
          </button>
        </div>
        <button className="btn btn--primary" onClick={doExport}>
          {t('data.export')}
        </button>
      </section>

      <section className="card stack">
        <span className="section-title" style={{ margin: 0 }}>
          {t('data.import')}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = '';
          }}
        />
        <button className="btn" onClick={() => fileRef.current?.click()}>
          {t('data.importChoose')}
        </button>

        {pending && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="faint">
              {t('data.importFound', { count: pending.data.trips.length })}
            </span>
            <div className="field">
              <label htmlFor="import-which">{t('data.importWhich')}</label>
              <select
                id="import-which"
                value={selectedTripId}
                onChange={(event) => setSelectedTripId(event.target.value)}
              >
                <option value="all">{t('data.scopeAll')}</option>
                {pending.data.trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="row">
              <button
                className={`chip ${strategy === 'merge' ? 'chip--active' : ''}`}
                aria-pressed={strategy === 'merge'}
                onClick={() => setStrategy('merge')}
              >
                {t('data.importMerge')}
              </button>
              <button
                className={`chip ${strategy === 'replace' ? 'chip--active' : ''}`}
                aria-pressed={strategy === 'replace'}
                onClick={() => setStrategy('replace')}
              >
                {t('data.importReplace')}
              </button>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setPending(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn--primary" onClick={applyImport}>
                {t('data.importApply')}
              </button>
            </div>
          </div>
        )}

        {message && (
          <p className={message.kind === 'ok' ? 'muted' : 'notice'}>{message.text}</p>
        )}
      </section>
    </div>
  );
}
