import { z } from 'zod';

/** Current persisted schema version. Bump when the shape changes. */
export const SCHEMA_VERSION = 1;

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const placeReferenceSchema = z.object({
  placeId: z.string().min(1).optional(),
  coordinates: geoPointSchema,
  displayName: z.string().min(1),
  address: z.string().optional(),
});

export const placeCategorySchema = z.enum([
  'restaurant',
  'activity',
  'attraction',
  'airport',
  'transport',
  'lodging',
  'other',
]);

export const transportModeSchema = z.enum([
  'DRIVING',
  'TRANSIT',
  'BICYCLING',
  'WALKING',
  'TWO_WHEELER',
  'FLIGHT',
]);

export const providerSchema = z.enum(['airbnb', 'booking', 'kayak', 'other']);

export const savedPlaceSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  category: placeCategorySchema,
  reference: placeReferenceSchema,
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  dayIds: z.array(z.string()).default([]),
  visitStartDate: z.string().optional(),
  visitEndDate: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  priceLevel: z.number().int().min(0).max(4).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const accommodationCandidateSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  provider: providerSchema,
  sourceUrl: z.string().url().optional(),
  name: z.string().min(1),
  location: placeReferenceSchema,
  price: z
    .object({
      amount: z.number().nonnegative(),
      currency: z.string().min(3).max(3),
      period: z.enum(['night', 'stay']).default('night'),
    })
    .optional(),
  imageUrl: z.string().url().optional(),
  notes: z.string().optional(),
  checkInNotes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const routeStopSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().nonnegative(),
  reference: placeReferenceSchema,
});

export const routePlanSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  dayId: z.string().optional(),
  stops: z.array(routeStopSchema).default([]),
  selectedMode: transportModeSchema.default('DRIVING'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const tripDaySchema = z.object({
  id: z.string().min(1),
  date: z.string(),
  order: z.number().int().nonnegative(),
  label: z.string().optional(),
});

export const mapPreferencesSchema = z.object({
  center: geoPointSchema.optional(),
  zoom: z.number().min(1).max(22).optional(),
  visibleCategories: z.array(placeCategorySchema).optional(),
});

export const tripSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  destination: z.string().optional(),
  destinationPoint: geoPointSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  locale: z.string().min(2).default('fr-FR'),
  currency: z.string().min(3).max(3).default('EUR'),
  days: z.array(tripDaySchema).default([]),
  mapPreferences: mapPreferencesSchema.default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const themePreferenceSchema = z.enum(['dark', 'light']);

export const applicationSettingsSchema = z.object({
  id: z.literal('app-settings'),
  googleMapsApiKey: z.string().optional(),
  theme: themePreferenceSchema.default('dark'),
  locale: z.string().min(2).default('fr-FR'),
  activeTripId: z.string().optional(),
  updatedAt: z.string().datetime(),
});

/** Export envelope validated on import. Excludes settings and secrets. */
export const exportEnvelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string().datetime(),
  trips: z.array(tripSchema),
  savedPlaces: z.array(savedPlaceSchema),
  accommodationCandidates: z.array(accommodationCandidateSchema),
  routePlans: z.array(routePlanSchema),
});

export type GeoPoint = z.infer<typeof geoPointSchema>;
export type PlaceReference = z.infer<typeof placeReferenceSchema>;
export type PlaceCategory = z.infer<typeof placeCategorySchema>;
export type TransportMode = z.infer<typeof transportModeSchema>;
export type Provider = z.infer<typeof providerSchema>;
export type SavedPlace = z.infer<typeof savedPlaceSchema>;
export type AccommodationCandidate = z.infer<typeof accommodationCandidateSchema>;
export type RouteStop = z.infer<typeof routeStopSchema>;
export type RoutePlan = z.infer<typeof routePlanSchema>;
export type TripDay = z.infer<typeof tripDaySchema>;
export type MapPreferences = z.infer<typeof mapPreferencesSchema>;
export type Trip = z.infer<typeof tripSchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type ApplicationSettings = z.infer<typeof applicationSettingsSchema>;
export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;
