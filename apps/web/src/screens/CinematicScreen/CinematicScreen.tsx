import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { STORY } from '@/lib/story';
import { useSessionStore } from '@/state/session';
import { speak } from '@/lib/speech';
import { ReadAloudButton } from '@/components/ReadAloudButton';

const TOTAL_MS = 45_000;

/**
 * Phase 0 placeholder cinematic. Full GSAP-driven version with custom art,
 * ElevenLabs voice, and captions lands in Phase 5.
 */
export function CinematicScreen() {
  const navigate = useNavigate();
  const markCinematicSeen = useSessionStore((s) => s.markCinematicSeen);
  const hasSeen = useSessionStore((s) => s.hasSeenCinematic);
  const [elapsed, setElapsed] = useState(0);
  const scenes = STORY.cinematic.scenes;

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const diff = Date.now() - start;
      setElapsed(diff);
      if (diff >= TOTAL_MS) {
        window.clearInterval(id);
        markCinematicSeen();
        navigate('/puzzle/p1', { replace: true });
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [markCinematicSeen, navigate]);

  const currentScene = useMemo(() => {
    const t = elapsed / 1000;
    return [...scenes].reverse().find((s) => t >= s.at) ?? scenes[0];
  }, [elapsed, scenes]);

  useEffect(() => {
    if (currentScene?.text) speak(currentScene.text);
  }, [currentScene]);

  const handleSkip = () => {
    markCinematicSeen();
    navigate('/puzzle/p1', { replace: true });
  };

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-cyan-brand">
      <div className="absolute left-4 top-4 z-10">
        <ReadAloudButton />
      </div>
      <div className="w-full max-w-3xl px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene.at}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="font-display text-xl leading-relaxed md:text-3xl"
          >
            {currentScene.text}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="absolute bottom-8 left-0 right-0 mx-auto w-full max-w-xl px-8">
        <div className="h-1 w-full bg-cyan-brand/20">
          <div
            className="h-full bg-cyan-brand transition-all"
            style={{ width: `${Math.min(100, (elapsed / TOTAL_MS) * 100)}%` }}
          />
        </div>
      </div>
      {/* Skip link visible only after 40s OR if replaying */}
      {hasSeen || elapsed > 40_000 ? (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute bottom-4 right-4 font-mono text-xs text-cyan-brand/40 hover:text-cyan-brand"
        >
          skip
        </button>
      ) : null}
    </main>
  );
}
