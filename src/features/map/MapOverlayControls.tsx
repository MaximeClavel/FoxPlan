import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace, ALL_CATEGORIES } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import type { PlaceCategory } from '@/domain/schemas';
import {
  createAutocompleteSessionToken,
  fetchAutocomplete,
  getPlaceDetails,
  type AutocompleteSuggestion,
} from '@/infrastructure/google/placesGateway';

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
  const { runSearch, searching, visibleCategories, toggleCategory, presentPlace } = useWorkspace();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const sessionTokenRef = useRef<unknown>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  if (!effectiveMapsKey) return null;

  const scheduleAutocomplete = (value: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = await createAutocompleteSessionToken();
        }
        const results = await fetchAutocomplete(value, {
          bias: activeTrip?.destinationPoint ?? undefined,
          sessionToken: sessionTokenRef.current,
        });
        setSuggestions(results);
        setOpen(results.length > 0);
        setHighlight(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 250);
  };

  const onChange = (value: string) => {
    setQuery(value);
    scheduleAutocomplete(value);
  };

  const runTextSearch = () => {
    if (!query.trim()) return;
    setOpen(false);
    setSuggestions([]);
    runSearch(query, { bias: activeTrip?.destinationPoint ?? undefined });
  };

  const chooseSuggestion = async (suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.primaryText);
    setOpen(false);
    setSuggestions([]);
    try {
      const detail = await getPlaceDetails(suggestion.placeId, sessionTokenRef.current);
      sessionTokenRef.current = null; // token consumed on details fetch
      if (detail) {
        presentPlace(detail);
      } else {
        runSearch(suggestion.primaryText, { bias: activeTrip?.destinationPoint ?? undefined });
      }
    } catch {
      runSearch(suggestion.primaryText, { bias: activeTrip?.destinationPoint ?? undefined });
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (event.key === 'Enter') runTextSearch();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlight >= 0) chooseSuggestion(suggestions[highlight]);
      else runTextSearch();
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <>
      <div className="map-search" role="search">
        <div className="map-search__field">
          <input
            value={query}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            placeholder={t('map.searchPlaceholder')}
            aria-label={t('map.searchPlaceholder')}
            aria-autocomplete="list"
            aria-expanded={open}
            role="combobox"
          />
          {open && suggestions.length > 0 && (
            <ul className="suggestions" role="listbox">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.placeId}
                  role="option"
                  aria-selected={index === highlight}
                  className={`suggestion ${index === highlight ? 'suggestion--active' : ''}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    chooseSuggestion(suggestion);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                >
                  <span className="suggestion__primary">{suggestion.primaryText}</span>
                  {suggestion.secondaryText && (
                    <span className="suggestion__secondary">{suggestion.secondaryText}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="btn btn--primary" onClick={runTextSearch} disabled={searching}>
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
