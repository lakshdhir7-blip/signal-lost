import { useEffect, useRef } from 'react';

/**
 * requestAnimationFrame wrapper that:
 * - Provides stable delta-time in ms (clamped to 50ms to handle tab wake-ups).
 * - Auto-pauses when the tab is hidden; resumes with no frame-time jump.
 * - Cleans up on unmount.
 *
 * The callback should be stable (wrap in useCallback) OR the hook will not
 * capture new closure state — use a ref internally if you need that.
 */
export function useGameLoop(onTick: (deltaMs: number) => void, running: boolean) {
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef(onTick);

  useEffect(() => {
    tickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!running) {
      lastTimeRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const step = (t: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = t;
      const dt = Math.min(50, t - lastTimeRef.current);
      lastTimeRef.current = t;
      tickRef.current(dt);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
    };
  }, [running]);

  // Pause on visibility change — signals parent via the `running` prop flip.
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        // Reset last time so returning doesn't produce a huge delta.
        lastTimeRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
}
