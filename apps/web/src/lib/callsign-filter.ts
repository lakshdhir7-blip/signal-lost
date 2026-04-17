// Minimal profanity wordlist. Extend before shipping to event.
// CC0 sources: https://github.com/web-mech/badwords (select conservative subset)
const BANNED = new Set<string>([
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'dick',
  'piss',
  'bastard',
  'slut',
  'whore',
  'fag',
  'nigg',
]);

export type CallsignValidation =
  | { ok: true; value: string }
  | { ok: false; reason: 'too_short' | 'too_long' | 'blank' | 'profane' | 'invalid_chars' };

const ALLOWED_PATTERN = /^[\p{L}\p{N}_\- ]+$/u;

export function validateCallsign(raw: string): CallsignValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'blank' };
  if (trimmed.length < 2) return { ok: false, reason: 'too_short' };
  if (trimmed.length > 20) return { ok: false, reason: 'too_long' };
  if (!ALLOWED_PATTERN.test(trimmed)) return { ok: false, reason: 'invalid_chars' };
  const normalized = trimmed.normalize('NFC').toLowerCase();
  for (const bad of BANNED) {
    if (normalized.includes(bad)) return { ok: false, reason: 'profane' };
  }
  return { ok: true, value: trimmed };
}

export const CALLSIGN_ERRORS: Record<
  Exclude<CallsignValidation, { ok: true }>['reason'],
  string
> = {
  blank: 'callsign required, ranger.',
  too_short: 'at least 2 characters.',
  too_long: 'max 20 characters.',
  invalid_chars: 'letters, numbers, spaces, dashes, underscores only.',
  profane: 'pick a different callsign, ranger.',
};
