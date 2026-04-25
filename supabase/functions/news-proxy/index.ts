// Supabase Edge Function: news-proxy
//
// Fetches YouTube uploads RSS feeds for a list of channels and returns the
// latest videos as a flat JSON array. YouTube's per-channel feed is public
// and key-free, but doesn't send CORS headers — so the browser can't fetch
// it directly. This proxy does the fetch server-side.
//
// Request body:
//   { sources: [{ kind: 'youtube', handle: '@stefanburns' | channelId: 'UCxxx' }],
//     perChannel?: number,    // max videos per channel (default 3)
//     overall?: number }      // hard cap on total videos returned (default 30)
//
// Response:
//   { videos: [{ source: {...}, videoId, title, publishedAt, thumbnail,
//                channelTitle, channelHandle }] }

// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// In-memory cache of resolved @handle → channel_id. Persists for the life
// of a warm edge function instance, so repeat callers don't re-hit YouTube
// to look up the same handle.
const handleCache = new Map<string, string>();

async function resolveHandleToChannelId(handle: string): Promise<string | null> {
  const cleaned = handle.startsWith('@') ? handle : `@${handle}`;
  if (handleCache.has(cleaned)) return handleCache.get(cleaned)!;

  try {
    const res = await fetch(`https://www.youtube.com/${cleaned}`, {
      // Use a real-looking UA — YouTube serves a stripped page to non-browser
      // UAs which sometimes lacks the canonical link / itemprop tags.
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    // IMPORTANT: try the page's *authoritative* channel id sources first.
    // "channelId":"UCxxx" appears all over the HTML — including in the
    // sidebar recommendations — so naively matching the first occurrence
    // can return a totally different (related) channel. The canonical link
    // and meta itemprop tags always reflect the page's own channel.
    const m =
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{10,})"/) ??
      html.match(/<meta itemprop="identifier" content="(UC[\w-]{10,})"/) ??
      html.match(/"externalId":"(UC[\w-]{10,})"/) ??
      html.match(/"channelId":"(UC[\w-]{10,})"/);
    if (m) {
      handleCache.set(cleaned, m[1]);
      return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

interface ParsedVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  channelTitle: string;
}

function parseFeed(xml: string): ParsedVideo[] {
  const out: ParsedVideo[] = [];
  // First <author><name>…</name> tag is the channel name (outside any entry).
  const channelTitleMatch = xml.match(
    /<author>\s*<name>([^<]+)<\/name>/,
  );
  const channelTitle = channelTitleMatch?.[1] ?? '';

  const entryRe = /<entry>([\s\S]+?)<\/entry>/g;
  for (const m of xml.matchAll(entryRe)) {
    const body = m[1];
    const videoId = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = body.match(/<title>([^<]+)<\/title>/)?.[1];
    const published = body.match(/<published>([^<]+)<\/published>/)?.[1];
    const thumb = body.match(/<media:thumbnail\s+url="([^"]+)"/)?.[1];
    if (!videoId || !title) continue;
    out.push({
      videoId,
      title,
      publishedAt: published ?? '',
      thumbnail: thumb ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle,
    });
  }
  return out;
}

interface SourceIn {
  kind: string;
  handle?: string;
  channelId?: string;
  label?: string;
  id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const sources: SourceIn[] = Array.isArray(body?.sources) ? body.sources : [];
  const perChannel = Number(body?.perChannel ?? 3);
  const overallCap = Number(body?.overall ?? 30);

  if (sources.length === 0) {
    return new Response(JSON.stringify({ videos: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  type Out = ParsedVideo & { source: SourceIn; channelHandle: string };
  const all: Out[] = [];

  await Promise.all(
    sources.map(async (s) => {
      if (s.kind !== 'youtube') return;
      let channelId = s.channelId ?? null;
      const handle = s.handle ?? '';
      if (!channelId && handle) {
        channelId = await resolveHandleToChannelId(handle);
      }
      if (!channelId) return;
      try {
        const feedRes = await fetch(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ClassicGamesWeather/1.0)' } },
        );
        if (!feedRes.ok) return;
        const xml = await feedRes.text();
        const videos = parseFeed(xml).slice(0, perChannel);
        for (const v of videos) {
          all.push({ ...v, source: s, channelHandle: handle });
        }
      } catch {
        // ignore individual feed failures so one bad source doesn't kill the rest
      }
    }),
  );

  // Newest first, capped.
  all.sort((a, b) => (b.publishedAt > a.publishedAt ? 1 : -1));
  const trimmed = all.slice(0, overallCap);

  return new Response(
    JSON.stringify({ videos: trimmed, count: trimmed.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
