import { useSessionStore, useSettings } from '@/state/session';
import { cancelSpeak } from '@/lib/speech';
import { cues } from '@/audio/cues';

/**
 * Big visible speaker toggle. Click to mute or unmute the voice that
 * reads words on the screen.
 */
export function ReadAloudButton({ className = '' }: { className?: string }) {
  const settings = useSettings();
  const update = useSessionStore((s) => s.updateSettings);
  const toggle = () => {
    cues.click();
    const next = !settings.readAloud;
    if (!next) cancelSpeak();
    update({ readAloud: next });
  };
  return (
    <button
      type="button"
      aria-pressed={settings.readAloud}
      aria-label={settings.readAloud ? 'Voice on. Click to mute voice.' : 'Voice off. Click to turn voice on.'}
      title={settings.readAloud ? 'Voice on (click to mute)' : 'Voice off (click to turn on)'}
      onClick={toggle}
      className={`flex items-center gap-2 border-2 px-3 py-1 font-mono text-xs transition-colors ${
        settings.readAloud
          ? 'border-cyan-brand bg-cyan-brand/10 text-cyan-brand'
          : 'border-cyan-brand/30 bg-navy-deep text-cyan-brand/50'
      } ${className}`}
    >
      <span aria-hidden="true">{settings.readAloud ? '🔊' : '🔇'}</span>
      <span>{settings.readAloud ? 'VOICE ON' : 'VOICE OFF'}</span>
    </button>
  );
}
