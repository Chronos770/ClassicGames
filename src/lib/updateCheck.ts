import { useCallback, useEffect, useRef, useState } from 'react';
import { RELEASE } from './releaseInfo';
import { isNativeApp } from './nativeApp';

export interface RemoteRelease {
  sha: string;
  fullSha?: string;
  time: string;
  weatherApkBytes?: number;
  fullApkBytes?: number;
}

const POLL_INTERVAL_MS = 15 * 60 * 1000; // every 15 min while open
const DISMISS_KEY_PREFIX = 'update-dismissed:';

// Module-level singleton so the manifest check can be triggered from
// anywhere (pull-to-refresh handler, tab-refocus listener, etc.) without
// every consumer re-mounting the hook. The hook subscribes and shares.
type Listener = (data: RemoteRelease | null) => void;
const listeners = new Set<Listener>();
let cachedRemote: RemoteRelease | null = null;
let inFlight: Promise<void> | null = null;

function manifestUrl(): string {
  return isNativeApp()
    ? 'https://castleandcards.com/current-release.json'
    : '/current-release.json';
}

async function fetchManifest(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const url = `${manifestUrl()}?t=${Date.now()}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as RemoteRelease;
      if (typeof data.sha !== 'string' || !data.sha) return;
      cachedRemote = data;
      listeners.forEach((cb) => cb(data));
    } catch {
      /* ignore — offline / 404 / parse error */
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Manually trigger a manifest re-check. Safe to call frequently; the
 * module dedupes concurrent fetches via `inFlight`. Use this from any
 * "user did something that implies they might want fresh state" path:
 * pull-to-refresh, app foreground, big nav events.
 */
export function checkForUpdateNow(): Promise<void> {
  return fetchManifest();
}

/**
 * Polls /current-release.json and returns the remote release object if
 * its sha differs from the build-time SHA baked into this bundle. null
 * when up to date, or when the manifest hasn't loaded yet (initial
 * render).
 *
 * Triggers a manifest fetch on:
 *   - mount
 *   - every 15 min while mounted
 *   - tab regains visibility (visibilitychange) — covers Capacitor
 *     foregrounding and browser tab focus
 *   - window focus (covers desktop alt-tab)
 *   - explicit checkForUpdateNow() call from elsewhere
 */
export function useUpdateCheck(): {
  available: RemoteRelease | null;
  dismiss: () => void;
  dismissedSha: string | null;
  checkNow: () => Promise<void>;
} {
  const [remote, setRemote] = useState<RemoteRelease | null>(cachedRemote);
  const [dismissedSha, setDismissedSha] = useState<string | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(DISMISS_KEY_PREFIX + RELEASE.sha) ? RELEASE.sha : null;
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const onData: Listener = (data) => {
      if (mountedRef.current) setRemote(data);
    };
    listeners.add(onData);

    fetchManifest();
    const intervalId = window.setInterval(fetchManifest, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchManifest();
    };
    const onFocus = () => fetchManifest();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      mountedRef.current = false;
      listeners.delete(onData);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (!remote) return;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISS_KEY_PREFIX + remote.sha, '1');
    }
    setDismissedSha(remote.sha);
  }, [remote]);

  const checkNow = useCallback(() => fetchManifest(), []);

  const isNewer = remote != null && remote.sha !== RELEASE.sha;
  const userDismissedThis = remote != null && dismissedSha === remote.sha;
  const available = isNewer && !userDismissedThis ? remote : null;

  return { available, dismiss, dismissedSha, checkNow };
}

export function formatMB(bytes: number | undefined): string {
  if (!bytes) return '';
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
