import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TempUnit = 'F' | 'C';
export type WindUnit = 'mph' | 'kph' | 'kt' | 'ms';
export type PressureUnit = 'inHg' | 'hPa' | 'mb';
export type PrecipUnit = 'in' | 'mm';
export type DistanceUnit = 'mi' | 'km';

interface UnitsState {
  temp: TempUnit;
  wind: WindUnit;
  pressure: PressureUnit;
  precip: PrecipUnit;
  distance: DistanceUnit;
  setTemp: (u: TempUnit) => void;
  setWind: (u: WindUnit) => void;
  setPressure: (u: PressureUnit) => void;
  setPrecip: (u: PrecipUnit) => void;
  setDistance: (u: DistanceUnit) => void;
  toggleTemp: () => void;
  cycleWind: () => void;
  cyclePressure: () => void;
  togglePrecip: () => void;
  toggleDistance: () => void;
}

export const useWeatherUnitsStore = create<UnitsState>()(
  persist(
    (set) => ({
      temp: 'F',
      wind: 'mph',
      pressure: 'inHg',
      precip: 'in',
      distance: 'mi',
      setTemp: (u) => set({ temp: u }),
      setWind: (u) => set({ wind: u }),
      setPressure: (u) => set({ pressure: u }),
      setPrecip: (u) => set({ precip: u }),
      setDistance: (u) => set({ distance: u }),
      toggleTemp: () => set((s) => ({ temp: s.temp === 'F' ? 'C' : 'F' })),
      cycleWind: () =>
        set((s) => {
          const order: WindUnit[] = ['mph', 'kph', 'kt', 'ms'];
          return { wind: order[(order.indexOf(s.wind) + 1) % order.length] };
        }),
      cyclePressure: () =>
        set((s) => {
          const order: PressureUnit[] = ['inHg', 'hPa', 'mb'];
          return { pressure: order[(order.indexOf(s.pressure) + 1) % order.length] };
        }),
      togglePrecip: () => set((s) => ({ precip: s.precip === 'in' ? 'mm' : 'in' })),
      toggleDistance: () => set((s) => ({ distance: s.distance === 'mi' ? 'km' : 'mi' })),
    }),
    { name: 'weather-units' },
  ),
);

// --- Conversions (input values are assumed to be F / mph / inHg / in / mi) ---

export function convertTemp(f: number | null, to: TempUnit): number | null {
  if (f === null || f === undefined) return null;
  return to === 'F' ? f : ((f - 32) * 5) / 9;
}

export function convertWind(mph: number | null, to: WindUnit): number | null {
  if (mph === null || mph === undefined) return null;
  switch (to) {
    case 'mph': return mph;
    case 'kph': return mph * 1.609344;
    case 'kt':  return mph * 0.868976;
    case 'ms':  return mph * 0.44704;
  }
}

export function convertPressure(inHg: number | null, to: PressureUnit): number | null {
  if (inHg === null || inHg === undefined) return null;
  switch (to) {
    case 'inHg': return inHg;
    case 'hPa':
    case 'mb':   return inHg * 33.8639;
  }
}

export function convertPrecip(inches: number | null, to: PrecipUnit): number | null {
  if (inches === null || inches === undefined) return null;
  return to === 'in' ? inches : inches * 25.4;
}

export function convertDistance(miles: number | null, to: DistanceUnit): number | null {
  if (miles === null || miles === undefined) return null;
  return to === 'mi' ? miles : miles * 1.609344;
}

// --- Hook returning unit-aware formatters. Components that display measurements
// should use this so they re-render on unit change. ---

export interface UnitFormatters {
  fmtTemp: (f: number | null, digits?: number) => string;
  fmtTempNum: (f: number | null, digits?: number) => string; // no unit suffix
  fmtWind: (mph: number | null, digits?: number) => string;
  fmtWindNum: (mph: number | null, digits?: number) => string;
  fmtPressure: (inHg: number | null, digits?: number) => string;
  fmtPrecip: (inches: number | null, digits?: number) => string;
  fmtPrecipRate: (inchesPerHr: number | null, digits?: number) => string;
  fmtDistance: (miles: number | null, digits?: number) => string;
  tempUnit: TempUnit;
  windUnit: WindUnit;
  pressureUnit: PressureUnit;
  precipUnit: PrecipUnit;
  distanceUnit: DistanceUnit;
  tempUnitLabel: string;
  windUnitLabel: string;
  pressureUnitLabel: string;
  precipUnitLabel: string;
  distanceUnitLabel: string;
  // raw converters for charts etc
  toTemp: (f: number | null) => number | null;
  toWind: (mph: number | null) => number | null;
  toPressure: (inHg: number | null) => number | null;
  toPrecip: (inches: number | null) => number | null;
}

export function useUnitFormatters(): UnitFormatters {
  const temp = useWeatherUnitsStore((s) => s.temp);
  const wind = useWeatherUnitsStore((s) => s.wind);
  const pressure = useWeatherUnitsStore((s) => s.pressure);
  const precip = useWeatherUnitsStore((s) => s.precip);
  const distance = useWeatherUnitsStore((s) => s.distance);

  const windLabel = wind === 'ms' ? 'm/s' : wind;

  return {
    tempUnit: temp,
    windUnit: wind,
    pressureUnit: pressure,
    precipUnit: precip,
    distanceUnit: distance,
    tempUnitLabel: `°${temp}`,
    windUnitLabel: windLabel,
    pressureUnitLabel: pressure,
    precipUnitLabel: precip === 'in' ? '"' : 'mm',
    distanceUnitLabel: distance,

    fmtTemp: (f, digits = 1) => {
      const v = convertTemp(f, temp);
      return v === null ? '--' : `${v.toFixed(digits)}°${temp}`;
    },
    fmtTempNum: (f, digits = 1) => {
      const v = convertTemp(f, temp);
      return v === null ? '--' : v.toFixed(digits);
    },
    fmtWind: (mph, digits = 1) => {
      const v = convertWind(mph, wind);
      return v === null ? '--' : `${v.toFixed(digits)} ${windLabel}`;
    },
    fmtWindNum: (mph, digits = 1) => {
      const v = convertWind(mph, wind);
      return v === null ? '--' : v.toFixed(digits);
    },
    fmtPressure: (inHg, digits) => {
      const v = convertPressure(inHg, pressure);
      if (v === null) return '--';
      const d = digits ?? (pressure === 'inHg' ? 3 : 1);
      return `${v.toFixed(d)} ${pressure}`;
    },
    fmtPrecip: (inches, digits = 2) => {
      const v = convertPrecip(inches, precip);
      if (v === null) return '--';
      if (precip === 'in') return `${v.toFixed(digits)}"`;
      return `${v.toFixed(digits === 2 ? 1 : digits)} mm`;
    },
    fmtPrecipRate: (inchesPerHr, digits = 2) => {
      const v = convertPrecip(inchesPerHr, precip);
      if (v === null) return '--';
      if (precip === 'in') return `${v.toFixed(digits)} "/hr`;
      return `${v.toFixed(digits === 2 ? 1 : digits)} mm/hr`;
    },
    fmtDistance: (miles, digits = 1) => {
      const v = convertDistance(miles, distance);
      return v === null ? '--' : `${v.toFixed(digits)} ${distance}`;
    },
    toTemp: (f) => convertTemp(f, temp),
    toWind: (mph) => convertWind(mph, wind),
    toPressure: (inHg) => convertPressure(inHg, pressure),
    toPrecip: (inches) => convertPrecip(inches, precip),
  };
}
