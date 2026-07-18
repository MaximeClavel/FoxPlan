import { useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import type { PlaceCategory, SavedPlace } from '@/domain/schemas';
import type { PlaceSearchResult } from '@/infrastructure/google/placesGateway';
import { categoryFromTypes, CATEGORY_ICON } from '@/features/map/categoryStyle';

const CATEGORY_OPTIONS: PlaceCategory[] = [
  'city',
  'restaurant',
  'activity',
  'attraction',
  'airport',
  'transport',
  'lodging',
  'other',
];

interface PlaceDraft {
  category: PlaceCategory;
  visitStartDate: string;
  visitEndDate: string;
  notes: string;
}

function ratingStars(rating?: number): string {
  if (!rating) return '';
  return `★ ${rating.toFixed(1)}`;
}

/** Shared editable fields: category, visit dates and notes. */
function PlaceEditor({
  draft,
  onChange,
}: {
  draft: PlaceDraft;
  onChange: (patch: Partial<PlaceDraft>) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="stack" style={{ gap: 8 }} onClick={(event) => event.stopPropagation()}>
      <div className="field">
        <label>{t('places.category')}</label>
        <select
          aria-label={t('places.category')}
          value={draft.category}
          onChange={(event) => onChange({ category: event.target.value as PlaceCategory })}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`category.${option}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>{t('places.visitStart')}</label>
          <input
            type="date"
            value={draft.visitStartDate}
            onChange={(event) => onChange({ visitStartDate: event.target.value })}
          />
        </div>
        <div className="field">
          <label>{t('places.visitEnd')}</label>
          <input
            type="date"
            min={draft.visitStartDate || undefined}
            value={draft.visitEndDate}
            onChange={(event) => onChange({ visitEndDate: event.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label>{t('places.notes')}</label>
        <textarea
          rows={2}
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: PlaceSearchResult }) {
  const { savePlace } = useAppStore();
  const { selectPlace, selectedPlaceId, focusOn } = useWorkspace();
  const { t } = useI18n();
  const [draft, setDraft] = useState<PlaceDraft>({
    category: categoryFromTypes(result.types),
    visitStartDate: '',
    visitEndDate: '',
    notes: '',
  });

  const selected = selectedPlaceId === result.placeId;

  const save = () => {
    savePlace(result, draft.category, {
      visitStartDate: draft.visitStartDate || undefined,
      visitEndDate: draft.visitEndDate || undefined,
      notes: draft.notes.trim() || undefined,
    });
  };

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
        {CATEGORY_ICON[draft.category]} {result.displayName}
      </div>
      {result.address && <div className="faint">{result.address}</div>}
      <div className="row" style={{ gap: 8, marginTop: 6 }}>
        {result.rating && <span className="rating">{ratingStars(result.rating)}</span>}
        {typeof result.priceLevel === 'number' && (
          <span className="muted">{'€'.repeat(Math.max(1, result.priceLevel))}</span>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <PlaceEditor
          draft={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        />
      </div>

      <div className="row" style={{ marginTop: 10, gap: 6 }}>
        <button
          className="btn btn--primary btn--sm"
          onClick={(event) => {
            event.stopPropagation();
            save();
          }}
        >
          {t('places.save')}
        </button>
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
    </div>
  );
}

function formatVisit(place: SavedPlace, formatDate: (iso: string) => string): string | null {
  if (!place.visitStartDate) return null;
  const start = formatDate(place.visitStartDate);
  return place.visitEndDate ? `${start} → ${formatDate(place.visitEndDate)}` : start;
}

function SavedPlaceCard({ place }: { place: SavedPlace }) {
  const { removeSavedPlace, updateSavedPlace } = useAppStore();
  const { selectPlace, selectedPlaceId, focusOn } = useWorkspace();
  const { t, formatDate } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlaceDraft>({
    category: place.category,
    visitStartDate: place.visitStartDate ?? '',
    visitEndDate: place.visitEndDate ?? '',
    notes: place.notes ?? '',
  });

  const selected = selectedPlaceId === place.id;
  const visit = formatVisit(place, formatDate);

  const beginEdit = () => {
    setDraft({
      category: place.category,
      visitStartDate: place.visitStartDate ?? '',
      visitEndDate: place.visitEndDate ?? '',
      notes: place.notes ?? '',
    });
    setEditing(true);
  };

  const saveEdit = () => {
    updateSavedPlace({
      ...place,
      category: draft.category,
      visitStartDate: draft.visitStartDate || undefined,
      visitEndDate: draft.visitEndDate || undefined,
      notes: draft.notes.trim() || undefined,
    });
    setEditing(false);
  };

  return (
    <div
      className="card"
      style={selected ? { borderColor: 'var(--color-primary)' } : undefined}
      onClick={() => {
        selectPlace(place.id);
        focusOn(place.reference.coordinates);
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="result-item__title">
          {CATEGORY_ICON[editing ? draft.category : place.category]}{' '}
          {place.reference.displayName}
        </span>
        <div className="row" style={{ gap: 4 }}>
          {!editing && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={(event) => {
                event.stopPropagation();
                beginEdit();
              }}
            >
              {t('places.edit')}
            </button>
          )}
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
      </div>

      {editing ? (
        <div style={{ marginTop: 8 }}>
          <PlaceEditor
            draft={draft}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={(event) => {
                event.stopPropagation();
                setEditing(false);
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={(event) => {
                event.stopPropagation();
                saveEdit();
              }}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 6, marginTop: 6 }}>
          <span className="chip">{t(`category.${place.category}`)}</span>
          <div className="faint">📅 {visit ?? t('places.noDate')}</div>
          {place.notes && <div className="muted">{place.notes}</div>}
        </div>
      )}
    </div>
  );
}

export function PlacesPanel() {
  const { savedPlaces } = useAppStore();
  const { searchResults, searching, searchError } = useWorkspace();
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
            {savedPlaces.map((place) => (
              <SavedPlaceCard key={place.id} place={place} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
