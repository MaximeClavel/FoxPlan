import type { GeoPoint, TransportMode } from '@/domain/schemas';

export interface RouteLegSummary {
  durationSeconds: number;
  distanceMeters: number;
  startLabel: string;
  endLabel: string;
}

export interface RouteResult {
  mode: TransportMode;
  available: boolean;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  legs: RouteLegSummary[];
  path: GeoPoint[];
  warnings: string[];
}

const TRANSPORT_LABEL_ORDER: TransportMode[] = [
  'DRIVING',
  'TRANSIT',
  'BICYCLING',
  'WALKING',
  'TWO_WHEELER',
];

function resolveTravelMode(mode: TransportMode): google.maps.TravelMode | null {
  switch (mode) {
    case 'DRIVING':
      return google.maps.TravelMode.DRIVING;
    case 'TRANSIT':
      return google.maps.TravelMode.TRANSIT;
    case 'BICYCLING':
      return google.maps.TravelMode.BICYCLING;
    case 'WALKING':
      return google.maps.TravelMode.WALKING;
    // TWO_WHEELER is not supported by the client DirectionsService.
    default:
      return null;
  }
}

function unavailable(mode: TransportMode, warning?: string): RouteResult {
  return {
    mode,
    available: false,
    totalDurationSeconds: 0,
    totalDistanceMeters: 0,
    legs: [],
    path: [],
    warnings: warning ? [warning] : [],
  };
}

/**
 * Computes a route across ordered stops for a single transport mode.
 * Route responses are transient and must not be persisted.
 */
export async function computeRoute(
  stops: { coordinates: GeoPoint; label: string }[],
  mode: TransportMode,
): Promise<RouteResult> {
  if (stops.length < 2) {
    return unavailable(mode, 'not-enough-stops');
  }

  const travelMode = resolveTravelMode(mode);
  if (!travelMode) {
    return unavailable(mode);
  }

  await google.maps.importLibrary('routes');
  const service = new google.maps.DirectionsService();

  const [origin, ...rest] = stops;
  const destination = rest[rest.length - 1];
  const waypoints = rest.slice(0, -1).map((stop) => ({
    location: new google.maps.LatLng(stop.coordinates.lat, stop.coordinates.lng),
    stopover: true,
  }));

  try {
    const response = await service.route({
      origin: new google.maps.LatLng(origin.coordinates.lat, origin.coordinates.lng),
      destination: new google.maps.LatLng(
        destination.coordinates.lat,
        destination.coordinates.lng,
      ),
      waypoints,
      travelMode,
    });

    const route = response.routes[0];
    if (!route) return unavailable(mode, 'no-route');

    const legs = route.legs.map((leg): RouteLegSummary => ({
      durationSeconds: leg.duration?.value ?? 0,
      distanceMeters: leg.distance?.value ?? 0,
      startLabel: leg.start_address ?? '',
      endLabel: leg.end_address ?? '',
    }));

    const totalDurationSeconds = legs.reduce((sum, leg) => sum + leg.durationSeconds, 0);
    const totalDistanceMeters = legs.reduce((sum, leg) => sum + leg.distanceMeters, 0);
    const path = (route.overview_path ?? []).map((point) => ({
      lat: point.lat(),
      lng: point.lng(),
    }));

    return {
      mode,
      available: true,
      totalDurationSeconds,
      totalDistanceMeters,
      legs,
      path,
      warnings: route.warnings ?? [],
    };
  } catch {
    return unavailable(mode, 'request-failed');
  }
}

export const SUPPORTED_MODES: TransportMode[] = TRANSPORT_LABEL_ORDER;
