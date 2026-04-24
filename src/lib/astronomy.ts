// Pure astronomy helpers — sunrise/sunset and moon phase.
// No external deps; algorithms from NOAA (sun) and Conway-style approximation (moon).

const DEG = Math.PI / 180;

function toJulian(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

function fromJulian(j: number): Date {
  return new Date((j - 2440587.5) * 86400000);
}

function toDays(d: Date): number {
  return toJulian(d) - 2451545;
}

function solarMeanAnomaly(d: number): number {
  return DEG * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  const C = DEG * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = DEG * 102.9372;
  return M + C + P + Math.PI;
}

function sunCoords(d: number): { dec: number; ra: number } {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const e = DEG * 23.4397;
  const dec = Math.asin(Math.sin(0) * Math.cos(e) + Math.cos(0) * Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e) - Math.tan(0) * Math.sin(e), Math.cos(L));
  return { dec, ra };
}

// SunCalc-style transit/setJ calculations.
const J0 = 0.0009;
function julianCycle(d: number, lw: number): number {
  return Math.round(d - J0 - lw / (2 * Math.PI));
}
function approxTransit(Ht: number, lw: number, n: number): number {
  return J0 + (Ht + lw) / (2 * Math.PI) + n;
}
function solarTransitJ(ds: number, M: number, L: number): number {
  return 2451545 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}
function hourAngle(h: number, phi: number, d: number): number {
  return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
}
function getSetJ(h: number, lw: number, phi: number, dec: number, n: number, M: number, L: number): number {
  const w = hourAngle(h, phi, dec);
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  // Fraction 0..1 of the day where the sun currently sits, relative to sunrise..sunset.
  // Null outside daylight.
  dayFraction: number | null;
  isDay: boolean;
}

export function getSunTimes(date: Date, lat: number, lon: number): SunTimes {
  const lw = DEG * -lon;
  const phi = DEG * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);

  const c = sunCoords(ds);
  const Jnoon = solarTransitJ(ds, M, L);
  const h0 = DEG * -0.833;
  let sunrise: Date | null = null;
  let sunset: Date | null = null;
  try {
    const Jset = getSetJ(h0, lw, phi, c.dec, n, M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    sunrise = fromJulian(Jrise);
    sunset = fromJulian(Jset);
  } catch {
    sunrise = null;
    sunset = null;
  }
  const solarNoon = fromJulian(Jnoon);

  let dayFraction: number | null = null;
  let isDay = false;
  if (sunrise && sunset) {
    const now = date.getTime();
    const a = sunrise.getTime();
    const b = sunset.getTime();
    if (now >= a && now <= b) {
      dayFraction = (now - a) / (b - a);
      isDay = true;
    }
  }
  return { sunrise, sunset, solarNoon, dayFraction, isDay };
}

// ---- Moon phase ----
// Returns 0..1 where 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter.
export function getMoonPhase(date: Date): number {
  // Reference new moon: 2000-01-06 18:14 UT (JDE 2451550.26)
  const synodicMonth = 29.53058867;
  const jd = toJulian(date);
  const age = (jd - 2451550.26) % synodicMonth;
  const phase = age < 0 ? (age + synodicMonth) / synodicMonth : age / synodicMonth;
  return phase;
}

export function moonPhaseName(phase: number): string {
  if (phase < 0.03 || phase >= 0.97) return 'New Moon';
  if (phase < 0.22) return 'Waxing Crescent';
  if (phase < 0.28) return 'First Quarter';
  if (phase < 0.47) return 'Waxing Gibbous';
  if (phase < 0.53) return 'Full Moon';
  if (phase < 0.72) return 'Waning Gibbous';
  if (phase < 0.78) return 'Last Quarter';
  return 'Waning Crescent';
}

export function moonPhaseEmoji(phase: number): string {
  if (phase < 0.03 || phase >= 0.97) return '\u{1F311}'; // new
  if (phase < 0.22) return '\u{1F312}'; // waxing crescent
  if (phase < 0.28) return '\u{1F313}'; // first quarter
  if (phase < 0.47) return '\u{1F314}'; // waxing gibbous
  if (phase < 0.53) return '\u{1F315}'; // full
  if (phase < 0.72) return '\u{1F316}'; // waning gibbous
  if (phase < 0.78) return '\u{1F317}'; // last quarter
  return '\u{1F318}'; // waning crescent
}

// Illumination fraction (0 = new, 1 = full).
export function moonIllumination(phase: number): number {
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}
