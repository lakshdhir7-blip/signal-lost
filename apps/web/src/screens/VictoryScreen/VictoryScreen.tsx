import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PUZZLE_IDS, PUZZLE_META } from '@signal-lost/shared/puzzle-ids';
import { useSessionStore } from '@/state/session';
import { STORY } from '@/lib/story';
import { formatMMSS } from '@/lib/timer';
import { speak } from '@/lib/speech';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { cues } from '@/audio/cues';

export function VictoryScreen() {
  const navigate = useNavigate();
  const callsign = useSessionStore((s) => s.callsign);
  const startedAt = useSessionStore((s) => s.startedAt);
  const disarmedAt = useSessionStore((s) => s.disarmedAt);
  const puzzles = useSessionStore((s) => s.puzzles);
  const resetSession = useSessionStore((s) => s.resetSession);

  const totalMs = startedAt !== null && disarmedAt !== null ? disarmedAt - startedAt : 0;
  const totalHints = PUZZLE_IDS.reduce((sum, id) => sum + puzzles[id].hintsUsed, 0);

  const grade = gradeMission(totalMs, totalHints);
  const speedrun = totalMs > 0 && totalMs < 30 * 60_000;

  const onReplay = () => {
    resetSession();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    speak(`${STORY.victory.headline}. ${STORY.victory.subheadline}. ${STORY.victory.pixLine}`);
    // Start the anthem. Stop when the screen unmounts so it doesn't leak.
    cues.startVictoryAnthem();
    return () => cues.stopVictoryAnthem();
  }, []);

  // Also stop the anthem if the user clicks "Play again" (before unmount fires).
  const onReplayWithSound = () => {
    cues.stopVictoryAnthem();
    onReplay();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-deep px-6 text-cyan-brand">
      <div className="absolute left-4 top-4">
        <ReadAloudButton />
      </div>
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring' }}
        className="mb-3 text-center font-display text-2xl text-green-400 md:text-4xl"
      >
        {STORY.victory.headline}
      </motion.h1>
      <p className="mb-10 text-center font-sans text-cyan-brand/80">{STORY.victory.subheadline}</p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="relative mb-8 w-full max-w-md border-2 border-magenta-brand bg-navy-brand p-6 text-center shadow-[0_0_40px_rgba(255,43,214,0.35)]"
      >
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-magenta-brand">
          NET RANGER // CERTIFIED
        </div>
        <div className="mb-4 font-display text-3xl text-cyan-brand">{callsign || 'anonymous'}</div>
        <div className="mb-1 font-mono text-xs text-cyan-brand/60">MISSION TIME</div>
        <div className="mb-4 font-display text-4xl">{formatMMSS(totalMs)}</div>
        <div className="inline-block border border-cyan-brand/60 px-4 py-1 font-display text-sm">
          GRADE: <span className="text-acid-brand">{grade}</span>
          {speedrun ? <span className="ml-2 text-magenta-brand">// SPEEDRUN</span> : null}
        </div>
      </motion.div>

      <div className="mb-8 w-full max-w-md border border-cyan-brand/20 bg-navy-brand/40 p-4 font-mono text-xs">
        <h3 className="mb-3 font-display text-sm uppercase tracking-widest text-magenta-brand">
          Lock breakdown
        </h3>
        <ul className="space-y-2">
          {PUZZLE_IDS.map((id, idx) => {
            const p = puzzles[id];
            const elapsed =
              p.startedAt !== null && p.solvedAt !== null ? p.solvedAt - p.startedAt : 0;
            return (
              <li key={id} className="flex items-center justify-between">
                <span>
                  {String(idx + 1).padStart(2, '0')}. {PUZZLE_META[id].lockName}
                </span>
                <span className="text-cyan-brand/80">
                  {formatMMSS(elapsed)} // {p.hintsUsed} hints
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 border-t border-cyan-brand/20 pt-3 text-cyan-brand/80">
          BYTE CALLS: {totalHints}
        </div>
      </div>

      <p className="mb-6 text-center font-sans text-sm italic text-cyan-brand/70">
        PIX: "{STORY.victory.pixLine}"
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onReplayWithSound} className="ranger-button">
          [ {STORY.victory.replayButton} ]
        </button>
        <button type="button" onClick={() => navigate('/game')} className="ranger-button">
          [ PLAY A GAME ]
        </button>
      </div>
      <p className="mt-3 text-center font-mono text-[10px] text-cyan-brand/60">
        Waiting on friends? Try BYTE RUN.
      </p>
    </main>
  );
}

function gradeMission(_totalMs: number, _hintsUsed: number): 'A' {
  // Every ranger who finishes the mission gets an A. The SPEEDRUN badge
  // still rewards fast runs separately, so speed is still recognized.
  return 'A';
}
