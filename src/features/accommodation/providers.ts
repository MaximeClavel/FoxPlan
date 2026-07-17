import type { Provider } from '@/domain/schemas';

export interface AccommodationSearchQuery {
  destination: string;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
  rooms?: number;
  budgetMax?: number;
  currency?: string;
}

export interface AccommodationProviderAdapter {
  provider: Exclude<Provider, 'other'>;
  label: string;
  buildSearchUrl(query: AccommodationSearchQuery): string;
}

function requireDestination(destination: string): string {
  const trimmed = destination.trim();
  if (!trimmed) {
    throw new Error('destination is required');
  }
  return trimmed;
}

export const airbnbAdapter: AccommodationProviderAdapter = {
  provider: 'airbnb',
  label: 'Airbnb',
  buildSearchUrl(query) {
    const destination = requireDestination(query.destination);
    const url = new URL(`https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes`);
    if (query.checkIn) url.searchParams.set('checkin', query.checkIn);
    if (query.checkOut) url.searchParams.set('checkout', query.checkOut);
    if (query.adults && query.adults > 0) {
      url.searchParams.set('adults', String(query.adults));
    }
    if (query.children && query.children > 0) {
      url.searchParams.set('children', String(query.children));
    }
    if (query.budgetMax && query.budgetMax > 0) {
      url.searchParams.set('price_max', String(Math.round(query.budgetMax)));
    }
    return url.toString();
  },
};

export const bookingAdapter: AccommodationProviderAdapter = {
  provider: 'booking',
  label: 'Booking.com',
  buildSearchUrl(query) {
    const destination = requireDestination(query.destination);
    const url = new URL('https://www.booking.com/searchresults.html');
    url.searchParams.set('ss', destination);
    if (query.checkIn) url.searchParams.set('checkin', query.checkIn);
    if (query.checkOut) url.searchParams.set('checkout', query.checkOut);
    const adults = query.adults && query.adults > 0 ? query.adults : 2;
    url.searchParams.set('group_adults', String(adults));
    if (query.children && query.children > 0) {
      url.searchParams.set('group_children', String(query.children));
    }
    const rooms = query.rooms && query.rooms > 0 ? query.rooms : 1;
    url.searchParams.set('no_rooms', String(rooms));
    return url.toString();
  },
};

export const kayakAdapter: AccommodationProviderAdapter = {
  provider: 'kayak',
  label: 'KAYAK',
  buildSearchUrl(query) {
    const destination = requireDestination(query.destination);
    const segments = ['https://www.kayak.com/hotels', encodeURIComponent(destination)];
    if (query.checkIn && query.checkOut) {
      segments.push(`${query.checkIn}/${query.checkOut}`);
    }
    const adults = query.adults && query.adults > 0 ? query.adults : 2;
    segments.push(`${adults}adults`);
    return segments.join('/');
  },
};

export const providerAdapters: Record<
  Exclude<Provider, 'other'>,
  AccommodationProviderAdapter
> = {
  airbnb: airbnbAdapter,
  booking: bookingAdapter,
  kayak: kayakAdapter,
};

export const providerList = Object.values(providerAdapters);
