import { useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace, ALL_CATEGORIES } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import type { PlaceCategory } from '@/domain/schemas';

const CATEGORY_KEYS: Record<PlaceCategory, `category.${PlaceCategory}`> = {
  restaurant: 'category.restaurant',
  activity: 'category.activity',
  attraction: 'category.attraction',
  airport: 'category.airport',
  transport: 'category.transport',
  lodging: 'category.lodging',
  other: 'category.other',
};

export function MapOverlayControls() {
  const { effectiveMapsKey, activeTrip } = useAppStore();
  const { runSearch, searching, visibleCategories, toggleCategory } = useWorkspace();
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  if (!effectiveMapsKey) return null;

  const submit = () => {
    if (!query.trim()) return;
    runSearch(query, { bias: activeTrip?.destinationPoint ?? undefined });
  };

  return (
    <>
      <div className="map-search" role="search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder={t('map.searchPlaceholder')}
          aria-label={t('map.searchPlaceholder')}
        />
        <button className="btn btn--primary" onClick={submit} disabled={searching}>
          {searching ? t('common.loading') : t('map.search')}
        </button>
      </div>

      <div className="map-filters" role="group" aria-label={t('filters.title')}>
        {ALL_CATEGORIES.map((category) => {
          const active = visibleCategories.has(category);
          return (
            <button
              key={category}
              className={`chip ${active ? 'chip--active' : ''}`}
              aria-pressed={active}
              onClick={() => toggleCategory(category)}
            >
              {t(CATEGORY_KEYS[category])}
            </button>
          );
        })}
      </div>
    </>
  );
}
