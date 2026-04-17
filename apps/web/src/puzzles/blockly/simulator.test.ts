import { describe, expect, it } from 'vitest';
import {
  BLOCK_LIMITS,
  checkBlockLimits,
  simulate,
  verdict,
  type Instruction,
} from './simulator';

const CANONICAL_PATH: Instruction[] = [
  { op: 'turn_left' }, // face right
  { op: 'move_forward' }, // (1,0)
  { op: 'pick_up_chip' },
  { op: 'turn_right' }, // face down
  {
    op: 'repeat',
    times: 2,
    body: [{ op: 'move_forward' }, { op: 'pick_up_chip' }], // (1,1)(1,2)
  },
  // Now at (1,2) facing down. End is (4,4). Need to avoid (2,2) danger.
  { op: 'move_forward' }, // (1,3)
  { op: 'turn_left' }, // face right
  { op: 'repeat', times: 3, body: [{ op: 'move_forward' }] }, // (2,3)(3,3)(4,3)
  { op: 'turn_right' }, // face down
  { op: 'move_forward' }, // (4,4) END
];

describe('blockly simulator', () => {
  it('produces a passing verdict on the canonical path', () => {
    const result = simulate(CANONICAL_PATH);
    const v = verdict(result, true);
    expect(result.chipsCollected).toBe(3);
    expect(result.reachedEnd).toBe(true);
    expect(result.usedRepeat).toBe(true);
    expect(result.hitDanger).toBe(false);
    expect(v.ok).toBe(true);
  });

  it('flags missing repeat usage even when path works', () => {
    const noRepeat: Instruction[] = [
      { op: 'turn_left' },
      { op: 'move_forward' },
      { op: 'pick_up_chip' },
      { op: 'turn_right' },
      { op: 'move_forward' },
      { op: 'pick_up_chip' },
      { op: 'move_forward' },
      { op: 'pick_up_chip' },
      { op: 'move_forward' },
      { op: 'turn_left' },
      { op: 'move_forward' },
      { op: 'move_forward' },
      { op: 'move_forward' },
      { op: 'turn_right' },
      { op: 'move_forward' },
    ];
    const result = simulate(noRepeat);
    const v = verdict(result, true);
    expect(result.usedRepeat).toBe(false);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('no_repeat');
  });

  it('flags stepping on danger', () => {
    const bad: Instruction[] = [
      { op: 'turn_left' },
      { op: 'move_forward' },
      { op: 'move_forward' },
      { op: 'turn_right' },
      { op: 'move_forward' },
      { op: 'move_forward' },
    ];
    const result = simulate(bad);
    expect(result.hitDanger).toBe(true);
  });

  it('flags empty program with no_program reason', () => {
    const v = verdict(simulate([]), false);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('no_program');
  });

  it('caps runaway programs via stepCap', () => {
    const runaway: Instruction[] = [
      { op: 'repeat', times: 100, body: [{ op: 'repeat', times: 100, body: [{ op: 'turn_left' }] }] },
    ];
    const result = simulate(runaway, { stepCap: 500 });
    expect(result.exceededStepCap).toBe(true);
  });

  it('checkBlockLimits passes when under cap', () => {
    const counts = {
      drone_move_forward: 5,
      drone_pick_up_chip: 1,
      drone_turn_left: 2,
      drone_turn_right: 2,
    };
    expect(checkBlockLimits(counts).ok).toBe(true);
  });

  it('checkBlockLimits flags a specific over-limit block', () => {
    const counts = {
      drone_move_forward: BLOCK_LIMITS.drone_move_forward.max + 2,
      drone_pick_up_chip: 1,
    };
    const result = checkBlockLimits(counts);
    expect(result.ok).toBe(false);
    expect(result.overLimit[0]?.type).toBe('drone_move_forward');
  });
});
