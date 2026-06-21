// Build-time constants injected by vite.config.ts.
declare const __BUILD_SHA__: string;
declare const __BUILD_MESSAGE__: string;
declare const __BUILD_TIME__: string;

export interface ReleaseInfo {
  sha: string;
  message: string;
  time: string;
  commitUrl: string;
}

export const RELEASE: ReleaseInfo = {
  sha: __BUILD_SHA__,
  message: __BUILD_MESSAGE__,
  time: __BUILD_TIME__,
  commitUrl: `https://github.com/Chronos770/ClassicGames/commit/${__BUILD_SHA__}`,
};

/**
 * "12s ago", "3 min ago", "2 hr ago", "Apr 5". Cheap relative formatter
 * that doesn't pull in date-fns. Re-derive on each render — values are
 * tiny strings, no perf concern.
 */
export function timeAgoShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
