// NWS (National Weather Service) forecast client.
// Free, no API key required, covers US & territories.
// Docs: https://www.weather.gov/documentation/services-web-api

const NWS_BASE = 'https://api.weather.gov';

export interface NwsPoint {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    observationStations: string;
    forecastZone: string;
    county: string;
    timeZone: string;
    radarStation: string;
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
  };
}

export interface NwsForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string | null;
  probabilityOfPrecipitation: { value: number | null };
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface NwsForecast {
  properties: {
    generatedAt: string;
    updateTime: string;
    periods: NwsForecastPeriod[];
  };
}

export interface NwsAlert {
  id: string;
  properties: {
    event: string;
    severity: string;
    urgency: string;
    certainty: string;
    headline: string;
    description: string;
    instruction: string | null;
    areaDesc: string;
    effective: string;
    expires: string;
    ends: string | null;
    sender: string;
    senderName: string;
  };
}

async function nwsFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/geo+json' },
  });
  if (!res.ok) {
    throw new Error(`NWS ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

const pointCache = new Map<string, Promise<NwsPoint>>();
export async function getPoint(lat: number, lon: number): Promise<NwsPoint> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (!pointCache.has(key)) {
    pointCache.set(key, nwsFetch<NwsPoint>(`${NWS_BASE}/points/${key}`));
  }
  return pointCache.get(key)!;
}

export async function getForecast(lat: number, lon: number): Promise<NwsForecast> {
  const point = await getPoint(lat, lon);
  return nwsFetch<NwsForecast>(point.properties.forecast);
}

export async function getHourlyForecast(lat: number, lon: number): Promise<NwsForecast> {
  const point = await getPoint(lat, lon);
  return nwsFetch<NwsForecast>(point.properties.forecastHourly);
}

export async function getAlerts(lat: number, lon: number): Promise<NwsAlert[]> {
  const res = await nwsFetch<{ features: NwsAlert[] }>(
    `${NWS_BASE}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
  );
  return res.features ?? [];
}

// Map NWS shortForecast to a simple emoji
export function forecastEmoji(shortForecast: string, isDaytime = true): string {
  const s = shortForecast.toLowerCase();
  if (/thunder/.test(s)) return '⛈️';
  if (/\b(hail|sleet)\b/.test(s)) return '🌨️';
  if (/snow/.test(s)) return '❄️';
  if (/\b(rain|shower|drizzle)\b/.test(s)) return '🌧️';
  if (/fog|haze|mist/.test(s)) return '🌫️';
  if (/\bwind/.test(s)) return '💨';
  if (/\b(cloud|overcast)\b/.test(s)) return '☁️';
  if (/partly/.test(s)) return isDaytime ? '⛅' : '🌙';
  if (/\b(sunny|clear|fair)\b/.test(s)) return isDaytime ? '☀️' : '🌜';
  return isDaytime ? '☀️' : '🌙';
}

// Parse "15 to 20 mph" or "10 mph" — returns middle value
export function parseWindSpeed(ws: string): number | null {
  const m = ws.match(/(\d+)(?:\s*to\s*(\d+))?/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return (a + b) / 2;
}
