import { useEffect, useState } from 'react';
import { RELEASE, timeAgoShort } from '../../lib/releaseInfo';

export default function ReleaseInfoCard() {
  // Re-render once a minute so the relative time stays fresh while the
  // tab is open. (Idle re-renders are cheap; nothing else depends on it.)
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0" aria-hidden>
          &#128640;
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-white/40 font-semibold mb-1">
            Current release
          </div>
          <div className="text-sm text-white">
            {RELEASE.message || '(no commit message)'}
          </div>
          <div className="mt-1 text-xs text-white/55 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <a
              href={RELEASE.commitUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sky-300/80 hover:text-sky-200"
              title="View commit on GitHub"
            >
              {RELEASE.sha}
            </a>
            <span className="text-white/30">&middot;</span>
            <span title={new Date(RELEASE.time).toLocaleString()}>
              shipped {timeAgoShort(RELEASE.time)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
