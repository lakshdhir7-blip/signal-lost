import { z } from 'zod';
import { PuzzleIdSchema } from './puzzle-ids.js';

export const HintTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type HintTier = z.infer<typeof HintTierSchema>;

export const PriorHintSchema = z.object({
  tier: HintTierSchema,
  hint: z.string().max(500),
});

export const HintRequestSchema = z.object({
  sessionId: z.string().uuid(),
  puzzleId: PuzzleIdSchema,
  tier: HintTierSchema,
  userMessage: z.string().max(500),
  studentDraft: z.string().max(10_000),
  priorHints: z.array(PriorHintSchema).max(10),
  /**
   * Extra puzzle-specific state BYTE should know about. Plain text summary,
   * e.g. "12 tests pass, 2 fail on Hello world, Hello123" for Python, or
   * "validator flags: closesHtml=false, allLiClosed=true" for HTML.
   */
  puzzleState: z.string().max(2_000).optional(),
});
export type HintRequest = z.infer<typeof HintRequestSchema>;

export const HintResponseSchema = z.object({
  hint: z.string(),
  tier: HintTierSchema,
  source: z.enum(['model', 'fallback', 'kill-switch']),
});
export type HintResponse = z.infer<typeof HintResponseSchema>;

export const HintErrorSchema = z.object({
  error: z.string(),
  code: z.enum(['rate_limit', 'validation', 'upstream', 'unknown']),
});
export type HintError = z.infer<typeof HintErrorSchema>;
