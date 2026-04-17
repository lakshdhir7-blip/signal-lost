import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '@/state/session';

const TAUNTS = [
  'Y0U WILL NOT REACH THE END.',
  'TH4T LOCK IS TOO STRONG.',
  'PIX SENT A CHILD. CUTE.',
  'I AM IN YOUR WALLS.',
  'SSSSSEGFAULT.',
];

interface Props {
  triggerKey: string | number;
  delayMs?: number;
}

/**
 * Brief GLITCH intrusion between puzzles. Fires on `triggerKey` change.
 * Respects reduced-motion by skipping the animation entirely.
 */
export function GlitchPeek({ triggerKey, delayMs = 400 }: Props) {
  const settings = useSettings();
  const [visible, setVisible] = useState(false);
  const [taunt, setTaunt] = useState(TAUNTS[0]!);

  useEffect(() => {
    if (settings.reducedMotion) return;
    const pickTimeout = window.setTimeout(() => {
      setTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]!);
      setVisible(true);
      window.setTimeout(() => setVisible(false), 1200);
    }, delayMs);
    return () => window.clearTimeout(pickTimeout);
  }, [triggerKey, delayMs, settings.reducedMotion]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 1.05] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, times: [0, 0.1, 0.85, 1] }}
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(0deg,rgba(255,43,214,0.2)_0,rgba(255,43,214,0.2)_2px,transparent_2px,transparent_4px)]" />
            <svg
              viewBox="0 0 80 80"
              width={120}
              height={120}
              className="drop-shadow-[0_0_12px_rgba(255,43,214,0.9)]"
            >
              <path
                d="M40 12 L56 28 L56 50 L46 56 L46 66 L34 66 L34 56 L24 50 L24 28 Z"
                fill="#FF2BD6"
                stroke="#0B0F2B"
                strokeWidth="2"
              />
              <circle cx="30" cy="36" r="5" fill="#00E5FF" />
              <circle cx="50" cy="36" r="5" fill="#F9F871" />
              <path d="M28 48 L34 46 L40 50 L46 46 L52 48" stroke="#0B0F2B" strokeWidth="2" fill="none" />
            </svg>
            <div className="chromatic-pulse mt-3 text-center font-display text-sm text-magenta-brand">
              {taunt}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
