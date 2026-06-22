import { useEffect, useState } from 'react';
import { RELEASE } from './releaseInfo';

export interface RemoteRelease {
  sha: string;
  fullSha?: string;
  time: string;
  weatherApkBytes?: number;
  fullApkBytes?: number;
}

const POLL_INTERVAL_MS = 15 * 60 * 1000; // every 15 min while open
const DISMISS_KEY_PREFIX = 'update-dismissed:';

/**
 * Polls /current-release.json and returns the remote release object if
 * its sha differs from the build-time SHA baked into this bundle. null
 * when up to date, or when the manifest hasn't loaded yet (initial
 * render).
 */
export function useUpdateCheck(): {
  available: RemoteRelease | null;
  dismiss: () => void;
  dismissedSha: string | null;
} {
  const [remote, setRemote] = useState<RemoteRelease | null>(null);
  const [dismissedSha, setDismissedSha] = useState<string | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(DISMISS_KEY_PREFIX + RELEASE.sha) ? RELEASE.sha : null;
  });

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch('/current-release.json', { cache: 'no-store' });
        if (!r.ok) return;
        const data = (await r.json()) as RemoteRelease;
        if (cancelled) return;
        // Ignore manifests that don't have a sha field (defensive).
        if (typeof data.sha !== 'string' || !data.sha) return;
        setRemote(data);
      } catch {
        /* ignore — offline / 404 / parse error */
      }
    };
    fetchOnce();
    const id = window.setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const dismiss = () => {
    if (!remote) return;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISS_KEY_PREFIX + remote.sha, '1');
    }
    setDismissedSha(remote.sha);
  };

  // Available iff remote is loaded AND its sha differs from our build
  // AND the user hasn't dismissed THIS specific sha yet. They can
  // re-dismiss every new release; old dismissals don't suppress new
  // versions.
  const isNewer = remote != null && remote.sha !== RELEASE.sha;
  const userDismissedThis = remote != null && dismissedSha === remote.sha;
  const available = isNewer && !userDismissedThis ? remote : null;

  return { available, dismiss, dismissedSha };
}

export function formatMB(bytes: number | undefined): string {
  if (!bytes) return '';
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
