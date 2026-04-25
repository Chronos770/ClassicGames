import { supabase } from './supabase';

export interface NewsSource {
  id: string;
  user_id: string | null;
  kind: 'youtube';
  handle: string;
  label: string | null;
  sort_order: number;
}

export interface NewsVideo {
  source: { id?: string; kind: string; handle?: string; channelId?: string; label?: string };
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  channelTitle: string;
  channelHandle: string;
}

// Normalize whatever the user pasted into a clean @handle. Accepts:
//   @stefanburns
//   stefanburns
//   https://www.youtube.com/@stefanburns
//   https://youtube.com/@stefanburns?si=...
//   https://www.youtube.com/c/stefanburns (legacy)
//   https://www.youtube.com/channel/UCxxx (we keep the UCxxx as-is)
export function normalizeYouTubeInput(raw: string): { handle?: string; channelId?: string } | null {
  const s = raw.trim();
  if (!s) return null;
  // Direct channel ID URL
  const chMatch = s.match(/youtube\.com\/channel\/(UC[\w-]{10,})/i);
  if (chMatch) return { channelId: chMatch[1] };
  // Bare channel ID
  if (/^UC[\w-]{10,}$/.test(s)) return { channelId: s };
  // @handle in a URL (with query string allowed)
  const atUrl = s.match(/youtube\.com\/(?:@)?([@\w.-]+?)(?:[/?]|$)/i);
  if (atUrl) {
    let h = atUrl[1];
    if (!h.startsWith('@')) h = `@${h.replace(/^c\//, '')}`;
    return { handle: h };
  }
  // Bare @handle
  if (/^@?[\w.-]+$/.test(s)) {
    const h = s.startsWith('@') ? s : `@${s}`;
    return { handle: h };
  }
  return null;
}

export async function listNewsSources(): Promise<NewsSource[]> {
  const { data, error } = await supabase
    .from('weather_news_sources')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as NewsSource[]) ?? [];
}

export async function addNewsSource(input: {
  handle: string;
  label?: string | null;
}): Promise<NewsSource> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error('Not signed in');
  const row = {
    user_id: userData.user.id,
    kind: 'youtube',
    handle: input.handle.trim(),
    label: input.label?.trim() || null,
  };
  const { data, error } = await supabase
    .from('weather_news_sources')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as NewsSource;
}

export async function deleteNewsSource(id: string): Promise<void> {
  const { error } = await supabase.from('weather_news_sources').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchNewsVideos(
  sources: { id?: string; kind: string; handle: string; label?: string | null }[],
  perChannel = 3,
  overall = 30,
): Promise<NewsVideo[]> {
  if (sources.length === 0) return [];
  const { data, error } = await supabase.functions.invoke('news-proxy', {
    body: { sources, perChannel, overall },
  });
  if (error) throw error;
  return ((data as { videos: NewsVideo[] })?.videos ?? []);
}
