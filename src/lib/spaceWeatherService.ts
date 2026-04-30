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

// Plain-English label for any NOAA scale value (G/S/R, 0-5).
export function scaleLabel(v: number): { label: string; tone: string } {
  if (v <= 0) return { label: 'All clear', tone: 'text-emerald-300' };
  if (v === 1) return { label: 'Minor', tone: 'text-yellow-300' };
  if (v === 2) return { label: 'Moderate', tone: 'text-amber-300' };
  if (v === 3) return { label: 'Strong', tone: 'text-orange-300' };
  if (v === 4) return { label: 'Severe', tone: 'text-red-300' };
  return { label: 'Extreme', tone: 'text-fuchsia-300' };
}

// Plain-English flare activity label from raw X-ray flux.
export function flareActivity(flux: number | null): { label: string; tone: string } {
  if (flux === null || !Number.isFinite(flux) || flux <= 0)
    return { label: 'No data', tone: 'text-white/50' };
  if (flux < 1e-6) return { label: 'Quiet sun', tone: 'text-emerald-300' };
  if (flux < 1e-5) return { label: 'Mild flare activity', tone: 'text-amber-300' };
  if (flux < 1e-4) return { label: 'Moderate flare — possible radio impact', tone: 'text-red-300' };
  return { label: 'Major flare in progress!', tone: 'text-fuchsia-300' };
}

// Plain-English solar-wind summary based on speed + Bz.
export function solarWindActivity(
  speed: number | null,
  bz: number | null,
): { label: string; tone: string } {
  if (speed === null || !Number.isFinite(speed)) return { label: 'No data', tone: 'text-white/50' };
  const fast = speed > 600;
  const veryFast = speed > 800;
  const stronglyNeg = bz !== null && bz < -10;
  const slightlyNeg = bz !== null && bz < -5;
  if (veryFast || (fast && stronglyNeg))
    return { label: 'CME impact — strong aurora driver', tone: 'text-fuchsia-300' };
  if (fast && slightlyNeg) return { label: 'Fast & aurora-friendly', tone: 'text-amber-300' };
  if (fast) return { label: 'Fast wind', tone: 'text-amber-300' };
  if (stronglyNeg) return { label: 'Aurora-friendly magnetism', tone: 'text-amber-300' };
  if (speed < 350) return { label: 'Calm wind', tone: 'text-emerald-300' };
  return { label: 'Normal', tone: 'text-emerald-300' };
}

// Plain-English sunspot activity from sunspot number.
export function sunspotActivity(ssn: number | null): { label: string; tone: string } {
  if (ssn === null || !Number.isFinite(ssn)) return { label: 'No data', tone: 'text-white/50' };
  if (ssn === 0) return { label: 'No sunspots', tone: 'text-emerald-300' };
  if (ssn < 50) return { label: 'Low activity', tone: 'text-emerald-300' };
  if (ssn < 100) return { label: 'Moderate activity', tone: 'text-amber-300' };
  if (ssn < 150) return { label: 'High activity', tone: 'text-orange-300' };
  return { label: 'Very active sun', tone: 'text-red-300' };
}

// Try to derive a friendly title for an SWPC alert from its message body.
// The message starts with metadata then has a SUMMARY: line — we extract it
// when present, else fall back to a code-prefix lookup.
export function alertSummary(productId: string, message: string): string {
  const sumMatch = message.match(/SUMMARY:\s*(.+)/i);
  if (sumMatch) return sumMatch[1].trim();
  const code = productId.toUpperCase();
  if (code.startsWith('ALTPC')) return 'Proton (radiation) alert';
  if (code.startsWith('ALTK')) return 'Geomagnetic Kp alert';
  if (code.startsWith('ALTEF')) return 'High-energy electron alert';
  if (code.startsWith('ALTXM') || code.startsWith('ALTX')) return 'X-ray flare alert';
  if (code.startsWith('ALTTP')) return 'Type-II radio sweep alert';
  if (code.startsWith('WARK')) return 'Kp warning';
  if (code.startsWith('WATA')) return 'Geomagnetic storm watch';
  if (code.startsWith('SUMK')) return 'Kp summary';
  if (code.startsWith('SUM')) return 'Event summary';
  if (code.startsWith('FOR')) return 'Forecast update';
  return code;
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
export const SDO_IMAGES: {
  id: string;
  label: string;
  url: string;
  description: string;
  // Helioviewer source ID for the same wavelength/instrument, used by
  // the timelapse player on the Space tab to fetch historic frames.
  helioviewerSourceId: number;
}[] = [
  {
    id: '193',
    label: '193 Å',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg',
    description: 'Corona — hot active regions and flares',
    helioviewerSourceId: 13, // SDO/AIA/193
  },
  {
    id: '304',
    label: '304 Å',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0304.jpg',
    description: 'Chromosphere — prominences and filaments',
    helioviewerSourceId: 15, // SDO/AIA/304
  },
  {
    id: 'HMIIF',
    label: 'Visible',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIF.jpg',
    description: 'Sunspots in visible light',
    helioviewerSourceId: 20, // SDO/HMI continuum
  },
  {
    id: 'HMIB',
    label: 'Magnetogram',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIB.jpg',
    description: 'Surface magnetic polarity',
    helioviewerSourceId: 21, // SDO/HMI magnetogram
  },
];

// Builds a Helioviewer takeScreenshot URL for a single SDO layer at a
// specific instant. The endpoint returns a rendered PNG directly when
// display=true, so we can plug it straight into an <img src=...>.
//
// Param values mirror Helioviewer's official sample request:
//   imageScale = 2.4204409 (their "natural" arcsec/pixel for SDO at full
//                          disk; substituting 2.4 yielded blank PNGs)
//   x0 / y0    = 0          (center the field of view; required, defaults
//                          aren't applied if omitted)
//   date       = ISO without milliseconds (some Helioviewer params reject
//                                          fractional seconds)
export function helioviewerImageUrl(sourceId: number, when: Date): string {
  const iso = when.toISOString().replace(/\.\d+Z$/, 'Z'); // strip ms
  const params = new URLSearchParams({
    date: iso,
    imageScale: '2.4204409',
    layers: `[${sourceId},1,100]`,
    events: '',
    eventLabels: 'false',
    scale: 'false',
    scaleType: 'earth',
    scaleX: '0',
    scaleY: '0',
    x0: '0',
    y0: '0',
    width: '512',
    height: '512',
    watermark: 'false',
    display: 'true',
  });
  return `https://api.helioviewer.org/v2/takeScreenshot/?${params.toString()}`;
}
