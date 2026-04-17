/**
 * Text-to-speech helper. Uses the browser's built-in SpeechSynthesis.
 * Words are spoken only when `enabled` is true. A global mute toggle in
 * the Zustand settings slice flips this.
 */

let enabled = true;
let lastText: string | null = null;
let preferredVoice: SpeechSynthesisVoice | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  if (!('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  const enUS = voices.find((v) => v.lang.startsWith('en-US') && v.default);
  const anyEn = voices.find((v) => v.lang.startsWith('en'));
  return enUS ?? anyEn ?? voices[0] ?? null;
}

export function initSpeech() {
  const synth = getSynth();
  if (!synth) return;
  preferredVoice = pickVoice();
  // Voices load async in some browsers
  synth.onvoiceschanged = () => {
    preferredVoice = pickVoice();
  };
}

export function setReadAloudEnabled(on: boolean) {
  enabled = on;
  if (!on) cancelSpeak();
}

export function speak(
  text: string | null | undefined,
  opts: { rate?: number; pitch?: number } = {},
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!enabled) {
      resolve();
      return;
    }
    const synth = getSynth();
    if (!synth) {
      resolve();
      return;
    }
    const clean = (text ?? '').toString().trim();
    if (!clean) {
      resolve();
      return;
    }
    if (clean === lastText) {
      resolve();
      return;
    }
    lastText = clean;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = opts.rate ?? 0.95;
    utter.pitch = opts.pitch ?? 1.0;
    utter.volume = 1.0;
    if (preferredVoice) utter.voice = preferredVoice;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    synth.speak(utter);
  });
}

export function cancelSpeak() {
  const synth = getSynth();
  if (!synth) return;
  try {
    synth.cancel();
  } catch {
    // ignore
  }
  lastText = null;
}

export function speechSupported(): boolean {
  return getSynth() !== null;
}
