import { describe, expect, it } from 'vitest';
import { airbnbAdapter, bookingAdapter, kayakAdapter } from './providers';

const query = {
  destination: 'Lisbonne',
  checkIn: '2026-08-01',
  checkOut: '2026-08-05',
  adults: 2,
  budgetMax: 150,
  currency: 'EUR',
};

describe('provider URL builders', () => {
  it('builds an Airbnb search URL with encoded criteria', () => {
    const url = new URL(airbnbAdapter.buildSearchUrl(query));
    expect(url.hostname).toBe('www.airbnb.com');
    expect(url.pathname).toContain('Lisbonne');
    expect(url.searchParams.get('checkin')).toBe('2026-08-01');
    expect(url.searchParams.get('checkout')).toBe('2026-08-05');
    expect(url.searchParams.get('adults')).toBe('2');
    expect(url.searchParams.get('price_max')).toBe('150');
  });

  it('builds a Booking search URL', () => {
    const url = new URL(bookingAdapter.buildSearchUrl(query));
    expect(url.hostname).toBe('www.booking.com');
    expect(url.searchParams.get('ss')).toBe('Lisbonne');
    expect(url.searchParams.get('checkin')).toBe('2026-08-01');
    expect(url.searchParams.get('group_adults')).toBe('2');
    expect(url.searchParams.get('no_rooms')).toBe('1');
  });

  it('builds a KAYAK search URL with path segments', () => {
    const url = kayakAdapter.buildSearchUrl(query);
    expect(url).toContain('https://www.kayak.com/hotels/');
    expect(url).toContain('Lisbonne');
    expect(url).toContain('2026-08-01/2026-08-05');
    expect(url).toContain('2adults');
  });

  it('throws when destination is empty', () => {
    expect(() => bookingAdapter.buildSearchUrl({ ...query, destination: '  ' })).toThrow();
  });

  it('omits optional params when not provided', () => {
    const url = new URL(airbnbAdapter.buildSearchUrl({ destination: 'Rome' }));
    expect(url.searchParams.has('checkin')).toBe(false);
    expect(url.searchParams.has('price_max')).toBe(false);
  });
});
