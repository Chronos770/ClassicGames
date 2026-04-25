import { supabase } from './supabase';

export interface KpPoint {
  time: string;
  kp: number;
}

export interface SwPlasmaPoint {
  time: string;
  density: number;
  speed: number;
  temperature: number;
}

export interface SwMagPoint {
  time: string;
  bz: number;
  bt: number;
}

export interface XrayPoint {
  time: string;
  flux: number;
}

export interface SpwAlert {
  issued: string;
  product_id: string;
  message: string;
}

export interface NoaaScales {
  G: number;
  S: number;
  R: number;
}

export interface SpaceWeatherSnapshot {
  fetched_at: string;
  kp: {
    current: number | null;
    recent: KpPoint[];
    forecast: any | null;
  };
  solar_wind: {
    plasma_recent: SwPlasmaPoint[];
    mag_recent: SwMagPoint[];
    latest: {
      density: number | null;
      speed: number | null;
      temperature: number | null;
      bz: number | null;
      bt: number | null;
    };
  };
  xray: {
    latest_flux: number | null;
    recent: XrayPoint[];
  };
  alerts: SpwAlert[];
  scales: NoaaScales | null;
  sunspots: {
    latest: any | null;
    active_regions_count: number;
  };
  three_day_headlines: string[];
}

export async function fetchSpaceWeather(): Promise<SpaceWeatherSnapshot> {
  const { data, error } = await supabase.functions.invoke('space-weather-proxy', { body: {} });
  if (error) throw error;
  return data as SpaceWeatherSnapshot;
}

// X-ray flux to NOAA flare class (A/B/C/M/X). Each class is 10x the previous.
//   A: < 1e-7 W/m^2
//   B: 1e-7 to 1e-6
//   C: 1e-6 to 1e-5
//   M: 1e-5 to 1e-4
//   X: >= 1e-4
export function flareClass(flux: number | null): { letter: string; magnitude: string } {
  if (flux === null || !Number.isFinite(flux) || flux <= 0) {
    return { letter: '—', magnitude: '' };
  }
  let letter = 'A';
  let scale = 1e-8;
  if (flux >= 1e-4) {
    letter = 'X';
    scale = 1e-4;
  } else if (flux >= 1e-5) {
    letter = 'M';
    scale = 1e-5;
  } else if (flux >= 1e-6) {
    letter = 'C';
    scale = 1e-6;
  } else if (flux >= 1e-7) {
    letter = 'B';
    scale = 1e-7;
  }
  const mag = (flux / scale).toFixed(1);
  return { letter, magnitude: mag };
}

// Translate Kp to plain-English geomagnetic activity description.
export function kpDescription(kp: number | null): { label: string; tone: string } {
  if (kp === null || !Number.isFinite(kp)) return { label: '—', tone: 'text-white/50' };
  if (kp < 4) return { label: 'Quiet', tone: 'text-emerald-300' };
  if (kp < 5) return { label: 'Unsettled', tone: 'text-amber-300' };
  if (kp < 6) return { label: 'Minor storm (G1)', tone: 'text-orange-300' };
  if (kp < 7) return { label: 'Moderate storm (G2)', tone: 'text-orange-400' };
  if (kp < 8) return { label: 'Strong storm (G3)', tone: 'text-red-400' };
  if (kp < 9) return { label: 'Severe storm (G4)', tone: 'text-red-500' };
  return { label: 'Extreme storm (G5)', tone: 'text-fuchsia-400' };
}

// Rough aurora visibility verdict for a given latitude. Kp roughly maps to
// the equatorward edge of visible aurora (degrees magnetic latitude). This
// is an approximation suitable for "is it worth looking outside?" decisions,
// not navigation.
export function auroraVisible(lat: number | null, kp: number | null): {
  verdict: 'unlikely' | 'possible' | 'likely' | 'overhead';
  threshold: number;
} {
  if (lat === null || kp === null) return { verdict: 'unlikely', threshold: 0 };
  const absLat = Math.abs(lat);
  // Equatorward edge of typical aurora visibility, by Kp:
  // Kp 0 → ~67° geomag, Kp 9 → ~50° geomag. Linear-ish.
  const edge = 67 - kp * 1.9;
  const overhead = edge - 5;
  if (absLat >= overhead) return { verdict: 'overhead', threshold: edge };
  if (absLat >= edge) return { verdict: 'likely', threshold: edge };
  if (absLat >= edge - 5) return { verdict: 'possible', threshold: edge };
  return { verdict: 'unlikely', threshold: edge };
}

// Public SDO (Solar Dynamics Observatory) image URLs. These are static
// daily/hourly images NASA serves with an open Access-Control-Allow-Origin
// header, so we can <img> them directly.
export const SDO_IMAGES: { id: string; label: string; url: string; description: string }[] = [
  {
    id: '193',
    label: '193 Å',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg',
    description: 'Corona — hot active regions and flares',
  },
  {
    id: '304',
    label: '304 Å',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0304.jpg',
    description: 'Chromosphere — prominences and filaments',
  },
  {
    id: 'HMIIF',
    label: 'Visible',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIF.jpg',
    description: 'Sunspots in visible light',
  },
  {
    id: 'HMIB',
    label: 'Magnetogram',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIB.jpg',
    description: 'Surface magnetic polarity',
  },
];
