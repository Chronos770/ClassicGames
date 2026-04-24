import { supabase } from './supabase';

export interface RemoteStation {
  id: string;
  user_id: string;
  name: string;
  embed_url: string | null;
  latitude: number;
  longitude: number;
  region: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RemoteStationInput {
  name: string;
  embed_url?: string | null;
  latitude: number;
  longitude: number;
  region?: string | null;
  notes?: string | null;
}

export async function listRemoteStations(): Promise<RemoteStation[]> {
  const { data, error } = await supabase
    .from('weather_remote_stations')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as RemoteStation[]) ?? [];
}

export async function addRemoteStation(input: RemoteStationInput): Promise<RemoteStation> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error('Not signed in');
  const row = {
    user_id: userData.user.id,
    name: input.name.trim(),
    embed_url: input.embed_url?.trim() || null,
    latitude: input.latitude,
    longitude: input.longitude,
    region: input.region?.trim() || null,
    notes: input.notes?.trim() || null,
  };
  const { data, error } = await supabase
    .from('weather_remote_stations')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as RemoteStation;
}

export async function updateRemoteStation(
  id: string,
  patch: Partial<RemoteStationInput> & { sort_order?: number },
): Promise<RemoteStation> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.embed_url !== undefined) update.embed_url = patch.embed_url?.trim() || null;
  if (patch.latitude !== undefined) update.latitude = patch.latitude;
  if (patch.longitude !== undefined) update.longitude = patch.longitude;
  if (patch.region !== undefined) update.region = patch.region?.trim() || null;
  if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
  if (patch.sort_order !== undefined) update.sort_order = patch.sort_order;

  const { data, error } = await supabase
    .from('weather_remote_stations')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as RemoteStation;
}

export async function deleteRemoteStation(id: string): Promise<void> {
  const { error } = await supabase.from('weather_remote_stations').delete().eq('id', id);
  if (error) throw error;
}

// WeatherLink offers two shareable URLs per station:
//   1. "Station URL" / Bulletin — weatherlink.com/bulletin/<token>. Always
//      generated when the station is public; whether it iframes depends on
//      WeatherLink's X-Frame-Options on that page.
//   2. "Station Embed" — generated via the wrench icon → Device → Station
//      Embed dialog on weatherlink.com. This is the URL designed for iframe
//      embedding.
// We just pass through whatever the user pastes; trying to "transform"
// between the two formats was speculation on my part. If the URL doesn't
// iframe, the card shows a graceful fallback with an "open in new tab" link.
export function normalizeEmbedUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // If they pasted just a token, default-prefix to the bulletin URL — most
  // common case and at minimum opens in a new tab as a sane fallback.
  if (/^[a-f0-9-]{20,}$/i.test(s)) return `https://www.weatherlink.com/bulletin/${s}`;
  return s;
}
