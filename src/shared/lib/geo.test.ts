import { describe, expect, it } from 'vitest';
import { haversineDistanceMeters } from './geo';

describe('haversineDistanceMeters', () => {
  it('returns 0 for the same point', () => {
    const point = { lat: 48.8566, lng: 2.3522 };
    expect(haversineDistanceMeters(point, point)).toBe(0);
  });

  it('approximates the Paris–London distance (~344 km)', () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const meters = haversineDistanceMeters(paris, london);
    expect(meters).toBeGreaterThan(330_000);
    expect(meters).toBeLessThan(360_000);
  });

  it('is symmetric', () => {
    const a = { lat: 40.4168, lng: -3.7038 };
    const b = { lat: 41.3874, lng: 2.1686 };
    expect(haversineDistanceMeters(a, b)).toBeCloseTo(haversineDistanceMeters(b, a), 5);
  });
});
