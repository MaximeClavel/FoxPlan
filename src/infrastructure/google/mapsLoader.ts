import { Loader } from '@googlemaps/js-api-loader';

let loader: Loader | null = null;
let loadedKey: string | null = null;
let loadPromise: Promise<typeof google> | null = null;

export class MapsKeyChangedError extends Error {
  constructor() {
    super('The Google Maps API key changed and requires a page reload.');
    this.name = 'MapsKeyChangedError';
  }
}

/**
 * Loads the Google Maps JavaScript API once per page with the given key.
 * The Maps loader cannot switch keys after load; callers must reload the page.
 */
export async function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error('missing-key');
  }

  if (loadedKey && loadedKey !== key) {
    throw new MapsKeyChangedError();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loader = new Loader({
    apiKey: key,
    version: 'weekly',
    libraries: ['maps', 'places', 'marker'],
  });
  loadedKey = key;

  loadPromise = loader.load();
  return loadPromise;
}

export function isMapsLoaded(): boolean {
  return typeof google !== 'undefined' && !!google.maps;
}
