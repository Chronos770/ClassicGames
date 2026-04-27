import { useEffect, useState } from 'react';
import {
  addNewsSource,
  deleteNewsSource,
  fetchNewsVideos,
  listNewsSources,
  normalizeYouTubeInput,
  type NewsSource,
  type NewsVideo,
} from '../../lib/newsService';

interface Props {
  tick: number;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export default function NewsTab({ tick }: Props) {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [videos, setVideos] = useState<NewsVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listNewsSources();
      setSources(list);
      if (list.length > 0) {
        // Pull a few more per channel so an active uploader can dominate the
        // top of the feed without being capped artificially.
        const vids = await fetchNewsVideos(
          list.map((s) => ({ id: s.id, kind: s.kind, handle: s.handle, label: s.label })),
          5,
          50,
        );
        setVideos(vids);
      } else {
        setVideos([]);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const handleAdd = async () => {
    const norm = normalizeYouTubeInput(addInput);
    if (!norm) {
      setError('Could not understand that input. Paste a YouTube URL or @handle.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // For now we only persist by handle. Channel-ID-only URLs get stored
      // with the UCxxx as the "handle" — the proxy treats either form fine.
      const handle = norm.handle ?? norm.channelId!;
      await addNewsSource({ handle, label: addLabel || null });
      setAddInput('');
      setAddLabel('');
      setAdding(false);
      await loadAll();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (s: NewsSource) => {
    if (s.user_id === null) return; // can't delete a global default
    setBusy(true);
    try {
      await deleteNewsSource(s.id);
      await loadAll();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Weather News</h1>
          <p className="text-xs text-white/40">Latest videos from your favorite weather YouTubers.</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
          >
            + Add channel
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200/80 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {adding && (
        <div className="bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 p-4 space-y-3">
          <div className="text-sm font-semibold text-white">Add a YouTube channel</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1 font-semibold">
                URL or @handle <span className="text-red-400">*</span>
              </div>
              <input
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                placeholder="https://youtube.com/@stefanburns or @stefanburns"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
              />
            </label>
            <label className="block">
              <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1 font-semibold">
                Display name (optional)
              </div>
              <input
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder="e.g. Stefan Burns"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setAdding(false);
                setAddInput('');
                setAddLabel('');
                setError(null);
              }}
              disabled={busy}
              className="text-sm px-3 py-2 text-white/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={busy || !addInput.trim()}
              className="text-sm px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-40"
            >
              {busy ? 'Adding…' : 'Add channel'}
            </button>
          </div>
        </div>
      )}

      {/* Channel chips — manage subscribed channels without dominating the feed */}
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-white/40 font-semibold mr-1">
            Channels
          </span>
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full pl-2 pr-1 py-0.5 text-xs"
            >
              <a
                href={`https://www.youtube.com/${s.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white"
                title={s.handle}
              >
                {s.label || s.handle}
              </a>
              {s.user_id !== null && (
                <button
                  onClick={() => handleDelete(s)}
                  className="text-white/30 hover:text-red-300 transition-colors w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-500/10"
                  title={`Remove ${s.handle}`}
                  aria-label={`Remove ${s.handle}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && videos.length === 0 ? (
        <div className="text-white/40 text-sm py-12 text-center">Loading latest videos…</div>
      ) : sources.length === 0 ? (
        <div className="bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center">
          <div className="text-white/60 text-base mb-1">No channels yet</div>
          <div className="text-xs text-white/40">Add a YouTube channel above to see the latest videos.</div>
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 p-6 text-center text-sm text-white/40 italic">
          No videos returned yet. Check back in a minute.
        </div>
      ) : (
        // Single chronological grid — newest at top regardless of channel.
        // The proxy already returns videos sorted by publishedAt desc.
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <VideoCard key={v.videoId} video={v} />
          ))}
        </div>
      )}

      <div className="text-[10px] text-white/30 text-center pt-4">
        Videos via YouTube uploads RSS · proxied through news-proxy edge function
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: NewsVideo }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        <div className="p-3">
          <div className="text-sm text-white font-medium line-clamp-2">{video.title}</div>
          <div className="text-[10px] text-white/40 mt-1">
            {video.channelTitle} · {timeAgo(video.publishedAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="text-left w-full bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors overflow-hidden group"
    >
      <div className="relative w-full bg-black/40" style={{ paddingBottom: '56.25%' }}>
        <img
          src={video.thumbnail}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <span className="text-3xl drop-shadow-lg">▶</span>
        </div>
      </div>
      <div className="p-3">
        <div className="text-sm text-white font-medium line-clamp-2">{video.title}</div>
        <div className="text-[10px] text-white/40 mt-1">
          {video.channelTitle} · {timeAgo(video.publishedAt)}
        </div>
      </div>
    </button>
  );
}
