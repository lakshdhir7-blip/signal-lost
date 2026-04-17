import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { STORY } from '@/lib/story';
import { CALLSIGN_ERRORS, validateCallsign } from '@/lib/callsign-filter';
import { useSessionStore } from '@/state/session';
import { cues } from '@/audio/cues';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { speak } from '@/lib/speech';

export function IntroScreen() {
  const navigate = useNavigate();
  const setCallsign = useSessionStore((s) => s.setCallsign);
  const markAudioUnlocked = useSessionStore((s) => s.markAudioUnlocked);
  const existingCallsign = useSessionStore((s) => s.callsign);
  const [raw, setRaw] = useState(existingCallsign);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(() => validateCallsign(raw), [raw]);
  const canStart = validation.ok;

  const onStart = () => {
    if (!validation.ok) {
      cues.wrong();
      const msg = CALLSIGN_ERRORS[validation.reason];
      setError(msg);
      speak(msg);
      return;
    }
    cues.whoosh();
    setCallsign(validation.value);
    markAudioUnlocked();
    speak(`Hi ${validation.value}. Let's go.`);
    navigate('/cinematic');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-deep px-6">
      <CodeRainBackdrop />
      <div className="absolute left-4 top-4 z-20">
        <ReadAloudButton />
      </div>
      <section className="relative z-10 w-full max-w-xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="chromatic-pulse mb-2 font-display text-5xl tracking-wider text-magenta-brand md:text-6xl"
        >
          {STORY.intro.title}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mb-8 font-mono text-xs uppercase tracking-widest text-cyan-brand/60"
        >
          {STORY.intro.subtitle}
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mb-10 font-sans text-base text-cyan-brand/80 md:text-lg"
        >
          {STORY.intro.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mx-auto max-w-md"
        >
          <label htmlFor="callsign" className="mb-2 block text-left font-mono text-xs text-cyan-brand/70">
            {STORY.intro.callsignLabel}
          </label>
          <input
            id="callsign"
            type="text"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canStart) onStart();
            }}
            placeholder={STORY.intro.callsignPlaceholder}
            className="terminal-input"
            maxLength={20}
            autoComplete="off"
            autoFocus
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'callsign-error' : 'callsign-helper'}
          />
          <p id="callsign-helper" className="mt-2 text-left font-mono text-xs text-cyan-brand/40">
            {STORY.intro.callsignHelper}
          </p>
          {error ? (
            <p id="callsign-error" role="alert" className="mt-2 text-left font-mono text-xs text-alert-brand">
              {error}
            </p>
          ) : null}

          <button type="button" disabled={!canStart} onClick={onStart} className="ranger-button mt-6 w-full">
            [ {STORY.intro.startButton} ]
          </button>
        </motion.div>

        <p className="mt-16 font-mono text-[10px] uppercase tracking-widest text-cyan-brand/30">
          {STORY.intro.footer}
        </p>
      </section>
    </main>
  );
}

function CodeRainBackdrop() {
  // Simple placeholder implementation; full parallax version lands in Phase 6.
  const glyphs = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        key: i,
        left: Math.random() * 100,
        delay: Math.random() * 20,
        duration: 20 + Math.random() * 15,
        glyph: ['<tag>', 'def()', '01', '</div>', '==', '#!/', '01010', '<br/>'][
          Math.floor(Math.random() * 8)
        ],
        opacity: 0.08 + Math.random() * 0.1,
      })),
    [],
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {glyphs.map((g) => (
        <span
          key={g.key}
          className="absolute font-mono text-xs text-cyan-brand animate-code-rain"
          style={{
            left: `${g.left}%`,
            opacity: g.opacity,
            animationDelay: `-${g.delay}s`,
            animationDuration: `${g.duration}s`,
          }}
        >
          {g.glyph}
        </span>
      ))}
    </div>
  );
}
