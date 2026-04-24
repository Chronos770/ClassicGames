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

// Best-effort URL normalizer — accepts either a full WeatherLink URL or just a
// station ID and produces an embed-safe URL when possible.
export function normalizeEmbedUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // Already an embeddable URL
  if (s.includes('weatherlink.com/embeddablePage/')) return s;
  // Bulletin pattern — try to convert to embed page
  const bulletinMatch = s.match(/weatherlink\.com\/bulletin\/([a-f0-9-]+)/i);
  if (bulletinMatch) return `https://www.weatherlink.com/embeddablePage/show/${bulletinMatch[1]}/signature`;
  // Bare token / id
  if (/^[a-f0-9-]{8,}$/i.test(s)) return `https://www.weatherlink.com/embeddablePage/show/${s}/signature`;
  // Anything else, return as-is and let the iframe try
  return s;
}
