import { describe, expect, it } from 'vitest';
import { extractSolutionSnippets, sanitizeHint } from './sanitize';

describe('sanitizeHint', () => {
  it('strips em and en dashes', () => {
    const result = sanitizeHint('try this — or not – but think.', []);
    expect(result.text).not.toContain('—');
    expect(result.text).not.toContain('–');
    expect(result.reasons).toContain('dash_strip');
  });

  it('redacts model-name leaks', () => {
    const result = sanitizeHint('I am Claude from Anthropic.', []);
    expect(result.text.toLowerCase()).not.toContain('claude');
    expect(result.text.toLowerCase()).not.toContain('anthropic');
    expect(result.reasons.some((r) => r.startsWith('banned:'))).toBe(true);
  });

  it('flags solution leaks', () => {
    const solution = ["cleaned = ''.join(c.lower() for c in phrase if c.isalpha())"];
    const result = sanitizeHint(
      "the answer is cleaned = ''.join(c.lower() for c in phrase if c.isalpha())",
      solution,
    );
    expect(result.reasons).toContain('solution_leak');
  });

  it('caps length at 600 chars', () => {
    const long = 'a'.repeat(1200);
    const result = sanitizeHint(long, []);
    expect(result.text.length).toBeLessThanOrEqual(600);
    expect(result.reasons).toContain('length_cap');
  });
});

describe('extractSolutionSnippets', () => {
  it('extracts non-trivial lines', () => {
    const snippets = extractSolutionSnippets('close h1 with </h1>\nalso fix li close; add <!DOCTYPE html>');
    expect(snippets.length).toBeGreaterThan(0);
    expect(snippets.every((s) => s.length >= 12)).toBe(true);
  });
});
