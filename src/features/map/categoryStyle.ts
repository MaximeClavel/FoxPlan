import type { PlaceCategory } from '@/domain/schemas';

export const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  restaurant: '#f4813f',
  activity: '#4f9dff',
  attraction: '#a06bff',
  airport: '#43c187',
  transport: '#f5b544',
  lodging: '#ff5d8f',
  other: '#9aa7c2',
};

export const CATEGORY_ICON: Record<PlaceCategory, string> = {
  restaurant: '🍽️',
  activity: '🎯',
  attraction: '⭐',
  airport: '✈️',
  transport: '🚉',
  lodging: '🏨',
  other: '📍',
};

/** Best-effort mapping from Google place types to a FoxPlan category. */
export function categoryFromTypes(types: string[]): PlaceCategory {
  const set = new Set(types);
  if (set.has('restaurant') || set.has('food') || set.has('cafe') || set.has('bar')) {
    return 'restaurant';
  }
  if (set.has('lodging') || set.has('hotel')) return 'lodging';
  if (set.has('airport')) return 'airport';
  if (
    set.has('transit_station') ||
    set.has('train_station') ||
    set.has('bus_station') ||
    set.has('subway_station')
  ) {
    return 'transport';
  }
  if (set.has('tourist_attraction') || set.has('museum') || set.has('park')) {
    return 'attraction';
  }
  if (set.has('amusement_park') || set.has('point_of_interest')) return 'activity';
  return 'other';
}
