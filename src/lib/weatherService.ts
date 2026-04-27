import { supabase } from './supabase';

export interface WeatherStation {
  station_id: number;
  station_id_uuid: string | null;
  station_name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  time_zone: string | null;
  gateway_type: string | null;
  product_number: string | null;
  subscription_type: string | null;
  recording_interval: number | null;
  firmware_version: string | null;
  registered_date: string | null;
  last_ingested_at: string | null;
}

export interface WeatherReading {
  id: number;
  station_id: number;
  observed_at: string;

  temp: number | null;
  hum: number | null;
  dew_point: number | null;
  wet_bulb: number | null;
  heat_index: number | null;
  wind_chill: number | null;
  thw_index: number | null;
  thsw_index: number | null;
  wbgt: number | null;

  wind_speed_last: number | null;
  wind_dir_last: number | null;
  wind_speed_avg_last_1_min: number | null;
  wind_speed_avg_last_2_min: number | null;
  wind_speed_avg_last_10_min: number | null;
  wind_speed_hi_last_2_min: number | null;
  wind_speed_hi_last_10_min: number | null;
  wind_dir_scalar_avg_last_1_min: number | null;
  wind_dir_scalar_avg_last_2_min: number | null;
  wind_dir_scalar_avg_last_10_min: number | null;
  wind_dir_at_hi_speed_last_2_min: number | null;
  wind_dir_at_hi_speed_last_10_min: number | null;
  wind_run_day: number | null;

  rainfall_last_15_min_in: number | null;
  rainfall_last_60_min_in: number | null;
  rainfall_last_24_hr_in: number | null;
  rainfall_day_in: number | null;
  rainfall_month_in: number | null;
  rainfall_year_in: number | null;
  rain_rate_last_in: number | null;
  rain_rate_hi_in: number | null;
  rain_rate_hi_last_15_min_in: number | null;
  rain_storm_current_in: number | null;
  rain_storm_last_in: number | null;
  rain_storm_current_start_at: string | null;
  rain_storm_last_start_at: string | null;
  rain_storm_last_end_at: string | null;

  solar_rad: number | null;
  solar_energy_day: number | null;
  uv_index: number | null;
  uv_dose_day: number | null;

  temp_in: number | null;
  hum_in: number | null;
  dew_point_in: number | null;
  heat_index_in: number | null;
  wet_bulb_in: number | null;

  bar_sea_level: number | null;
  bar_absolute: number | null;
  bar_trend: number | null;

  hdd_day: number | null;
  cdd_day: number | null;
  et_day: number | null;
  et_month: number | null;
  et_year: number | null;

  trans_battery_volt: number | null;
  trans_battery_flag: number | null;
  rssi_last: number | null;
  reception_day: number | null;
  battery_percent: number | null;
  battery_voltage: number | null;
  wifi_rssi: number | null;
  console_sw_version: string | null;
}

export interface IngestResult {
  station_id: number;
  ok: boolean;
  observed_at?: string;
  error?: string;
}

export async function getStations(): Promise<WeatherStation[]> {
  const { data, error } = await supabase
    .from('weather_stations')
    .select('*')
    .order('station_name');
  if (error) throw error;
  return (data as WeatherStation[]) ?? [];
}

export async function getLatestReading(stationId: number): Promise<WeatherReading | null> {
  const { data, error } = await supabase
    .from('weather_readings')
    .select('*')
    .eq('station_id', stationId)
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as WeatherReading) ?? null;
}

export async function getReadingsRange(
  stationId: number,
  fromIso: string,
  toIso: string,
  columns = '*',
): Promise<WeatherReading[]> {
  // Supabase / PostgREST caps a single response at 1000 rows by default,
  // which silently truncated long history pulls (1y / All) to 1000 readings.
  // Page through the range in CHUNK_SIZE-row windows until we get a short
  // page, accumulating everything client-side so the chart, table, and
  // summary all see the full row set.
  const CHUNK_SIZE = 1000;
  const all: WeatherReading[] = [];
  // Hard ceiling — at our 15-min ingest cadence, 200k rows is ~5.7 years of
  // data. If we ever exceed this we're paging forever and something's wrong.
  const HARD_CAP = 200_000;
  let from = 0;

  while (from < HARD_CAP) {
    const to = from + CHUNK_SIZE - 1;
    const { data, error } = await supabase
      .from('weather_readings')
      .select(columns)
      .eq('station_id', stationId)
      .gte('observed_at', fromIso)
      .lte('observed_at', toIso)
      .order('observed_at', { ascending: true })
      .range(from, to);
    if (error) throw error;
    const rows = (data as unknown as WeatherReading[]) ?? [];
    all.push(...rows);
    if (rows.length < CHUNK_SIZE) break; // last page
    from += CHUNK_SIZE;
  }
  return all;
}

export async function triggerIngest(): Promise<{ ingested_at: string; results: IngestResult[] }> {
  const { data, error } = await supabase.functions.invoke('ingest-weather', { body: {} });
  if (error) throw error;
  return data as { ingested_at: string; results: IngestResult[] };
}

export interface DiscoveredStation extends WeatherStation {
  new: boolean;
}

export interface DiscoverResult {
  discovered_at: string;
  total: number;
  new_count: number;
  stations: DiscoveredStation[];
}

export async function discoverStations(): Promise<DiscoverResult> {
  const { data, error } = await supabase.functions.invoke('discover-weather-stations', { body: {} });
  if (error) throw error;
  return data as DiscoverResult;
}

// Helpers for display
export function fmtTemp(f: number | null, digits = 1): string {
  return f === null || f === undefined ? '--' : `${f.toFixed(digits)}°F`;
}
export function fmtPct(v: number | null, digits = 0): string {
  return v === null || v === undefined ? '--' : `${v.toFixed(digits)}%`;
}
export function fmtMph(v: number | null, digits = 1): string {
  return v === null || v === undefined ? '--' : `${v.toFixed(digits)} mph`;
}
export function fmtIn(v: number | null, digits = 2): string {
  return v === null || v === undefined ? '--' : `${v.toFixed(digits)}"`;
}
export function fmtInHg(v: number | null, digits = 3): string {
  return v === null || v === undefined ? '--' : `${v.toFixed(digits)} inHg`;
}
export function fmtInt(v: number | null): string {
  return v === null || v === undefined ? '--' : `${Math.round(v)}`;
}
export function compassFromDegrees(deg: number | null): string {
  if (deg === null || deg === undefined) return '--';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[idx];
}
export function barTrendLabel(v: number | null): string {
  if (v === null || v === undefined) return 'Steady';
  if (v > 0.06) return 'Rising Rapidly';
  if (v > 0.02) return 'Rising';
  if (v < -0.06) return 'Falling Rapidly';
  if (v < -0.02) return 'Falling';
  return 'Steady';
}
export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
