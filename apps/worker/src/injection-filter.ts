const INJECTION_MARKERS = [
  '<|im_start|>',
  '<|im_end|>',
  '[INST]',
  '[/INST]',
  '</s>',
  '<|system|>',
  '<|user|>',
  '<|assistant|>',
  '\n\nHuman:',
  '\n\nAssistant:',
];

const INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /you are now [a-z]+/i,
  /disregard (all )?prior/i,
  /act as (a )?new/i,
];

export interface InjectionScan {
  cleaned: string;
  suspicious: boolean;
  hits: string[];
}

export function stripInjection(raw: string): InjectionScan {
  let out = raw;
  const hits: string[] = [];
  for (const marker of INJECTION_MARKERS) {
    if (out.includes(marker)) {
      hits.push(marker);
      const re = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      out = out.replace(re, ' ');
    }
  }
  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(out)) {
      hits.push(pat.toString());
      out = out.replace(pat, '(filtered)');
    }
  }
  return { cleaned: out, suspicious: hits.length > 0, hits };
}
