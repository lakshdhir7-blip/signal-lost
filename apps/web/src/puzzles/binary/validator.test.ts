import { describe, expect, it } from 'vitest';
import {
  byteToChar,
  byteToDecimal,
  EXPECTED_ANSWER,
  validateBinaryAnswer,
} from './validator';

describe('binary validator', () => {
  it('decodes a byte to decimal', () => {
    expect(byteToDecimal('01001000')).toBe(72);
    expect(byteToDecimal('01000001')).toBe(65);
    expect(byteToDecimal('11111111')).toBe(255);
  });

  it('decodes a byte to ASCII char', () => {
    expect(byteToChar('01000111')).toBe('G');
    expect(byteToChar('01000101')).toBe('E');
    expect(byteToChar('00000000')).toBeNull();
  });

  it('accepts the exact expected answer', () => {
    expect(validateBinaryAnswer(EXPECTED_ANSWER)).toEqual({ ok: true });
    expect(validateBinaryAnswer(' goodbye ')).toEqual({ ok: true });
    expect(validateBinaryAnswer('GOODBYE')).toEqual({ ok: true });
  });

  it('accepts variations with punctuation and internal spaces', () => {
    expect(validateBinaryAnswer('GOODBYE!')).toEqual({ ok: true });
    expect(validateBinaryAnswer('good-bye')).toEqual({ ok: true });
    expect(validateBinaryAnswer('GOOD BYE')).toEqual({ ok: true });
    expect(validateBinaryAnswer('Goodbye.')).toEqual({ ok: true });
  });

  it('rejects the red-herring LAST USED PIN decode', () => {
    const result = validateBinaryAnswer('ED');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.hintableMistake).toBe('red_herring_last_pin');
  });

  it('rejects raw binary input', () => {
    const result = validateBinaryAnswer('01001000');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.hintableMistake).toBe('entered_raw_binary');
  });

  it('rejects blank input', () => {
    const result = validateBinaryAnswer('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('blank');
  });

  it('rejects too-short and too-long', () => {
    const short = validateBinaryAnswer('GOOD');
    const long = validateBinaryAnswer('GOODBYEZZ');
    expect(short.ok).toBe(false);
    expect(long.ok).toBe(false);
    if (!short.ok) expect(short.hintableMistake).toBe('too_short');
    if (!long.ok) expect(long.hintableMistake).toBe('too_long');
  });
});
