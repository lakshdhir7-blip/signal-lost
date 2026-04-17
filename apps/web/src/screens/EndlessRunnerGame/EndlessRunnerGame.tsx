import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSessionStore, useSettings } from '@/state/session';
import { formatMMSS } from '@/lib/timer';
import { speak } from '@/lib/speech';
import { cues } from '@/audio/cues';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { createInitialWorld, startRun, stepWorld, tryJump } from './gameEngine';
import { drawWorld } from './renderer';
import { useGameLoop } from './useGameLoop';
import type { GameWorld } from './types';

const VIEW_W = 960;
const VIEW_H = 360;
const GROUND_Y = 280;

export function EndlessRunnerGame() {
  const navigate = useNavigate();
  const runnerBestMs = useSessionStore((s) => s.runnerBestMs);
  const setRunnerBest = useSessionStore((s) => s.setRunnerBest);
  const settings = useSettings();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<GameWorld>(
    createInitialWorld({ width: VIEW_W, height: VIEW_H, groundY: GROUND_Y }),
  );
  const flashRedUntilRef = useRef<number>(0);
  const [hud, setHud] = useState<{ elapsedMs: number; phase: GameWorld['phase'] }>({
    elapsedMs: 0,
    phase: 'ready',
  });
  const [newBest, setNewBest] = useState(false);
  const hudTickAccRef = useRef(0);

  const running = hud.phase === 'running';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawWorld(ctx, worldRef.current, {
      reducedMotion: settings.reducedMotion,
      flashRed: Date.now() < flashRedUntilRef.current,
    });
  }, [settings.reducedMotion]);

  const onTick = useCallback(
    (dt: number) => {
      const result = stepWorld(worldRef.current, dt);
      if (result.collided) {
        cues.wrong();
        cues.stopRunnerMusic();
        flashRedUntilRef.current = Date.now() + 150;
        const finalMs = worldRef.current.elapsedMs;
        if (finalMs > runnerBestMs) {
          setRunnerBest(finalMs);
          setNewBest(true);
          cues.correct();
        }
        setHud({ elapsedMs: finalMs, phase: 'over' });
        speak(`Game over. You lasted ${Math.round(finalMs / 1000)} seconds.`);
        draw();
        return;
      }
      if (result.newMilestone !== null) {
        cues.correct();
      }
      hudTickAccRef.current += dt;
      if (hudTickAccRef.current > 200) {
        hudTickAccRef.current = 0;
        setHud({ elapsedMs: worldRef.current.elapsedMs, phase: worldRef.current.phase });
      }
      draw();
    },
    [draw, runnerBestMs, setRunnerBest],
  );

  useGameLoop(onTick, running);

  // Initial draw
  useEffect(() => {
    draw();
  }, [draw]);

  // Keyboard handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleJump();
      } else if (e.key === 'Enter') {
        if (hud.phase === 'ready' || hud.phase === 'over') startGame();
      } else if (e.key === 'Escape') {
        if (hud.phase === 'running') pauseGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.phase]);

  // Pause on tab hide
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && hud.phase === 'running') {
        setHud((h) => ({ ...h, phase: 'paused' }));
        worldRef.current.phase = 'paused';
        cues.stopRunnerMusic();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [hud.phase]);

  // Make sure music always stops when leaving the screen.
  useEffect(() => {
    return () => {
      cues.stopRunnerMusic();
    };
  }, []);

  const startGame = () => {
    setNewBest(false);
    startRun(worldRef.current);
    setHud({ elapsedMs: 0, phase: 'running' });
    cues.whoosh();
    cues.startRunnerMusic();
  };

  const pauseGame = () => {
    worldRef.current.phase = 'paused';
    setHud((h) => ({ ...h, phase: 'paused' }));
    cues.click();
    cues.stopRunnerMusic();
  };

  const resumeGame = () => {
    worldRef.current.phase = 'running';
    setHud((h) => ({ ...h, phase: 'running' }));
    cues.click();
    cues.startRunnerMusic();
  };

  const handleJump = () => {
    if (hud.phase === 'ready') {
      startGame();
      return;
    }
    if (hud.phase === 'paused') {
      resumeGame();
      return;
    }
    if (hud.phase === 'over') {
      // Space / tap restarts the run from game-over screen.
      startGame();
      return;
    }
    if (tryJump(worldRef.current)) {
      cues.click();
    }
  };

  const handleCanvasTap = () => handleJump();

  const phaseLabel = useMemo(() => {
    if (hud.phase === 'ready') return 'Ready';
    if (hud.phase === 'running') return 'Running';
    if (hud.phase === 'paused') return 'Paused';
    return 'Game Over';
  }, [hud.phase]);

  const displayMs = hud.phase === 'over' ? worldRef.current.elapsedMs : hud.elapsedMs;
  const dodgedCount = worldRef.current.dodged;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-navy-deep px-4 pt-14 text-cyan-brand">
      <div className="absolute left-4 top-4 z-10">
        <ReadAloudButton />
      </div>

      <header className="mb-3 flex w-full max-w-[960px] items-center justify-between">
        <h1 className="font-display text-lg tracking-widest text-magenta-brand">BYTE RUN</h1>
        <button
          type="button"
          className="ranger-button"
          onClick={() => navigate('/victory')}
          aria-label="Back to Ranger badge"
        >
          [ BACK TO RANGER BADGE ]
        </button>
      </header>

      <div className="mb-3 flex w-full max-w-[960px] items-center justify-between font-mono text-sm">
        <div>
          TIME: <span className="text-acid-brand">{formatMMSS(displayMs)}</span>
        </div>
        <div>
          BEST: <span className="text-magenta-brand">{formatMMSS(runnerBestMs)}</span>
        </div>
        <div>
          DODGED: <span className="text-cyan-brand">{dodgedCount}</span>
        </div>
        <div className="text-cyan-brand/60">{phaseLabel}</div>
      </div>

      <div
        className="relative overflow-hidden border-2 border-cyan-brand/50 bg-navy-deep shadow-[0_0_30px_rgba(0,229,255,0.2)]"
        style={{ width: VIEW_W, maxWidth: '100%', aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          onClick={handleCanvasTap}
          onTouchStart={(e) => {
            e.preventDefault();
            handleCanvasTap();
          }}
          role="img"
          aria-label="Endless runner game. Press space or tap to jump."
          className="block h-full w-full cursor-pointer"
        />

        {/* Overlays */}
        <AnimatePresence>
          {hud.phase === 'ready' ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-navy-deep/70 backdrop-blur"
            >
              <div className="chromatic-pulse mb-3 font-display text-2xl text-magenta-brand">
                READY?
              </div>
              <p className="mb-5 max-w-sm text-center font-sans text-cyan-brand/90">
                Press SPACE or tap to jump. Dodge the magenta shards. Your score is how long you
                survive.
              </p>
              <button type="button" onClick={startGame} className="ranger-button">
                [ START RUN ]
              </button>
            </motion.div>
          ) : null}

          {hud.phase === 'paused' ? (
            <motion.div
              key="paused"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-navy-deep/70 backdrop-blur"
            >
              <div className="mb-3 font-display text-xl text-acid-brand">PAUSED</div>
              <div className="flex gap-3">
                <button type="button" onClick={resumeGame} className="ranger-button">
                  [ RESUME ]
                </button>
                <button type="button" onClick={() => navigate('/victory')} className="ranger-button">
                  [ QUIT ]
                </button>
              </div>
            </motion.div>
          ) : null}

          {hud.phase === 'over' ? (
            <motion.div
              key="over"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-navy-deep/80 backdrop-blur"
              role="status"
              aria-live="polite"
            >
              <div className="chromatic-pulse mb-2 font-display text-2xl text-alert-brand">
                GLITCH GOT YOU
              </div>
              <div className="mb-1 font-mono text-sm text-cyan-brand/70">You survived</div>
              <div className="mb-3 font-display text-4xl text-acid-brand">
                {formatMMSS(worldRef.current.elapsedMs)}
              </div>
              <div className="mb-4 font-mono text-xs text-cyan-brand/70">
                Shards dodged: {worldRef.current.dodged} // Best: {formatMMSS(runnerBestMs)}
              </div>
              {newBest ? (
                <div className="mb-4 border-2 border-magenta-brand bg-magenta-brand/15 px-4 py-1 font-display text-sm text-magenta-brand animate-pulse">
                  NEW BEST!
                </div>
              ) : null}
              <div className="flex gap-3">
                <button type="button" onClick={startGame} className="ranger-button">
                  [ RUN AGAIN ]
                </button>
                <button type="button" onClick={() => navigate('/victory')} className="ranger-button">
                  [ BACK TO RANGER BADGE ]
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <p className="mt-3 max-w-[960px] text-center font-mono text-[11px] text-cyan-brand/50">
        SPACE / ↑ / W / tap to jump. ESC to pause.
      </p>
      {hud.phase === 'running' ? (
        <button
          type="button"
          onClick={pauseGame}
          className="mt-2 font-mono text-xs text-cyan-brand/60 hover:text-cyan-brand"
        >
          [ pause ]
        </button>
      ) : null}
    </main>
  );
}

export default EndlessRunnerGame;
