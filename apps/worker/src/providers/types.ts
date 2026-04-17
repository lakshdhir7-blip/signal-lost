import type { PuzzleId } from '@signal-lost/shared/puzzle-ids';

export interface HintProviderInput {
  puzzleId: PuzzleId;
  tier: 1 | 2 | 3;
  studentDraft: string;
  userMessage: string;
  priorHints: ReadonlyArray<{ tier: 1 | 2 | 3; hint: string }>;
  puzzleState?: string;
  strictRetry?: boolean; // Set on the sanitizer-triggered second call
}

export interface HintProviderOutput {
  text: string;
}

export interface HintProvider {
  name: 'anthropic' | 'gemini';
  generate: (input: HintProviderInput) => Promise<HintProviderOutput>;
}
