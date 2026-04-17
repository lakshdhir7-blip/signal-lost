import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PUZZLE_IDS, PuzzleIdSchema, type PuzzleId } from '@signal-lost/shared/puzzle-ids';
import { useSessionStore } from '@/state/session';
import { CountdownTimer } from '@/components/CountdownTimer';
import { ProgressSidebar } from '@/components/ProgressSidebar';
import { getPuzzle } from '@/puzzles/registry';
import { pickRandom, STORY } from '@/lib/story';
import { cues } from '@/audio/cues';
import type { ValidationResult } from '@/puzzles/types';
import { ByteChatPanel } from '@/components/ByteChatPanel';
import { CorruptionMeter } from '@/components/CorruptionMeter';
import { GlitchPeek } from '@/components/GlitchPeek';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { cancelSpeak, speak } from '@/lib/speech';

export function PuzzleScreen() {
  const { puzzleId: raw } = useParams<{ puzzleId: string }>();
  const navigate = useNavigate();
  const parsed = PuzzleIdSchema.safeParse(raw);
  const puzzleId: PuzzleId = parsed.success ? parsed.data : 'p1';

  const puzzle = getPuzzle(puzzleId);
  const progress = useSessionStore((s) => s.puzzles[puzzleId]);
  const startPuzzle = useSessionStore((s) => s.startPuzzle);
  const recordAttempt = useSessionStore((s) => s.recordAttempt);
  const solvePuzzle = useSessionStore((s) => s.solvePuzzle);
  const saveDraft = useSessionStore((s) => s.saveDraft);

  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; message: string } | null>(
    null,
  );

  // Auto-unlock the current puzzle when you reach the screen
  useEffect(() => {
    if (progress.status === 'locked') {
      navigate('/', { replace: true });
      return;
    }
    startPuzzle(puzzleId);
  }, [puzzleId, progress.status, startPuzzle, navigate]);

  // When the puzzle changes, clear the feedback banner and stop any lingering
  // speech from the previous puzzle so messages do not carry over.
  useEffect(() => {
    setFeedback(null);
    cancelSpeak();
    if (puzzle?.storyBriefing) speak(puzzle.storyBriefing);
  }, [puzzleId, puzzle]);

  // Stable draft-change callback so puzzle components don't loop on re-render.
  const handleDraftChange = useCallback(
    (d: string) => saveDraft(puzzleId, d),
    [puzzleId, saveDraft],
  );

  const onSubmit = (result: ValidationResult) => {
    recordAttempt(puzzleId);
    if (result.ok) {
      cues.correct();
      cues.lockClunk();
      const msg = pickRandom(STORY.puzzleFeedback.correct);
      setFeedback({ kind: 'correct', message: msg });
      solvePuzzle(puzzleId);

      const speechDone = speak(msg).then(
        () => new Promise<void>((r) => window.setTimeout(r, 400)),
      );
      const minDisplay = new Promise<void>((r) => window.setTimeout(r, 2500));
      const maxWait = new Promise<void>((r) => window.setTimeout(r, 6000));

      Promise.all([minDisplay, Promise.race([speechDone, maxWait])]).then(() => {
        const idx = PUZZLE_IDS.indexOf(puzzleId);
        const next = PUZZLE_IDS[idx + 1];
        if (next) {
          navigate(`/puzzle/${next}`);
        } else {
          navigate('/disarm');
        }
      });
    } else {
      cues.wrong();
      const msg = pickRandom(STORY.puzzleFeedback.wrong);
      setFeedback({ kind: 'wrong', message: msg });
      speak(msg);
      window.setTimeout(() => setFeedback(null), 2500);
    }
  };

  const PuzzleComponent = useMemo(() => puzzle.component, [puzzle]);

  return (
    <main className="flex h-screen flex-col bg-navy-deep text-cyan-brand">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b-2 border-cyan-brand/20 bg-navy-brand/60 py-2.5 pl-6 pr-16">
        <div className="font-display text-sm text-magenta-brand">
          LOCK {String(PUZZLE_IDS.indexOf(puzzleId) + 1).padStart(2, '0')} //{' '}
          <span className="text-cyan-brand">{puzzle.title.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-6">
          <CountdownTimer />
          <CorruptionMeter />
        </div>
        <div className="flex items-center gap-4">
          <ReadAloudButton />
          <div className="font-mono text-xs text-cyan-brand/60">
            NAME: <span className="text-cyan-brand">{useCallsignDisplay()}</span>
          </div>
        </div>
      </header>

      <GlitchPeek triggerKey={puzzleId} delayMs={600} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <ProgressSidebar activeId={puzzleId} />

        <section className="flex flex-1 flex-col overflow-auto">
          {/* Briefing */}
          <div className="border-b border-cyan-brand/20 bg-navy-brand/40 px-8 py-4">
            <h2 className="mb-1 font-display text-xs uppercase tracking-widest text-magenta-brand">
              Your mission
            </h2>
            <p className="font-sans text-base text-cyan-brand">{puzzle.storyBriefing}</p>
            {puzzle.redHerrings.length > 0 ? (
              <details className="mt-3 text-xs text-cyan-brand/70">
                <summary className="cursor-pointer font-mono">Background intel (optional)</summary>
                <ul className="mt-2 list-disc pl-6">
                  {puzzle.redHerrings.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          {/* Puzzle body */}
          <div className="flex-1 overflow-auto">
            <PuzzleComponent
              puzzleId={puzzleId}
              draft={progress.draft ?? ''}
              onDraftChange={handleDraftChange}
              onSubmit={onSubmit}
            />
          </div>
        </section>
      </div>

      <ByteChatPanel puzzleId={puzzleId} studentDraft={progress.draft ?? ''} />

      {/* Feedback overlay */}
      <AnimatePresence>
        {feedback ? (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.3 }}
            role="status"
            aria-live="polite"
            className={`pointer-events-none fixed left-1/2 top-24 z-30 -translate-x-1/2 border-2 px-6 py-3 font-display text-sm tracking-wider ${
              feedback.kind === 'correct'
                ? 'border-green-400 bg-green-400/10 text-green-400'
                : 'border-alert-brand bg-alert-brand/10 text-alert-brand'
            }`}
          >
            {feedback.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function useCallsignDisplay() {
  const callsign = useSessionStore((s) => s.callsign);
  return callsign || 'anonymous';
}
