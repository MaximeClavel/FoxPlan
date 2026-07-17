import type { GeoPoint, PlaceCategory } from '@/domain/schemas';

export interface PlaceSearchResult {
  placeId: string;
  displayName: string;
  coordinates: GeoPoint;
  address?: string;
  rating?: number;
  priceLevel?: number;
  types: string[];
  googleMapsUri?: string;
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/** Maps a discovery category to a Places `includedType`. */
export const CATEGORY_INCLUDED_TYPE: Partial<Record<PlaceCategory, string>> = {
  restaurant: 'restaurant',
  activity: 'tourist_attraction',
  attraction: 'tourist_attraction',
  airport: 'airport',
  transport: 'transit_station',
  lodging: 'lodging',
};

interface SearchOptions {
  locationBias?: GeoPoint;
  category?: PlaceCategory;
  maxResults?: number;
}

function mapPriceLevel(priceLevel: unknown): number | undefined {
  if (typeof priceLevel === 'number') return priceLevel;
  if (typeof priceLevel === 'string' && priceLevel in PRICE_LEVEL_MAP) {
    return PRICE_LEVEL_MAP[priceLevel];
  }
  return undefined;
}

/** Text search using the Places API (new Place class). */
export async function searchPlacesByText(
  textQuery: string,
  options: SearchOptions = {},
): Promise<PlaceSearchResult[]> {
  const query = textQuery.trim();
  if (!query) return [];

  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;

  const request: google.maps.places.SearchByTextRequest = {
    textQuery: query,
    fields: [
      'id',
      'displayName',
      'location',
      'formattedAddress',
      'rating',
      'priceLevel',
      'types',
      'googleMapsURI',
    ],
    maxResultCount: options.maxResults ?? 12,
  };

  if (options.category && CATEGORY_INCLUDED_TYPE[options.category]) {
    request.includedType = CATEGORY_INCLUDED_TYPE[options.category];
  }

  if (options.locationBias) {
    request.locationBias = {
      center: options.locationBias,
      radius: 20_000,
    };
  }

  const { places } = await Place.searchByText(request);

  return places
    .map((place): PlaceSearchResult | null => {
      const location = place.location;
      if (!location) return null;
      return {
        placeId: place.id,
        displayName: place.displayName ?? query,
        coordinates: { lat: location.lat(), lng: location.lng() },
        address: place.formattedAddress ?? undefined,
        rating: place.rating ?? undefined,
        priceLevel: mapPriceLevel(place.priceLevel),
        types: place.types ?? [],
        googleMapsUri: place.googleMapsURI ?? undefined,
      };
    })
    .filter((result): result is PlaceSearchResult => result !== null);
}
