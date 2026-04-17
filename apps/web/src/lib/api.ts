import type { PuzzleId } from '@signal-lost/shared/puzzle-ids';
import type { HintResponse } from '@signal-lost/shared/hint-api';
import type { HintTier } from '@/state/session';
import { getPuzzle } from '@/puzzles/registry';

export interface HintCallInput {
  sessionId: string;
  puzzleId: PuzzleId;
  tier: HintTier;
  userMessage: string;
  studentDraft: string;
  priorHints: ReadonlyArray<{ tier: HintTier; hint: string }>;
  puzzleState?: string;
}

export interface HintCallOutput extends HintResponse {
  offline: boolean;
}

export async function requestHint(input: HintCallInput): Promise<HintCallOutput> {
  try {
    const res = await fetch('/api/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.status === 429) {
      const body = (await res.json()) as { message?: string };
      return {
        hint: body.message ?? 'you have used all your hints on this puzzle.',
        tier: input.tier,
        source: 'kill-switch',
        offline: false,
      };
    }
    if (!res.ok) {
      return fallback(input.puzzleId, input.tier);
    }
    const data = (await res.json()) as HintResponse;
    return { ...data, offline: false };
  } catch {
    return fallback(input.puzzleId, input.tier);
  }
}

function fallback(puzzleId: PuzzleId, tier: HintTier): HintCallOutput {
  const puzzle = getPuzzle(puzzleId);
  const hint = puzzle.fallbackHints[tier - 1] ?? puzzle.fallbackHints[0];
  return {
    hint,
    tier,
    source: 'fallback',
    offline: true,
  };
}
