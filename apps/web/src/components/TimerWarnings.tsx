import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSessionStore } from '@/state/session';
import { MISSION_DURATION_MS } from '@/lib/timer';
import { speak } from '@/lib/speech';
import { cues } from '@/audio/cues';

interface Threshold {
  msRemaining: number;
  label: string;
  body: string;
  tone: 'info' | 'warn' | 'alert';
}

const THRESHOLDS: Threshold[] = [
  { msRemaining: 30 * 60_000, label: '30 MINUTES LEFT', body: 'You have half an hour left. Keep going!', tone: 'info' },
  { msRemaining: 5 * 60_000, label: '5 MINUTES LEFT', body: 'Only 5 minutes left! Try to finish up.', tone: 'warn' },
  { msRemaining: 1 * 60_000, label: '1 MINUTE LEFT', body: 'One minute! Final push, ranger.', tone: 'alert' },
];

/**
 * Watches the countdown and shows a popup at 30, 5, and 1 minute remaining.
 * Each threshold fires exactly once per session.
 */
export function TimerWarnings() {
  const startedAt = useSessionStore((s) => s.startedAt);
  const disarmedAt = useSessionStore((s) => s.disarmedAt);
  const sessionId = useSessionStore((s) => s.sessionId);
  const firedRef = useRef<Set<number>>(new Set());
  const [active, setActive] = useState<Threshold | null>(null);

  // Reset fired set when session changes (new session = new timer).
  useEffect(() => {
    firedRef.current = new Set();
  }, [sessionId]);

  // If the mission is already won, clear any open warning immediately.
  useEffect(() => {
    if (disarmedAt !== null) {
      setActive(null);
    }
  }, [disarmedAt]);

  useEffect(() => {
    if (!startedAt) return;
    // Stop the timer warnings entirely once the escape room is beaten.
    if (disarmedAt !== null) return;
    const id = window.setInterval(() => {
      const remaining = startedAt + MISSION_DURATION_MS - Date.now();
      for (const t of THRESHOLDS) {
        if (firedRef.current.has(t.msRemaining)) continue;
        if (remaining <= t.msRemaining && remaining > t.msRemaining - 2000) {
          firedRef.current.add(t.msRemaining);
          setActive(t);
          cues.hintRequest();
          speak(`${t.label}. ${t.body}`);
          window.setTimeout(() => setActive(null), 5000);
          break;
        }
        // Also catch the case where we blow past (e.g., tab was paused)
        if (remaining <= t.msRemaining - 2000) {
          firedRef.current.add(t.msRemaining);
        }
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, disarmedAt]);

  const toneClasses: Record<Threshold['tone'], string> = {
    info: 'border-cyan-brand bg-cyan-brand/10 text-cyan-brand',
    warn: 'border-acid-brand bg-acid-brand/10 text-acid-brand',
    alert: 'border-alert-brand bg-alert-brand/20 text-alert-brand',
  };

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          role="alertdialog"
          aria-labelledby="timer-warning-label"
          aria-describedby="timer-warning-body"
          initial={{ opacity: 0, scale: 0.85, y: -40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="pointer-events-auto fixed left-1/2 top-1/2 z-[60] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2"
        >
          <div
            className={`border-4 bg-navy-deep/95 p-6 text-center shadow-[0_0_40px_rgba(255,43,214,0.35)] backdrop-blur ${toneClasses[active.tone]}`}
          >
            <div id="timer-warning-label" className="mb-2 font-display text-lg tracking-widest">
              {active.label}
            </div>
            <div id="timer-warning-body" className="font-sans text-sm text-cyan-brand">
              {active.body}
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="ranger-button mt-4"
            >
              [ OK ]
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
