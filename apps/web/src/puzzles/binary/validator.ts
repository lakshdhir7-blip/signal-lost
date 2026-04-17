import type { ValidationResult } from '../types';

export const BINARY_BYTES = [
  '01000111', // G
  '01001111', // O
  '01001111', // O
  '01000100', // D
  '01000010', // B
  '01011001', // Y
  '01000101', // E
] as const;

export const EXPECTED_ANSWER = 'GOODBYE';

export function byteToDecimal(byte: string): number {
  if (!/^[01]{8}$/.test(byte)) return NaN;
  return parseInt(byte, 2);
}

export function byteToChar(byte: string): string | null {
  const n = byteToDecimal(byte);
  if (!Number.isFinite(n)) return null;
  if (n < 32 || n > 126) return null;
  return String.fromCharCode(n);
}

export function validateBinaryAnswer(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: 'blank' };
  }
  // Strip ALL non-letter chars (punctuation, spaces, etc.) and uppercase for comparison.
  const cleaned = trimmed.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (cleaned === EXPECTED_ANSWER) return { ok: true };

  // Keep the raw-binary detection BEFORE cleaning so 0s/1s still trigger the right hint.
  if (/^[01\s]+$/.test(trimmed) && trimmed.replace(/\s/g, '').length % 8 === 0) {
    return { ok: false, reason: 'entered_raw_binary', hintableMistake: 'entered_raw_binary' };
  }
  if (cleaned === 'ED') {
    return { ok: false, reason: 'red_herring_last_pin', hintableMistake: 'red_herring_last_pin' };
  }
  if (trimmed.toUpperCase() !== trimmed && cleaned === EXPECTED_ANSWER) {
    return { ok: false, reason: 'case', hintableMistake: 'case' };
  }
  if (cleaned.length > 0 && cleaned.length < EXPECTED_ANSWER.length) {
    return { ok: false, reason: 'too_short', hintableMistake: 'too_short' };
  }
  if (cleaned.length > EXPECTED_ANSWER.length) {
    return { ok: false, reason: 'too_long', hintableMistake: 'too_long' };
  }
  // Count correct letters at the same position (on the cleaned input).
  if (cleaned.length === EXPECTED_ANSWER.length) {
    let matches = 0;
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === EXPECTED_ANSWER[i]) matches++;
    }
    if (matches >= 5) {
      return { ok: false, reason: 'almost_there', hintableMistake: 'almost_there' };
    }
    if (matches >= 3) {
      return { ok: false, reason: 'partial', hintableMistake: 'partial' };
    }
  }
  return { ok: false, reason: 'wrong', hintableMistake: 'wrong' };
}

export const WRONG_ANSWER_HINTS: Record<string, string> = {
  case: 'Right letters, wrong case. ASCII capital letters are 65 to 90. Try uppercase.',
  red_herring_last_pin:
    "You used the 'last used PIN' from the manual. That is a red herring. Decode the 7 binary rows in the memory dump.",
  entered_raw_binary:
    'You entered the 1s and 0s, not the decoded letters. Convert each byte to its ASCII letter first.',
  too_short: 'You did not decode all 7 rows. The answer is 7 letters long.',
  too_long: 'Too many letters. There are exactly 7 bytes to decode.',
  almost_there: 'SO close! Most letters match. Check each byte once more, one of them is off.',
  partial: 'Some letters are right, some are wrong. Recheck your powers of 2 on each row.',
  wrong: 'Check your powers of 2. Each bit from the left is worth 128, 64, 32, 16, 8, 4, 2, 1. Add the columns where the bit is 1.',
  blank: 'Decode the 7 binary rows, then type the 7-letter word you find.',
};
