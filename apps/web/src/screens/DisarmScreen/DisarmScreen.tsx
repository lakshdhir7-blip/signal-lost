import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MASTER_PHRASE, PUZZLE_IDS } from '@signal-lost/shared/puzzle-ids';
import { useSessionStore } from '@/state/session';
import { STORY } from '@/lib/story';
import { speak } from '@/lib/speech';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { cues } from '@/audio/cues';

function normalize(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function DisarmScreen() {
  const navigate = useNavigate();
  const puzzles = useSessionStore((s) => s.puzzles);
  const markDisarmed = useSessionStore((s) => s.markDisarmed);
  const codeWords = useMemo(
    () => PUZZLE_IDS.map((id) => puzzles[id].codeWord).filter((w): w is string => Boolean(w)),
    [puzzles],
  );

  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const remainingLock = isLocked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  useEffect(() => {
    speak(`${STORY.disarm.title}. ${STORY.disarm.instruction}`);
  }, []);

  const onSubmit = () => {
    if (isLocked) return;
    const normalized = normalize(input);
    if (normalized === MASTER_PHRASE) {
      cues.disarmSuccess();
      markDisarmed();
      // Small delay so the celebration sound gets a chance to start before
      // the victory screen's anthem kicks in.
      window.setTimeout(() => navigate('/victory'), 1800);
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    const entered = normalized.split(' ').filter(Boolean);
    const expected = MASTER_PHRASE.split(' ');
    let msg: string;
    if (entered.length < expected.length) {
      msg = STORY.disarm.wrong.missingWord;
    } else if (entered.length > expected.length) {
      msg = STORY.disarm.wrong.extraWord;
    } else if (entered.every((w) => expected.includes(w))) {
      msg = STORY.disarm.wrong.wrongOrder;
    } else {
      msg = STORY.disarm.wrong.typo;
    }
    setFeedback(msg);
    speak(msg);
    if (next >= 10) {
      setLockedUntil(Date.now() + 30_000);
      setAttempts(0);
      setFeedback(STORY.disarm.lockoutMessage);
      speak(STORY.disarm.lockoutMessage);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-cyan-brand">
      <div className="absolute left-4 top-4">
        <ReadAloudButton />
      </div>
      <motion.h1
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="chromatic-pulse mb-4 font-display text-3xl text-magenta-brand md:text-5xl"
      >
        {STORY.disarm.title}
      </motion.h1>
      <p className="mb-8 font-sans text-cyan-brand/80">{STORY.disarm.instruction}</p>

      <div className="mb-8 flex flex-wrap justify-center gap-3">
        {codeWords.map((word, i) => (
          <div
            key={`${word}-${i}`}
            className="border-2 border-green-400 bg-green-400/10 px-4 py-2 font-mono text-sm text-green-400"
          >
            {word}
          </div>
        ))}
      </div>

      <div className="w-full max-w-xl">
        <label htmlFor="disarm-input" className="mb-2 block font-mono text-xs text-cyan-brand/70">
          &gt; ENTER MASTER PHRASE
        </label>
        <input
          id="disarm-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
          disabled={isLocked}
          className="terminal-input"
          autoFocus
          autoComplete="off"
        />
        {feedback ? (
          <p
            role="alert"
            className="mt-3 font-mono text-sm text-alert-brand"
          >
            {feedback}
            {isLocked ? ` (${remainingLock}s)` : ''}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLocked || !input.trim()}
          className="ranger-button mt-6 w-full"
        >
          [ {STORY.disarm.button} ]
        </button>
      </div>
    </main>
  );
}
