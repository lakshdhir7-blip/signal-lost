import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PuzzleId } from '@signal-lost/shared/puzzle-ids';
import { ByteSprite, type ByteState } from './ByteSprite';
import { useSessionStore, type HintTier } from '@/state/session';
import { requestHint } from '@/lib/api';
import { cues } from '@/audio/cues';
import { STORY } from '@/lib/story';
import { speak } from '@/lib/speech';
import { getPuzzle } from '@/puzzles/registry';

interface Props {
  puzzleId: PuzzleId;
  studentDraft: string;
}

interface ChatEntry {
  id: string;
  role: 'student' | 'byte';
  text: string;
  tier?: HintTier;
  offline?: boolean;
  at: number;
}

/** Map hint number to tier, scaled to the puzzle's cap.
 *  cap=3: 1→1 2→2 3→3
 *  cap=5: 1→1 2→2 3→2 4→3 5→3
 */
function nextTier(used: number, cap: number): HintTier {
  if (cap <= 3) {
    if (used === 0) return 1;
    if (used === 1) return 2;
    return 3;
  }
  if (used === 0) return 1;
  if (used <= 2) return 2;
  return 3;
}

export function ByteChatPanel({ puzzleId, studentDraft }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [byteState, setByteState] = useState<ByteState>('idle');
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const sessionId = useSessionStore((s) => s.sessionId);
  const progress = useSessionStore((s) => s.puzzles[puzzleId]);
  const recordHint = useSessionStore((s) => s.recordHint);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const hintCap = getPuzzle(puzzleId).hintCap ?? 3;
  const remaining = hintCap - progress.hintsUsed;

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries, open]);

  useEffect(() => {
    // Reset chat thread when switching puzzles
    setEntries([]);
    setByteState(progress.hintsUsed >= hintCap ? 'sleep' : 'idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleId]);

  const askHint = async () => {
    const message = input.trim();
    if (!message || busy) return;
    if (remaining <= 0) return;

    const tier = nextTier(progress.hintsUsed, hintCap);
    const studentEntry: ChatEntry = {
      id: `s-${Date.now()}`,
      role: 'student',
      text: message,
      at: Date.now(),
    };
    setEntries((prev) => [...prev, studentEntry]);
    setInput('');
    setBusy(true);
    setByteState('thinking');
    cues.hintRequest();

    const priorHints = progress.hintHistory.map((h) => ({ tier: h.tier, hint: h.hint }));
    const puzzleState = useSessionStore.getState().byteContext[puzzleId];
    const result = await requestHint({
      sessionId,
      puzzleId,
      tier,
      userMessage: message,
      studentDraft,
      priorHints,
      puzzleState,
    });

    recordHint(puzzleId, {
      tier,
      userMessage: message,
      hint: result.hint,
      at: Date.now(),
    });

    const byteText = result.offline ? `${STORY.byte.offlineFallback} ${result.hint}` : result.hint;
    setEntries((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        role: 'byte',
        text: byteText,
        tier,
        offline: result.offline,
        at: Date.now(),
      },
    ]);
    speak(byteText);
    setByteState(result.offline ? 'confused' : 'happy');
    setBusy(false);
    window.setTimeout(() => {
      setByteState((prev) => (prev === 'sleep' ? prev : 'idle'));
    }, 2000);
  };

  return (
    <>
      {/* Grouped button + name label; they always stay together */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-1">
        <motion.button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            cues.click();
          }}
          aria-expanded={open}
          aria-controls="byte-chat-panel"
          title={remaining > 0 ? 'Ask BYTE for a hint' : 'BYTE is out of hints on this lock'}
          initial="rest"
          animate="rest"
          whileHover="hover"
          whileFocus="hover"
          variants={{
            rest: { width: 64 },
            hover: { width: 260 },
          }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="flex h-16 items-center overflow-hidden rounded-full border-2 border-cyan-brand/60 bg-navy-brand/95 text-cyan-brand shadow-[0_0_20px_rgba(0,229,255,0.35)] backdrop-blur hover:border-cyan-brand"
        >
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center">
            <ByteSprite state={byteState} size={44} />
          </div>
          <motion.div
            variants={{
              rest: { opacity: 0, x: -10 },
              hover: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.2 }}
            className="flex min-w-0 flex-col pr-4 text-left"
          >
            <span className="whitespace-nowrap font-display text-xs tracking-wider text-magenta-brand">
              BYTE AI HELPER
            </span>
            <span className="whitespace-nowrap font-mono text-[10px] text-cyan-brand/80">
              click for a hint
            </span>
          </motion.div>
          <span className="sr-only">BYTE AI helper. {remaining} hints left on this puzzle.</span>
        </motion.button>

        {/* Always-visible name under the button */}
        <div
          aria-hidden="true"
          className="pointer-events-none w-16 text-center font-display text-[9px] leading-tight tracking-wider text-cyan-brand/80"
        >
          BYTE AI
          <br />
          HELPER
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.aside
            id="byte-chat-panel"
            role="complementary"
            aria-label="BYTE chat panel"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-4 z-40 flex h-[440px] w-[360px] flex-col border-2 border-cyan-brand bg-navy-brand/95 shadow-[0_0_40px_rgba(0,229,255,0.25)] backdrop-blur"
          >
            <header className="flex items-center justify-between border-b border-cyan-brand/30 px-4 py-2">
              <div className="flex items-center gap-2">
                <ByteSprite state={byteState} size={32} />
                <div>
                  <div className="font-display text-xs text-magenta-brand">BYTE</div>
                  <div className="font-mono text-[10px] text-cyan-brand/60">AI MODEL</div>
                </div>
              </div>
              <SignalBars used={progress.hintsUsed} cap={hintCap} />
              <button
                type="button"
                aria-label="Close BYTE chat"
                onClick={() => setOpen(false)}
                className="font-mono text-cyan-brand/60 hover:text-cyan-brand"
              >
                ✕
              </button>
            </header>

            <div ref={bodyRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs">
              {entries.length === 0 ? (
                <p className="text-cyan-brand/50">
                  hey. ask me what you are stuck on. i keep my replies short.
                </p>
              ) : null}
              {entries.map((e) => (
                <div
                  key={e.id}
                  className={`mb-3 max-w-[85%] ${e.role === 'student' ? 'ml-auto text-right' : ''}`}
                >
                  <div
                    className={`inline-block border-2 px-3 py-2 ${
                      e.role === 'student'
                        ? 'border-magenta-brand/60 bg-magenta-brand/10 text-magenta-brand'
                        : 'border-cyan-brand/40 bg-navy-deep text-cyan-brand'
                    }`}
                  >
                    {e.text}
                    {e.role === 'byte' && e.tier ? (
                      <div className="mt-1 text-[9px] uppercase tracking-widest text-cyan-brand/40">
                        tier {e.tier} {e.offline ? '// offline' : ''}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {busy ? (
                <div className="mb-3 inline-block border-2 border-cyan-brand/40 bg-navy-deep px-3 py-2 text-cyan-brand/60">
                  ...
                </div>
              ) : null}
            </div>

            <div className="border-t border-cyan-brand/30 px-3 py-2">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-cyan-brand/60">
                <span>
                  signal bars left: <span className="text-magenta-brand">{remaining}</span> / {hintCap}
                </span>
                <span>{remaining === 0 ? 'BYTE is out of signal' : `next = tier ${nextTier(progress.hintsUsed, hintCap)}`}</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 500))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      askHint();
                    }
                  }}
                  disabled={remaining === 0 || busy}
                  placeholder={remaining === 0 ? 'out of signal' : 'what are you stuck on?'}
                  className="terminal-input flex-1 px-2 py-1 text-xs"
                  aria-label="Message BYTE"
                />
                <button
                  type="button"
                  onClick={askHint}
                  disabled={remaining === 0 || busy || !input.trim()}
                  className="ranger-button px-3 py-1 text-xs"
                >
                  SEND
                </button>
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function SignalBars({ used, cap }: { used: number; cap: number }) {
  const remaining = Math.max(0, cap - used);
  const bars = Array.from({ length: cap }, (_, i) => {
    const active = i < remaining;
    return (
      <span
        key={i}
        aria-hidden="true"
        className={`inline-block h-4 ${active ? 'bg-magenta-brand shadow-[0_0_6px_#FF2BD6]' : 'bg-cyan-brand/20'}`}
        style={{ width: 4 + i * 2 }}
      />
    );
  });
  return (
    <div className="flex items-end gap-0.5" aria-label={`${remaining} signal bars remaining`}>
      {bars}
    </div>
  );
}
