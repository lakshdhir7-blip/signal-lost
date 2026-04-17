const BANNED_SUBSTRINGS: string[] = [
  'claude',
  'anthropic',
  'chatgpt',
  'gpt-',
  'openai',
  'language model',
  'large language model',
];

// Conservative middle-school-safe wordlist (CC0 subset). Extend before event.
const PROFANITY_LIST = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'dick',
  'slut',
  'whore',
  'nigg',
];

export interface SanitizeResult {
  text: string;
  flagged: boolean;
  reasons: string[];
}

export function sanitizeHint(raw: string, internalSolutionSnippets: string[]): SanitizeResult {
  let out = raw;
  const reasons: string[] = [];

  // Strip em/en dashes
  if (/[—–]/.test(out)) {
    reasons.push('dash_strip');
    out = out.replace(/—/g, ', ').replace(/–/g, ', ');
  }

  // Remove banned forbidden words (model-name leaks)
  const lowered = out.toLowerCase();
  for (const banned of BANNED_SUBSTRINGS) {
    if (lowered.includes(banned)) {
      reasons.push(`banned:${banned}`);
      const re = new RegExp(banned, 'ig');
      out = out.replace(re, 'BYTE');
    }
  }

  // Profanity check
  const loweredClean = out.toLowerCase();
  for (const bad of PROFANITY_LIST) {
    if (loweredClean.includes(bad)) {
      reasons.push(`profanity:${bad}`);
    }
  }

  // Solution-leak detection
  for (const snippet of internalSolutionSnippets) {
    if (snippet.length >= 12 && out.toLowerCase().includes(snippet.toLowerCase())) {
      reasons.push('solution_leak');
      break;
    }
  }

  // Length cap
  if (out.length > 600) {
    reasons.push('length_cap');
    out = out.slice(0, 600);
  }

  return { text: out.trim(), flagged: reasons.length > 0, reasons };
}

/** Extract short candidate snippets from an internal-solution block for leak detection. */
export function extractSolutionSnippets(internalSolution: string): string[] {
  return internalSolution
    .split(/\n|[.;]/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && /[a-z0-9]/i.test(l))
    .slice(0, 10);
}
