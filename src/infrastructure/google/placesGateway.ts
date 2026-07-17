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

export interface AutocompleteSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText?: string;
}

/**
 * Live autocomplete predictions for the search box.
 * A session token groups keystrokes into one billable session.
 */
export async function fetchAutocomplete(
  input: string,
  options: { bias?: GeoPoint; sessionToken?: unknown } = {},
): Promise<AutocompleteSuggestion[]> {
  const query = input.trim();
  if (query.length < 2) return [];

  const placesLib = (await google.maps.importLibrary(
    'places',
  )) as google.maps.PlacesLibrary;
  const { AutocompleteSuggestion: SuggestionApi } = placesLib;

  const request: google.maps.places.AutocompleteRequest = {
    input: query,
    sessionToken: options.sessionToken as google.maps.places.AutocompleteSessionToken,
  };
  if (options.bias) {
    request.locationBias = { center: options.bias, radius: 30_000 };
  }

  const { suggestions } = await SuggestionApi.fetchAutocompleteSuggestions(request);

  return suggestions
    .map((suggestion): AutocompleteSuggestion | null => {
      const prediction = suggestion.placePrediction;
      if (!prediction?.placeId) return null;
      return {
        placeId: prediction.placeId,
        primaryText: prediction.mainText?.text ?? prediction.text?.text ?? '',
        secondaryText: prediction.secondaryText?.text ?? undefined,
      };
    })
    .filter((item): item is AutocompleteSuggestion => item !== null);
}

/** Creates a session token for a run of autocomplete keystrokes. */
export async function createAutocompleteSessionToken(): Promise<unknown> {
  const placesLib = (await google.maps.importLibrary(
    'places',
  )) as google.maps.PlacesLibrary;
  return new placesLib.AutocompleteSessionToken();
}

/** Fetches full details for a selected suggestion. */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: unknown,
): Promise<PlaceSearchResult | null> {
  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
  const place = new Place({
    id: placeId,
    requestedLanguage: undefined,
  });
  await place.fetchFields({
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
  });
  void sessionToken;
  const location = place.location;
  if (!location) return null;
  return {
    placeId: place.id,
    displayName: place.displayName ?? '',
    coordinates: { lat: location.lat(), lng: location.lng() },
    address: place.formattedAddress ?? undefined,
    rating: place.rating ?? undefined,
    priceLevel: mapPriceLevel(place.priceLevel),
    types: place.types ?? [],
    googleMapsUri: place.googleMapsURI ?? undefined,
  };
}
