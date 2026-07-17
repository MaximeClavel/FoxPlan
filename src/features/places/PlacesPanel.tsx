import { useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import type { PlaceCategory } from '@/domain/schemas';
import type { PlaceSearchResult } from '@/infrastructure/google/placesGateway';
import { categoryFromTypes, CATEGORY_ICON } from '@/features/map/categoryStyle';

const CATEGORY_OPTIONS: PlaceCategory[] = [
  'restaurant',
  'activity',
  'attraction',
  'airport',
  'transport',
  'lodging',
  'other',
];

function ratingStars(rating?: number): string {
  if (!rating) return '';
  return `★ ${rating.toFixed(1)}`;
}

function ResultCard({ result }: { result: PlaceSearchResult }) {
  const { savePlace, savedPlaces } = useAppStore();
  const { selectPlace, selectedPlaceId, focusOn } = useWorkspace();
  const { t } = useI18n();
  const [category, setCategory] = useState<PlaceCategory>(categoryFromTypes(result.types));

  const alreadySaved = savedPlaces.some(
    (place) => place.reference.placeId === result.placeId,
  );
  const selected = selectedPlaceId === result.placeId;

  return (
    <div
      className="card"
      style={selected ? { borderColor: 'var(--color-primary)' } : undefined}
      onClick={() => {
        selectPlace(result.placeId);
        focusOn(result.coordinates);
      }}
    >
      <div className="result-item__title">
        {CATEGORY_ICON[category]} {result.displayName}
      </div>
      {result.address && <div className="faint">{result.address}</div>}
      <div className="row" style={{ gap: 8, marginTop: 6 }}>
        {result.rating && <span className="rating">{ratingStars(result.rating)}</span>}
        {typeof result.priceLevel === 'number' && (
          <span className="muted">{'€'.repeat(Math.max(1, result.priceLevel))}</span>
        )}
      </div>
      <div className="row" style={{ marginTop: 10, gap: 6 }}>
        <select
          aria-label={t('places.category')}
          value={category}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setCategory(event.target.value as PlaceCategory)}
          style={{ width: 'auto' }}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`category.${option}`)}
            </option>
          ))}
        </select>
        <button
          className="btn btn--primary btn--sm"
          disabled={alreadySaved}
          onClick={(event) => {
            event.stopPropagation();
            savePlace(result, category);
          }}
        >
          {alreadySaved ? '✓' : t('places.save')}
        </button>
      </div>
      {result.googleMapsUri && (
        <a
          href={result.googleMapsUri}
          target="_blank"
          rel="noreferrer noopener"
          className="faint"
          onClick={(event) => event.stopPropagation()}
        >
          {t('places.openInGoogle')}
        </a>
      )}
    </div>
  );
}

export function PlacesPanel() {
  const { savedPlaces, removeSavedPlace, updateSavedPlace } = useAppStore();
  const { searchResults, searching, searchError, selectPlace, selectedPlaceId, focusOn } =
    useWorkspace();
  const { t } = useI18n();

  return (
    <div className="stack">
      <section>
        <h3 className="section-title">{t('places.results')}</h3>
        {searching && <p className="muted">{t('common.loading')}</p>}
        {searchError && <p className="notice">{t('map.error')}</p>}
        {!searching && searchResults.length === 0 && (
          <p className="empty-state">{t('places.noResults')}</p>
        )}
        <div className="list">
          {searchResults.map((result) => (
            <ResultCard key={result.placeId} result={result} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="section-title">
          {t('places.saved')} ({savedPlaces.length})
        </h3>
        {savedPlaces.length === 0 ? (
          <p className="empty-state">{t('places.noSaved')}</p>
        ) : (
          <div className="list">
            {savedPlaces.map((place) => {
              const selected = selectedPlaceId === place.id;
              return (
                <div
                  key={place.id}
                  className="card"
                  style={selected ? { borderColor: 'var(--color-primary)' } : undefined}
                  onClick={() => {
                    selectPlace(place.id);
                    focusOn(place.reference.coordinates);
                  }}
                >
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="result-item__title">
                      {CATEGORY_ICON[place.category]} {place.reference.displayName}
                    </span>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeSavedPlace(place.id);
                      }}
                    >
                      {t('places.remove')}
                    </button>
                  </div>
                  <span className="chip">{t(`category.${place.category}`)}</span>
                  <textarea
                    placeholder={t('places.notes')}
                    defaultValue={place.notes ?? ''}
                    rows={2}
                    style={{ marginTop: 8 }}
                    onClick={(event) => event.stopPropagation()}
                    onBlur={(event) => {
                      const notes = event.target.value.trim();
                      if (notes !== (place.notes ?? '')) {
                        updateSavedPlace({ ...place, notes: notes || undefined });
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
