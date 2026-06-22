import { useEffect, useRef, useState } from 'react';

const TRIGGER_DISTANCE = 80; // px the user has to drag to fire refresh
const MAX_PULL = 140; // visual cap; further dragging is ignored
const DRAG_DAMPING = 0.45; // 1px finger = 0.45px indicator (feels less stretchy)

/**
 * Drag-down-to-refresh hook for touch screens. Only fires when the page
 * is scrolled to the top and the gesture starts as a downward swipe;
 * intentionally a no-op on desktop (no touch events fire) and inside
 * scrollable inner containers.
 *
 * Returns:
 *   pull       — current visual pull distance in px, clamped to [0, MAX_PULL]
 *   refreshing — true while the onRefresh promise is in flight
 *   ready      — true when the pull distance has crossed the trigger threshold
 *                (use this to flip your spinner from "→ pull more" to "↻ release")
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const root = document;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      // Only arm when the document scroll is at the absolute top. Inner
      // scrollables (chart panels, tables) keep their normal behavior.
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      if (scrollTop > 0) return;
      const t = e.touches[0];
      if (!t) return;
      startYRef.current = t.clientY;
      activeRef.current = false; // promoted to true after first downward move
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshingRef.current || startYRef.current === null) return;
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startYRef.current;
      if (dy <= 0) {
        // User pulled up — abandon
        startYRef.current = null;
        activeRef.current = false;
        setPull(0);
        return;
      }
      // Confirm we're still at scroll-top (inner scrollables can have
      // grown into view in the meantime).
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      if (scrollTop > 0) {
        startYRef.current = null;
        activeRef.current = false;
        setPull(0);
        return;
      }
      activeRef.current = true;
      setPull(Math.min(dy * DRAG_DAMPING, MAX_PULL));
    };

    const onTouchEnd = async () => {
      const triggered = activeRef.current && pull >= TRIGGER_DISTANCE;
      startYRef.current = null;
      activeRef.current = false;
      if (triggered && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        // Snap the indicator to the trigger position while the async
        // refresh runs so the user gets a clear "loading" state.
        setPull(TRIGGER_DISTANCE);
        try {
          await onRefresh();
        } catch {
          /* swallow — caller already surfaces errors */
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: true });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchEnd);
    };
    // We intentionally re-bind on `pull` change so the touchend handler
    // sees the current pull distance without a ref dance.
  }, [pull, onRefresh]);

  return { pull, refreshing, ready: pull >= TRIGGER_DISTANCE };
}

export const PULL_TRIGGER_PX = TRIGGER_DISTANCE;
