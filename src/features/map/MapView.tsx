import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/app/store/AppStore';
import { useWorkspace } from '@/app/workspace/WorkspaceContext';
import { useI18n } from '@/features/localization/I18nProvider';
import { loadGoogleMaps, MapsKeyChangedError } from '@/infrastructure/google/mapsLoader';
import type { GeoPoint, PlaceCategory } from '@/domain/schemas';
import { CATEGORY_COLOR, categoryFromTypes } from './categoryStyle';

type LoadState = 'key-missing' | 'loading' | 'ready' | 'error';

function markerIcon(color: string, selected: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: selected ? '#ffffff' : 'rgba(0,0,0,0.35)',
    strokeWeight: selected ? 3 : 1.5,
    scale: selected ? 9 : 7,
  };
}

export function MapView() {
  const { effectiveMapsKey, activeTrip, savedPlaces, candidates } = useAppStore();
  const {
    searchResults,
    selectedPlaceId,
    selectPlace,
    visibleCategories,
    focusPoint,
    routePath,
    setActivePanel,
  } = useWorkspace();
  const { t } = useI18n();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  // Load + init map.
  useEffect(() => {
    if (!effectiveMapsKey) {
      setLoadState('key-missing');
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    loadGoogleMaps(effectiveMapsKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        if (!mapRef.current) {
          const options: google.maps.MapOptions = {
            center: { lat: 48.8566, lng: 2.3522 },
            zoom: 12,
            disableDefaultUI: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          };
          // colorScheme keeps the map dark to match the app shell.
          (options as { colorScheme?: string }).colorScheme = 'DARK';
          mapRef.current = new google.maps.Map(containerRef.current, options);
        }
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof MapsKeyChangedError) {
          window.location.reload();
          return;
        }
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveMapsKey]);

  // Center on active trip destination.
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current) return;
    if (activeTrip?.destinationPoint) {
      mapRef.current.setCenter(activeTrip.destinationPoint);
    }
  }, [loadState, activeTrip?.id, activeTrip?.destinationPoint]);

  // Focus point (from list interactions).
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current || !focusPoint) return;
    mapRef.current.panTo(focusPoint);
    if ((mapRef.current.getZoom() ?? 0) < 14) mapRef.current.setZoom(14);
  }, [loadState, focusPoint]);

  // Render markers.
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current) return;
    const map = mapRef.current;

    for (const marker of markersRef.current) marker.setMap(null);
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    const addMarker = (
      point: GeoPoint,
      color: string,
      title: string,
      id: string,
      onClick: () => void,
    ) => {
      const selected = selectedPlaceId === id;
      const marker = new google.maps.Marker({
        position: point,
        map,
        title,
        icon: markerIcon(color, selected),
        zIndex: selected ? 999 : undefined,
      });
      marker.addListener('click', onClick);
      markersRef.current.push(marker);
      bounds.extend(point);
      hasPoints = true;
    };

    for (const place of savedPlaces) {
      if (!visibleCategories.has(place.category)) continue;
      addMarker(
        place.reference.coordinates,
        CATEGORY_COLOR[place.category],
        place.reference.displayName,
        place.id,
        () => {
          selectPlace(place.id);
          setActivePanel('places');
        },
      );
    }

    if (visibleCategories.has('lodging')) {
      for (const candidate of candidates) {
        addMarker(
          candidate.location.coordinates,
          CATEGORY_COLOR.lodging,
          candidate.name,
          candidate.id,
          () => {
            selectPlace(candidate.id);
            setActivePanel('accommodation');
          },
        );
      }
    }

    for (const result of searchResults) {
      const category: PlaceCategory = categoryFromTypes(result.types);
      if (!visibleCategories.has(category)) continue;
      addMarker(
        result.coordinates,
        CATEGORY_COLOR[category],
        result.displayName,
        result.placeId,
        () => {
          selectPlace(result.placeId);
          setActivePanel('places');
        },
      );
    }

    if (hasPoints && searchResults.length > 0) {
      map.fitBounds(bounds, 64);
    }
  }, [
    loadState,
    savedPlaces,
    candidates,
    searchResults,
    visibleCategories,
    selectedPlaceId,
    selectPlace,
    setActivePanel,
  ]);

  // Route polyline.
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current) return;
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (routePath.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path: routePath,
        map: mapRef.current,
        strokeColor: '#4f9dff',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });
      const bounds = new google.maps.LatLngBounds();
      for (const point of routePath) bounds.extend(point);
      mapRef.current.fitBounds(bounds, 64);
    }
  }, [loadState, routePath]);

  if (loadState === 'key-missing') {
    return (
      <div className="map-overlay">
        <p>{t('map.keyMissing')}</p>
        <button
          className="btn btn--primary"
          onClick={() => setActivePanel('settings')}
        >
          {t('map.keyMissingCta')}
        </button>
      </div>
    );
  }

  if (loadState === 'error') {
    return <div className="map-overlay">{t('map.error')}</div>;
  }

  return (
    <>
      <div ref={containerRef} className="map-canvas" aria-label={t('map.title')} role="application" />
      {loadState === 'loading' && <div className="map-overlay">{t('map.loading')}</div>}
    </>
  );
}
