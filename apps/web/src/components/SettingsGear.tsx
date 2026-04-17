import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSessionStore, useSettings, type Settings } from '@/state/session';
import { cues } from '@/audio/cues';

type Channel = 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'voiceVolume';

type BoolKey = 'reducedMotion' | 'highContrast' | 'dyslexiaFont' | 'captions' | 'scanlines' | 'readAloud';

export function SettingsGear() {
  const [open, setOpen] = useState(false);
  const settings = useSettings();
  const updateSettings = useSessionStore((s) => s.updateSettings);
  const hasSeenCinematic = useSessionStore((s) => s.hasSeenCinematic);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggleBool = (key: BoolKey) => () => {
    cues.click();
    updateSettings({ [key]: !settings[key] });
  };

  const setVolume = (channel: Channel) => (value: number) => {
    updateSettings({ [channel]: value });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open settings"
        onClick={() => {
          cues.click();
          setOpen(true);
        }}
        className="fixed right-4 top-[8px] z-40 flex h-8 w-8 items-center justify-center rounded-full border-2 border-cyan-brand/40 bg-navy-brand/80 text-cyan-brand backdrop-blur hover:border-cyan-brand hover:text-magenta-brand"
      >
        <span aria-hidden="true" className="font-display text-sm leading-none">
          ⚙
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-heading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md border-2 border-cyan-brand bg-navy-brand p-6 text-cyan-brand"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id="settings-heading" className="font-display text-lg text-magenta-brand">
                  SETTINGS
                </h2>
                <button
                  type="button"
                  aria-label="Close settings"
                  onClick={() => setOpen(false)}
                  className="font-mono text-cyan-brand/60 hover:text-cyan-brand"
                >
                  ✕
                </button>
              </div>

              <section className="mb-5">
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-cyan-brand/70">
                  Audio
                </h3>
                <VolumeRow label="Master" value={settings.masterVolume} onChange={setVolume('masterVolume')} />
                <VolumeRow label="Music" value={settings.musicVolume} onChange={setVolume('musicVolume')} />
                <VolumeRow label="SFX" value={settings.sfxVolume} onChange={setVolume('sfxVolume')} />
                <VolumeRow label="Voice" value={settings.voiceVolume} onChange={setVolume('voiceVolume')} />
              </section>

              <section className="mb-5">
                <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-cyan-brand/70">
                  Accessibility
                </h3>
                <ToggleRow
                  label="Read words out loud"
                  value={settings.readAloud}
                  onChange={toggleBool('readAloud')}
                />
                <ToggleRow
                  label="Less motion"
                  value={settings.reducedMotion}
                  onChange={toggleBool('reducedMotion')}
                />
                <ToggleRow
                  label="Stronger colors"
                  value={settings.highContrast}
                  onChange={toggleBool('highContrast')}
                />
                <ToggleRow
                  label="Easy-read font"
                  value={settings.dyslexiaFont}
                  onChange={toggleBool('dyslexiaFont')}
                />
                <ToggleRow
                  label="Captions"
                  value={settings.captions}
                  onChange={toggleBool('captions')}
                />
                <ToggleRow
                  label="Old TV lines"
                  value={settings.scanlines}
                  onChange={toggleBool('scanlines')}
                />
                <FontSizeRow
                  value={settings.fontSize}
                  onChange={(v) => updateSettings({ fontSize: v })}
                />
              </section>

              {hasSeenCinematic ? (
                <div className="mb-2 rounded border border-cyan-brand/20 bg-navy-deep/60 p-3 text-xs text-cyan-brand/60">
                  You have already seen the cinematic. Replays can skip it from the start screen.
                </div>
              ) : null}

              <p className="text-center font-mono text-[10px] uppercase tracking-widest text-cyan-brand/40">
                press ESC to close
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function VolumeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="mb-2 flex items-center justify-between gap-4 font-mono text-sm">
      <span className="text-cyan-brand/80">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 accent-magenta-brand"
        aria-label={`${label} volume`}
      />
      <span className="w-10 text-right text-cyan-brand/60">{Math.round(value * 100)}</span>
    </label>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={onChange}
      className="mb-2 flex w-full items-center justify-between border border-cyan-brand/20 bg-navy-deep/40 px-3 py-2 font-mono text-sm text-cyan-brand/80 transition-colors hover:border-cyan-brand"
    >
      <span>{label}</span>
      <span
        className={`flex h-5 w-10 items-center rounded-full border-2 ${
          value ? 'border-magenta-brand bg-magenta-brand/30' : 'border-cyan-brand/30 bg-navy-deep'
        }`}
      >
        <span
          aria-hidden="true"
          className={`ml-0.5 h-3.5 w-3.5 rounded-full transition-transform ${
            value ? 'translate-x-5 bg-magenta-brand' : 'bg-cyan-brand/50'
          }`}
        />
      </span>
    </button>
  );
}

function FontSizeRow({
  value,
  onChange,
}: {
  value: Settings['fontSize'];
  onChange: (v: Settings['fontSize']) => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between font-mono text-sm">
      <span className="text-cyan-brand/80">Font size</span>
      <div className="flex gap-1">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            aria-pressed={value === size}
            className={`border-2 px-3 py-1 ${
              value === size
                ? 'border-magenta-brand bg-magenta-brand/10 text-magenta-brand'
                : 'border-cyan-brand/30 text-cyan-brand/60 hover:border-cyan-brand'
            }`}
          >
            {size.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
