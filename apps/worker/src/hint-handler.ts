import type { Context } from 'hono';
import {
  HintRequestSchema,
  type HintResponse,
} from '@signal-lost/shared/hint-api';
import type { Env } from './env';
import { extractSolutionSnippets, sanitizeHint } from './sanitize';
import { stripInjection } from './injection-filter';
import { checkHintRateLimit } from './rate-limit';
import { selectProvider } from './providers';

// Internal solution hints used ONLY for the leak-detection sanitizer;
// never sent to the model or client.
const INTERNAL_SOLUTION_BY_PUZZLE: Record<string, string> = {
  p1: 'close h1 with </h1>, close li with </li>, close td with </td>, fix bottom </html>, wrap in html/head/body',
  p2: "any(c.isdigit() for c in pw) + any(c.isupper() for c in pw) + any(c in '!@#$%' for c in pw) + 3 ordered ifs",
  p3: 'GOODBYE (seven letters decoded from 7 ASCII bytes)',
  p4: 'turn_left move_forward pick_up_chip turn_right repeat 2 [move_forward pick_up] move_forward turn_left repeat 3 [move_forward] turn_right move_forward',
  p5: "cleaned = ''.join(c.lower() for c in phrase if c.isalpha()); return cleaned == cleaned[::-1]",
};

export async function handleHint(c: Context<{ Bindings: Env }>) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json', code: 'validation' }, 400);
  }

  const parsed = HintRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: 'invalid_request', code: 'validation', issues: parsed.error.issues },
      400,
    );
  }

  if (c.env.HINTS_DISABLED === 'true') {
    return c.json<HintResponse>({
      hint: "BYTE's signal is weak right now. check your puzzle briefing for a tip.",
      tier: parsed.data.tier,
      source: 'kill-switch',
    });
  }

  const { sessionId, puzzleId, tier, userMessage, studentDraft, priorHints, puzzleState } =
    parsed.data;

  const rate = await checkHintRateLimit(c.env, sessionId, puzzleId);
  if (!rate.allowed) {
    return c.json(
      {
        error: 'rate_limit',
        code: 'rate_limit',
        message: `you have used all ${rate.cap} hints for this puzzle. give it another shot.`,
      },
      429,
    );
  }

  const provider = selectProvider(c.env);
  if (!provider) {
    return c.json(
      {
        error: 'upstream_unavailable',
        code: 'upstream',
        message: 'BYTE is warming up. use the offline tip.',
      },
      503,
    );
  }

  const cleanedUserMessage = stripInjection(userMessage).cleaned;
  const cleanedDraft = stripInjection(studentDraft).cleaned.slice(0, 2500);
  const snippets = extractSolutionSnippets(INTERNAL_SOLUTION_BY_PUZZLE[puzzleId] ?? '');

  try {
    const first = await provider.generate({
      puzzleId,
      tier,
      studentDraft: cleanedDraft,
      userMessage: cleanedUserMessage,
      priorHints,
      puzzleState,
    });
    const sanitized = sanitizeHint(first.text, snippets);

    if (sanitized.reasons.includes('solution_leak')) {
      const retry = await provider.generate({
        puzzleId,
        tier,
        studentDraft: cleanedDraft,
        userMessage: cleanedUserMessage,
        priorHints,
        puzzleState,
        strictRetry: true,
      });
      const retrySanitized = sanitizeHint(retry.text, snippets);
      if (retrySanitized.reasons.includes('solution_leak')) {
        return c.json<HintResponse>({
          hint: "BYTE's signal is weak. use your puzzle briefing's offline tip for this tier.",
          tier,
          source: 'fallback',
        });
      }
      auditLog(c.env, {
        sessionId,
        puzzleId,
        tier,
        text: retrySanitized.text,
        flagged: retrySanitized.reasons,
      });
      return c.json<HintResponse>({ hint: retrySanitized.text, tier, source: 'model' });
    }

    auditLog(c.env, { sessionId, puzzleId, tier, text: sanitized.text, flagged: sanitized.reasons });
    return c.json<HintResponse>({ hint: sanitized.text, tier, source: 'model' });
  } catch (err) {
    console.error(`[hint] ${provider.name} error:`, err);
    return c.json(
      {
        error: 'upstream_error',
        code: 'upstream',
        message: 'BYTE lost signal for a moment. try the offline tip.',
      },
      503,
    );
  }
}

interface AuditEvent {
  sessionId: string;
  puzzleId: string;
  tier: number;
  text: string;
  flagged: string[];
}

function auditLog(env: Env, event: AuditEvent) {
  if (!env.HINT_AUDIT) return;
  try {
    env.HINT_AUDIT.writeDataPoint({
      blobs: [event.sessionId, event.puzzleId, event.text.slice(0, 200), event.flagged.join(',')],
      doubles: [event.tier],
      indexes: [event.puzzleId],
    });
  } catch (err) {
    console.warn('[hint] audit log failed', err);
  }
}
