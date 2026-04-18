import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { z } from 'zod';
import { PUZZLE_IDS, type PuzzleId, PUZZLE_META } from '@signal-lost/shared/puzzle-ids';

// ---------- Explicit TS types (not inferred from Zod, so records stay fully keyed) ----------

export type HintTier = 1 | 2 | 3;

export interface HintHistoryEntry {
  tier: HintTier;
  userMessage: string;
  hint: string;
  at: number;
}

export interface PuzzleProgress {
  status: 'locked' | 'unlocked' | 'solved';
  startedAt: number | null;
  solvedAt: number | null;
  attempts: number;
  hintsUsed: number;
  hintHistory: HintHistoryEntry[];
  codeWord: string | null;
  draft?: string;
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  dyslexiaFont: boolean;
  captions: boolean;
  scanlines: boolean;
  readAloud: boolean;
}

export interface SessionState {
  sessionId: string;
  callsign: string;
  startedAt: number | null;
  disarmedAt: number | null;
  currentScreen: 'intro' | 'cinematic' | 'puzzle' | 'disarm' | 'victory';
  currentPuzzleId: PuzzleId | null;
  puzzles: Record<PuzzleId, PuzzleProgress>;
  /** Freeform text per puzzle, pushed by the puzzle component so BYTE can
   *  reference live state (test results, validator flags, sim result). */
  byteContext: Partial<Record<PuzzleId, string>>;
  hasSeenCinematic: boolean;
  audioUnlocked: boolean;
  settings: Settings;
  /** Best endless-runner survival time in ms this session. */
  runnerBestMs: number;
  version: number;
}

// ---------- Zod schemas (only for rehydration validation) ----------

const HintHistoryEntrySchema: z.ZodType<HintHistoryEntry> = z.object({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  userMessage: z.string(),
  hint: z.string(),
  at: z.number(),
});

const PuzzleProgressSchema: z.ZodType<PuzzleProgress> = z.object({
  status: z.enum(['locked', 'unlocked', 'solved']),
  startedAt: z.number().nullable(),
  solvedAt: z.number().nullable(),
  attempts: z.number(),
  hintsUsed: z.number().int().min(0).max(5),
  hintHistory: z.array(HintHistoryEntrySchema),
  codeWord: z.string().nullable(),
  draft: z.string().optional(),
});

const SettingsSchema: z.ZodType<Settings> = z.object({
  masterVolume: z.number().min(0).max(1),
  musicVolume: z.number().min(0).max(1),
  sfxVolume: z.number().min(0).max(1),
  voiceVolume: z.number().min(0).max(1),
  reducedMotion: z.boolean(),
  highContrast: z.boolean(),
  fontSize: z.enum(['sm', 'md', 'lg']),
  dyslexiaFont: z.boolean(),
  captions: z.boolean(),
  scanlines: z.boolean(),
  readAloud: z.boolean(),
});

const PuzzlesMapSchema = z.object({
  p1: PuzzleProgressSchema,
  p2: PuzzleProgressSchema,
  p3: PuzzleProgressSchema,
  p4: PuzzleProgressSchema,
  p5: PuzzleProgressSchema,
}) satisfies z.ZodType<Record<PuzzleId, PuzzleProgress>>;

const SessionStateSchema = z.object({
  sessionId: z.string().uuid(),
  callsign: z.string(),
  startedAt: z.number().nullable(),
  disarmedAt: z.number().nullable(),
  currentScreen: z.enum(['intro', 'cinematic', 'puzzle', 'disarm', 'victory']),
  currentPuzzleId: z.enum(PUZZLE_IDS).nullable(),
  puzzles: PuzzlesMapSchema,
  byteContext: z.record(z.enum(PUZZLE_IDS), z.string()).default({}),
  hasSeenCinematic: z.boolean(),
  audioUnlocked: z.boolean(),
  settings: SettingsSchema,
  runnerBestMs: z.number().min(0).default(0),
  version: z.number(),
});

// ---------- Actions ----------

type Actions = {
  setCallsign: (callsign: string) => void;
  resetSession: () => void;
  markCinematicSeen: () => void;
  markAudioUnlocked: () => void;
  startPuzzle: (id: PuzzleId) => void;
  recordAttempt: (id: PuzzleId) => void;
  solvePuzzle: (id: PuzzleId) => void;
  saveDraft: (id: PuzzleId, draft: string) => void;
  recordHint: (id: PuzzleId, entry: HintHistoryEntry) => void;
  markDisarmed: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setByteContext: (id: PuzzleId, context: string) => void;
  setRunnerBest: (ms: number) => void;
};

type Store = SessionState & Actions;

// ---------- Defaults ----------

const STORAGE_VERSION = 1;
const STORAGE_KEY = 'codeio2026:session';

function makeInitialPuzzles(): Record<PuzzleId, PuzzleProgress> {
  return {
    p1: blankProgress('unlocked'),
    p2: blankProgress('locked'),
    p3: blankProgress('locked'),
    p4: blankProgress('locked'),
    p5: blankProgress('locked'),
  };
}

function blankProgress(status: PuzzleProgress['status']): PuzzleProgress {
  return {
    status,
    startedAt: null,
    solvedAt: null,
    attempts: 0,
    hintsUsed: 0,
    hintHistory: [],
    codeWord: null,
  };
}

function makeInitialState(): SessionState {
  return {
    sessionId: crypto.randomUUID(),
    callsign: '',
    startedAt: null,
    disarmedAt: null,
    currentScreen: 'intro',
    currentPuzzleId: null,
    puzzles: makeInitialPuzzles(),
    byteContext: {},
    hasSeenCinematic: false,
    audioUnlocked: false,
    settings: {
      masterVolume: 0.7,
      musicVolume: 0.3,
      sfxVolume: 0.7,
      voiceVolume: 0.8,
      reducedMotion: false,
      highContrast: false,
      fontSize: 'md',
      dyslexiaFont: false,
      captions: true,
      scanlines: false,
      readAloud: true,
    },
    runnerBestMs: 0,
    version: STORAGE_VERSION,
  };
}

// ---------- Store ----------

export const useSessionStore = create<Store>()(
  persist(
    (set) => ({
      ...makeInitialState(),

      setCallsign: (callsign) =>
        set(() => ({ callsign: callsign.trim().slice(0, 20) })),

      resetSession: () => set(() => makeInitialState()),

      markCinematicSeen: () =>
        set((state) => ({
          hasSeenCinematic: true,
          startedAt: state.startedAt ?? Date.now(),
          currentScreen: 'puzzle',
          currentPuzzleId: 'p1',
        })),

      markAudioUnlocked: () => set(() => ({ audioUnlocked: true })),

      startPuzzle: (id) =>
        set((state) => {
          const existing = state.puzzles[id];
          if (existing.status === 'locked') return {};
          return {
            currentScreen: 'puzzle',
            currentPuzzleId: id,
            puzzles: {
              ...state.puzzles,
              [id]: {
                ...existing,
                startedAt: existing.startedAt ?? Date.now(),
              },
            },
          };
        }),

      recordAttempt: (id) =>
        set((state) => ({
          puzzles: {
            ...state.puzzles,
            [id]: {
              ...state.puzzles[id],
              attempts: state.puzzles[id].attempts + 1,
            },
          },
        })),

      solvePuzzle: (id) =>
        set((state) => {
          const puzzle = state.puzzles[id];
          if (puzzle.status === 'solved') return {};
          const next: Record<PuzzleId, PuzzleProgress> = { ...state.puzzles };
          next[id] = {
            ...puzzle,
            status: 'solved',
            solvedAt: Date.now(),
            codeWord: PUZZLE_META[id].codeWord,
          };
          const idx = PUZZLE_IDS.indexOf(id);
          const nextId = PUZZLE_IDS[idx + 1];
          if (nextId) {
            const n = next[nextId];
            if (n.status === 'locked') {
              next[nextId] = { ...n, status: 'unlocked' };
            }
          }
          return { puzzles: next };
        }),

      saveDraft: (id, draft) =>
        set((state) => ({
          puzzles: {
            ...state.puzzles,
            [id]: { ...state.puzzles[id], draft },
          },
        })),

      recordHint: (id, entry) =>
        set((state) => {
          const puzzle = state.puzzles[id];
          const nextCount = Math.min(5, puzzle.hintsUsed + 1);
          return {
            puzzles: {
              ...state.puzzles,
              [id]: {
                ...puzzle,
                hintsUsed: nextCount,
                hintHistory: [...puzzle.hintHistory, entry],
              },
            },
          };
        }),

      markDisarmed: () => set(() => ({ disarmedAt: Date.now(), currentScreen: 'victory' })),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      setByteContext: (id, context) =>
        set((state) => ({
          byteContext: { ...state.byteContext, [id]: context.slice(0, 2000) },
        })),

      setRunnerBest: (ms) =>
        set((state) => ({
          runnerBestMs: Math.max(state.runnerBestMs, Math.floor(ms)),
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: STORAGE_VERSION,
      migrate: (persistedState, version) => {
        if (version !== STORAGE_VERSION) return makeInitialState();
        const parsed = SessionStateSchema.safeParse(persistedState);
        if (!parsed.success) {
          console.warn('[session] Persisted state failed validation; resetting.', parsed.error);
          return makeInitialState();
        }
        return parsed.data;
      },
      partialize: (state) => ({
        sessionId: state.sessionId,
        callsign: state.callsign,
        startedAt: state.startedAt,
        disarmedAt: state.disarmedAt,
        currentScreen: state.currentScreen,
        currentPuzzleId: state.currentPuzzleId,
        puzzles: state.puzzles,
        byteContext: state.byteContext,
        hasSeenCinematic: state.hasSeenCinematic,
        audioUnlocked: state.audioUnlocked,
        settings: state.settings,
        runnerBestMs: state.runnerBestMs,
        version: state.version,
      }),
    },
  ),
);

// ---------- Selectors ----------

export const useCallsign = () => useSessionStore((s) => s.callsign);
export const useSettings = () => useSessionStore((s) => s.settings);
export const usePuzzleProgress = (id: PuzzleId) => useSessionStore((s) => s.puzzles[id]);
export const useAllPuzzles = () => useSessionStore((s) => s.puzzles);
export const useHasSeenCinematic = () => useSessionStore((s) => s.hasSeenCinematic);

export const useAllPuzzlesSolved = () =>
  useSessionStore((s) => Object.values(s.puzzles).every((p) => p.status === 'solved'));
