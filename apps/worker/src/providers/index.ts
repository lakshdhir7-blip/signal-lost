import type { Env } from '../env';
import { createAnthropicProvider } from './anthropic';
import { createGeminiProvider } from './gemini';
import type { HintProvider } from './types';

export type { HintProvider, HintProviderInput, HintProviderOutput } from './types';

/**
 * Picks the hint provider based on env:
 *   - explicit MODEL_PROVIDER wins if its key is present
 *   - else Gemini if GEMINI_API_KEY is set
 *   - else Anthropic if ANTHROPIC_API_KEY is set
 *   - else null (triggers offline fallback on the client)
 */
export function selectProvider(env: Env): HintProvider | null {
  const explicit = env.MODEL_PROVIDER;
  if (explicit === 'gemini' && env.GEMINI_API_KEY) {
    return createGeminiProvider(env.GEMINI_API_KEY);
  }
  if (explicit === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return createAnthropicProvider(env.ANTHROPIC_API_KEY);
  }
  if (env.GEMINI_API_KEY) return createGeminiProvider(env.GEMINI_API_KEY);
  if (env.ANTHROPIC_API_KEY) return createAnthropicProvider(env.ANTHROPIC_API_KEY);
  return null;
}
