import { useRef, useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useI18n } from '@/features/localization/I18nProvider';

export function DataPanel() {
  const { exportData, importData } = useAppStore();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [strategy, setStrategy] = useState<'replace' | 'merge'>('merge');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const doExport = async () => {
    const blob = await exportData();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `foxplan-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    const ok = await importData(text, strategy);
    setMessage(
      ok
        ? { kind: 'ok', text: t('data.importSuccess') }
        : { kind: 'error', text: t('data.importError') },
    );
  };

  return (
    <div className="stack">
      <h3 className="section-title">{t('data.title')}</h3>
      <p className="notice">{t('data.notice')}</p>

      <button className="btn btn--primary" onClick={doExport}>
        {t('data.export')}
      </button>

      <section className="card stack">
        <span className="section-title" style={{ margin: 0 }}>
          {t('data.import')}
        </span>
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
          {t('data.import')}
        </button>
        {message && (
          <p className={message.kind === 'ok' ? 'muted' : 'notice'}>{message.text}</p>
        )}
      </section>
    </div>
  );
}
