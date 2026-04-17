import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt, buildUserMessage } from '../prompts';
import type { HintProvider, HintProviderInput, HintProviderOutput } from './types';

// Gemini 2.0 Flash is the cheap/fast tier; upgrade to 2.5-pro if hints feel weak.
const MODEL = 'gemini-2.0-flash';

export function createGeminiProvider(apiKey: string): HintProvider {
  const client = new GoogleGenerativeAI(apiKey);

  async function generate(input: HintProviderInput): Promise<HintProviderOutput> {
    // Gemini takes the system prompt as a plain string, not the structured
    // cache_control array that Anthropic uses. We flatten the blocks here.
    const systemBlocks = buildSystemPrompt(input.puzzleId);
    const systemText = systemBlocks.map((b) => b.text).join('\n\n');

    const model = client.getGenerativeModel({
      model: MODEL,
      systemInstruction: systemText,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.6,
      },
    });

    const userText = input.strictRetry
      ? `${buildUserMessage(input)}

(Your previous response was too close to the solution. Rephrase as a guiding question only, no code, no direct mention of the solution.)`
      : buildUserMessage(input);

    const result = await model.generateContent(userText);
    const text = result.response.text();
    return { text };
  }

  return { name: 'gemini', generate };
}
