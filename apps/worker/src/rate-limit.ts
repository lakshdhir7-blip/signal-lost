import type { Env } from './env';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  cap: number;
}

const TTL_SECONDS = 60 * 60 * 4; // 4 hours

// Per-puzzle hint caps. Palindrome (p5) gets 5, everything else gets 3.
const CAPS: Record<string, number> = {
  p1: 3,
  p2: 3,
  p3: 3,
  p4: 3,
  p5: 5,
};
const DEFAULT_CAP = 3;

/**
 * Increments a per-session per-puzzle counter in Workers KV. If KV is not
 * configured (e.g., dev environment without binding), the check falls open.
 */
export async function checkHintRateLimit(
  env: Env,
  sessionId: string,
  puzzleId: string,
): Promise<RateLimitResult> {
  const cap = CAPS[puzzleId] ?? DEFAULT_CAP;
  if (!env.HINT_LIMITS) {
    return { allowed: true, count: 0, cap };
  }
  const key = `hint:${sessionId}:${puzzleId}`;
  const existing = await env.HINT_LIMITS.get(key);
  const count = existing ? Number(existing) : 0;
  if (count >= cap) {
    return { allowed: false, count, cap };
  }
  const next = count + 1;
  await env.HINT_LIMITS.put(key, String(next), { expirationTtl: TTL_SECONDS });
  return { allowed: true, count: next, cap };
}
