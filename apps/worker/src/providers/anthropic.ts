import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserMessage } from '../prompts';
import type { HintProvider, HintProviderInput, HintProviderOutput } from './types';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 300;

export function createAnthropicProvider(apiKey: string): HintProvider {
  const client = new Anthropic({ apiKey });

  async function generate(input: HintProviderInput): Promise<HintProviderOutput> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(input.puzzleId),
      messages: input.strictRetry
        ? [
            {
              role: 'user',
              content: buildUserMessage({ ...input, puzzleState: input.puzzleState }),
            },
            {
              role: 'assistant',
              content: '(previous attempt leaked the solution)',
            },
            {
              role: 'user',
              content:
                'That was too close to the answer. Rephrase as a guiding question only, no code, no direct mention of the solution.',
            },
          ]
        : [
            {
              role: 'user',
              content: buildUserMessage(input),
            },
          ],
    });
    const first = response.content.find((b) => b.type === 'text');
    const text = first && first.type === 'text' ? first.text : '';
    return { text };
  }

  return { name: 'anthropic', generate };
}
