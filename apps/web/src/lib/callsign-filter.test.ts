import { describe, expect, it } from 'vitest';
import { validateCallsign } from './callsign-filter';

describe('callsign validator', () => {
  it('accepts typical names', () => {
    expect(validateCallsign('nova').ok).toBe(true);
    expect(validateCallsign('ghost byte').ok).toBe(true);
    expect(validateCallsign('agent-07').ok).toBe(true);
  });

  it('rejects blank and too-short', () => {
    const blank = validateCallsign('  ');
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(blank.reason).toBe('blank');
    const short = validateCallsign('a');
    if (!short.ok) expect(short.reason).toBe('too_short');
  });

  it('rejects too-long', () => {
    const r = validateCallsign('aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_long');
  });

  it('rejects invalid characters', () => {
    const r = validateCallsign('hello<script>');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_chars');
  });

  it('rejects profanity', () => {
    const r = validateCallsign('thisfuck');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('profane');
  });
});
