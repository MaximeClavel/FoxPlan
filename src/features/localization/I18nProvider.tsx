import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import {
  DEFAULT_LOCALE,
  formatMessage,
  getCatalogue,
  type TranslationKey,
} from './catalogues';

interface I18nContextValue {
  locale: string;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  formatDistance: (meters: number) => string;
  formatDuration: (seconds: number) => string;
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (iso: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const catalogue = useMemo(() => getCatalogue(locale), [locale]);

  const t = useCallback<I18nContextValue['t']>(
    (key, values) => {
      const template = catalogue[key] ?? key;
      return formatMessage(template, values);
    },
    [catalogue],
  );

  const value = useMemo<I18nContextValue>(() => {
    const effectiveLocale = locale || DEFAULT_LOCALE;
    return {
      locale: effectiveLocale,
      t,
      formatDistance(meters) {
        if (!Number.isFinite(meters)) return '—';
        if (meters < 1000) {
          return new Intl.NumberFormat(effectiveLocale, {
            style: 'unit',
            unit: 'meter',
            maximumFractionDigits: 0,
          }).format(Math.round(meters));
        }
        return new Intl.NumberFormat(effectiveLocale, {
          style: 'unit',
          unit: 'kilometer',
          maximumFractionDigits: 1,
        }).format(meters / 1000);
      },
      formatDuration(seconds) {
        if (!Number.isFinite(seconds)) return '—';
        const totalMinutes = Math.round(seconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours === 0) return `${minutes} min`;
        return `${hours} h ${minutes.toString().padStart(2, '0')}`;
      },
      formatCurrency(amount, currency) {
        try {
          return new Intl.NumberFormat(effectiveLocale, {
            style: 'currency',
            currency,
          }).format(amount);
        } catch {
          return `${amount} ${currency}`;
        }
      },
      formatDate(iso) {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return iso;
        return new Intl.DateTimeFormat(effectiveLocale, { dateStyle: 'medium' }).format(date);
      },
    };
  }, [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}
