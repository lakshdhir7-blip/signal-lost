/**
 * Audio orchestrator. Uses Web Audio API synth tones as placeholders so the
 * app has the right cue-trigger surface before real .mp3 assets are delivered
 * in Phase 6 polish. Swap in Howler.js + sprite sheet at that point without
 * changing any caller code (see cues.ts).
 */

import { useSessionStore } from '@/state/session';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function effectiveVolume(channel: 'sfx' | 'music' | 'voice'): number {
  const s = useSessionStore.getState().settings;
  const ch = channel === 'sfx' ? s.sfxVolume : channel === 'music' ? s.musicVolume : s.voiceVolume;
  return Math.max(0, Math.min(1, s.masterVolume * ch));
}

interface Tone {
  freq: number;
  duration: number; // seconds
  type?: OscillatorType;
  volume?: number; // 0-1, multiplied with channel volume
  sweepTo?: number; // target frequency for linear sweep
  delay?: number; // seconds from "now"
}

function playTone({ freq, duration, type = 'sine', volume = 0.25, sweepTo, delay = 0 }: Tone) {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const gainNode = c.createGain();
  const osc = c.createOscillator();
  const now = c.currentTime + delay;
  const baseVol = volume * effectiveVolume('sfx');
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (sweepTo !== undefined) osc.frequency.linearRampToValueAtTime(sweepTo, now + duration);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(baseVol, now + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);
  osc.connect(gainNode).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export const synthCues = {
  click: () => playTone({ freq: 880, duration: 0.05, type: 'square', volume: 0.15 }),
  hover: () => playTone({ freq: 1200, duration: 0.03, type: 'sine', volume: 0.08 }),
  correct: () => {
    // Rising 5-note arpeggio (C-E-G-C-E)
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, i) =>
      playTone({ freq, duration: 0.15, type: 'triangle', volume: 0.3, delay: i * 0.08 }),
    );
  },
  wrong: () => {
    playTone({ freq: 220, duration: 0.3, type: 'sawtooth', volume: 0.25, sweepTo: 110 });
  },
  hintRequest: () => {
    playTone({ freq: 880, duration: 0.25, type: 'sine', volume: 0.2, sweepTo: 440 });
  },
  lockClunk: () => {
    playTone({ freq: 80, duration: 0.2, type: 'square', volume: 0.35 });
    playTone({ freq: 160, duration: 0.08, type: 'sine', volume: 0.2, delay: 0.15 });
  },
  whoosh: () => {
    playTone({ freq: 400, duration: 0.4, type: 'sawtooth', volume: 0.15, sweepTo: 1200 });
  },
  /** Big celebration burst — fires when the master phrase is accepted. */
  disarmSuccess: () => {
    // Bass drop
    playTone({ freq: 220, duration: 1.2, type: 'sawtooth', volume: 0.35, sweepTo: 55 });
    // Bright chord stack
    playTone({ freq: 523.25, duration: 1.0, type: 'triangle', volume: 0.3, delay: 0.2 });
    playTone({ freq: 659.25, duration: 1.0, type: 'triangle', volume: 0.3, delay: 0.2 });
    playTone({ freq: 783.99, duration: 1.0, type: 'triangle', volume: 0.3, delay: 0.2 });
    playTone({ freq: 1046.5, duration: 1.2, type: 'triangle', volume: 0.35, delay: 0.25 });
    // Triumphant arpeggio
    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    arp.forEach((f, i) =>
      playTone({ freq: f, duration: 0.3, type: 'triangle', volume: 0.35, delay: 1.2 + i * 0.18 }),
    );
  },
} as const;

// --- Victory anthem (looping ambient pad + arpeggio) ---
let anthemHandle: number | null = null;

function playAnthemChord(beat: number) {
  const c = getContext();
  if (!c) return;
  // Alternate between I and V for a satisfying back-and-forth
  const chords = [
    [261.63, 329.63, 392.0, 523.25], // C major
    [392.0, 493.88, 587.33, 783.99], // G major
    [220.0, 277.18, 329.63, 440.0], // A minor
    [349.23, 440.0, 523.25, 698.46], // F major
  ];
  const chord = chords[beat % chords.length]!;
  const vol = 0.18 * effectiveVolume('music');
  chord.forEach((freq, i) => {
    playTone({
      freq,
      duration: 2.2,
      type: 'triangle',
      volume: (vol * (0.8 + Math.random() * 0.4)) / (1 + i * 0.2),
    });
  });
  // Sparkle on top
  const sparkle = chord[3]!;
  playTone({ freq: sparkle * 2, duration: 0.25, type: 'sine', volume: vol * 0.6, delay: 0.05 });
  playTone({ freq: sparkle * 2.5, duration: 0.2, type: 'sine', volume: vol * 0.5, delay: 0.5 });
}

export function startVictoryAnthem() {
  stopVictoryAnthem();
  let beat = 0;
  // Play immediately, then loop every 2.4s
  playAnthemChord(beat++);
  anthemHandle = window.setInterval(() => {
    playAnthemChord(beat++);
  }, 2400);
}

export function stopVictoryAnthem() {
  if (anthemHandle !== null) {
    window.clearInterval(anthemHandle);
    anthemHandle = null;
  }
}

// --- Runner game music (driving synthwave loop) ---
let runnerHandle: number | null = null;

/**
 * Play one bar of the runner loop at ~160 BPM.
 * A-minor chugging bass plus an offbeat arpeggio = forward-motion feel.
 */
function playRunnerBar(bar: number) {
  const c = getContext();
  if (!c) return;
  const musicVol = effectiveVolume('music');
  if (musicVol < 0.01) return;

  const bassPatterns = [
    [55.0, 55.0, 65.41, 82.41], // A1 A1 C2 E2
    [55.0, 73.42, 55.0, 82.41], // A1 D2 A1 E2
    [49.0, 49.0, 55.0, 65.41], // G1 G1 A1 C2
    [55.0, 65.41, 73.42, 82.41], // A1 C2 D2 E2 (rising)
  ];
  const bass = bassPatterns[bar % bassPatterns.length]!;
  bass.forEach((freq, i) => {
    playTone({
      freq,
      duration: 0.15,
      type: 'square',
      volume: 0.25 * musicVol,
      delay: i * 0.19,
    });
  });

  const arpPatterns = [
    [440.0, 523.25, 659.25, 523.25, 659.25, 783.99, 659.25, 880.0],
    [659.25, 587.33, 523.25, 493.88, 440.0, 523.25, 587.33, 659.25],
    [659.25, 880.0, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99],
    [880.0, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99, 1046.5],
  ];
  const arp = arpPatterns[bar % arpPatterns.length]!;
  arp.forEach((freq, i) => {
    playTone({
      freq,
      duration: 0.1,
      type: 'triangle',
      volume: 0.11 * musicVol,
      delay: i * 0.095 + 0.045,
    });
  });

  if (bar % 2 === 1) {
    playTone({
      freq: 1318.51,
      duration: 0.2,
      type: 'sine',
      volume: 0.1 * musicVol,
      delay: 0.4,
    });
  }
}

export function startRunnerMusic() {
  stopRunnerMusic();
  let bar = 0;
  playRunnerBar(bar++);
  runnerHandle = window.setInterval(() => {
    playRunnerBar(bar++);
  }, 760);
}

export function stopRunnerMusic() {
  if (runnerHandle !== null) {
    window.clearInterval(runnerHandle);
    runnerHandle = null;
  }
}

/** Ducking: pause tone playback when tab is hidden. */
export function installAudioDucking() {
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    const c = getContext();
    if (!c) return;
    if (document.hidden) {
      void c.suspend();
    } else {
      void c.resume();
    }
  });
}
