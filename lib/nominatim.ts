// lib/nominatim.ts
const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'StudentSave-App/1.0 (studentsave25@gmail.com)' };

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
}

export type SupportedCity = 'Karachi' | 'Lahore' | 'Islamabad';

// ---- internal rate limiting + cache ----
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1s, per Nominatim ToS

let resultsCache: NominatimResult[] = [];
const CACHE_SIZE = 10;

const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();
};

const addToCache = (results: NominatimResult[]) => {
  resultsCache = [...results, ...resultsCache].slice(0, CACHE_SIZE);
};

// ---- debounce wrapper ----
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const searchPlaces = (query: string, city?: string): Promise<NominatimResult[]> => {
  return new Promise((resolve) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      if (!query || query.trim().length < 2) {
        resolve([]);
        return;
      }

      try {
        await waitForRateLimit();

        const fullQuery = city ? `${query}, ${city}, Pakistan` : `${query}, Pakistan`;
        const url = `${BASE}/search?format=json&q=${encodeURIComponent(
          fullQuery
        )}&addressdetails=1&limit=8&countrycodes=pk`;

        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) {
          resolve([]);
          return;
        }

        const data: NominatimResult[] = await response.json();
        addToCache(data);
        resolve(data);
      } catch (error) {
        console.error('Nominatim searchPlaces error:', error);
        resolve([]);
      }
    }, 300);
  });
};

export const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  try {
    await waitForRateLimit();

    const url = `${BASE}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) return null;

    const data: NominatimResult = await response.json();
    const city = data.address?.city || data.address?.town || null;
    return city;
  } catch (error) {
    console.error('Nominatim reverseGeocode error:', error);
    return null;
  }
};

export const matchSupportedCity = (rawCity: string): SupportedCity | null => {
  if (!rawCity) return null;
  const normalized = rawCity.trim().toLowerCase();

  if (normalized.includes('karachi')) return 'Karachi';
  if (normalized.includes('lahore')) return 'Lahore';
  if (normalized.includes('islamabad')) return 'Islamabad';

  return null;
};

export const getCachedResults = (): NominatimResult[] => resultsCache;