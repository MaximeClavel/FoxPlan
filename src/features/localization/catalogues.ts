import { fr } from './fr';
import { en } from './en';

export type TranslationKey = keyof typeof fr;
export type TranslationDict = Record<TranslationKey, string>;

export const catalogues: Record<string, TranslationDict> = {
  'fr-FR': fr,
  'en-US': en,
};

export const DEFAULT_LOCALE = 'fr-FR';
export const AVAILABLE_LOCALES = Object.keys(catalogues);

export function getCatalogue(locale: string): TranslationDict {
  return catalogues[locale] ?? catalogues[DEFAULT_LOCALE];
}

/** Interpolates {name} placeholders. */
export function formatMessage(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
