import { DRONE_GRID, type GridConfig } from './grid';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Instruction =
  | { op: 'move_forward' }
  | { op: 'turn_left' }
  | { op: 'turn_right' }
  | { op: 'pick_up_chip' }
  | { op: 'repeat'; times: number; body: Instruction[] }
  | { op: 'shout' }
  | { op: 'scan_camera' };

export interface SimulatorResult {
  reachedEnd: boolean;
  chipsCollected: number;
  totalChips: number;
  hitDanger: boolean;
  offGrid: boolean;
  usedRepeat: boolean;
  stepCount: number;
  exceededStepCap: boolean;
  path: [number, number][];
  finalPos: [number, number];
  finalFacing: Direction;
}

export interface SimulatorOptions {
  grid?: GridConfig;
  stepCap?: number;
}

const DIR_DELTA: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const LEFT_OF: Record<Direction, Direction> = { up: 'left', left: 'down', down: 'right', right: 'up' };
const RIGHT_OF: Record<Direction, Direction> = { up: 'right', right: 'down', down: 'left', left: 'up' };

export function simulate(
  program: Instruction[],
  options: SimulatorOptions = {},
): SimulatorResult {
  const grid = options.grid ?? DRONE_GRID;
  const stepCap = options.stepCap ?? 10_000;

  let col = grid.start[0];
  let row = grid.start[1];
  let facing: Direction = grid.startFacing;
  const chipsRemaining = new Set(grid.chips.map(([c, r]) => `${c},${r}`));
  const dangerSet = new Set(grid.dangers.map(([c, r]) => `${c},${r}`));
  const path: [number, number][] = [[col, row]];
  let hitDanger = false;
  let offGrid = false;
  let usedRepeat = false;
  let stepCount = 0;
  let exceeded = false;

  const exec = (ins: Instruction): boolean => {
    if (exceeded || hitDanger || offGrid) return false;
    stepCount += 1;
    if (stepCount > stepCap) {
      exceeded = true;
      return false;
    }
    switch (ins.op) {
      case 'move_forward': {
        const [dc, dr] = DIR_DELTA[facing];
        col += dc;
        row += dr;
        if (col < 0 || col >= grid.width || row < 0 || row >= grid.height) {
          offGrid = true;
          return false;
        }
        path.push([col, row]);
        if (dangerSet.has(`${col},${row}`)) {
          hitDanger = true;
          return false;
        }
        return true;
      }
      case 'turn_left':
        facing = LEFT_OF[facing];
        return true;
      case 'turn_right':
        facing = RIGHT_OF[facing];
        return true;
      case 'pick_up_chip':
        chipsRemaining.delete(`${col},${row}`);
        return true;
      case 'repeat': {
        usedRepeat = true;
        const times = Math.max(0, Math.min(100, Math.floor(ins.times)));
        for (let i = 0; i < times; i++) {
          for (const child of ins.body) {
            if (!exec(child)) return false;
          }
        }
        return true;
      }
      case 'shout':
      case 'scan_camera':
        return true;
    }
  };

  for (const ins of program) {
    if (!exec(ins)) break;
  }

  const totalChips = grid.chips.length;
  const chipsCollected = totalChips - chipsRemaining.size;
  const reachedEnd = col === grid.end[0] && row === grid.end[1];

  return {
    reachedEnd,
    chipsCollected,
    totalChips,
    hitDanger,
    offGrid,
    usedRepeat,
    stepCount,
    exceededStepCap: exceeded,
    path,
    finalPos: [col, row],
    finalFacing: facing,
  };
}

export interface SimulatorVerdict {
  ok: boolean;
  reason?:
    | 'no_program'
    | 'step_cap'
    | 'off_grid'
    | 'hit_danger'
    | 'missed_chip'
    | 'missed_end'
    | 'no_repeat'
    | 'over_limit';
  message: string;
}

/**
 * Per-block-type caps. Tight on purpose: the limits force students to lean on
 * the repeat block instead of copy-pasting the same movement over and over.
 */
export const BLOCK_LIMITS: Record<string, { max: number; label: string }> = {
  drone_move_forward: { max: 6, label: 'Move forward' },
  drone_pick_up_chip: { max: 2, label: 'Pick up chip' },
  drone_turn_left: { max: 2, label: 'Turn left' },
  drone_turn_right: { max: 2, label: 'Turn right' },
};

export interface LimitCheck {
  ok: boolean;
  overLimit: { type: string; label: string; used: number; max: number }[];
}

export function checkBlockLimits(counts: Record<string, number>): LimitCheck {
  const overLimit: LimitCheck['overLimit'] = [];
  for (const [type, rule] of Object.entries(BLOCK_LIMITS)) {
    const used = counts[type] ?? 0;
    if (used > rule.max) {
      overLimit.push({ type, label: rule.label, used, max: rule.max });
    }
  }
  return { ok: overLimit.length === 0, overLimit };
}

export function verdict(result: SimulatorResult, hasProgram: boolean): SimulatorVerdict {
  if (!hasProgram) return { ok: false, reason: 'no_program', message: 'no blocks connected to start. drag blocks into the workspace.' };
  if (result.exceededStepCap) {
    return { ok: false, reason: 'step_cap', message: 'your drone is stuck in a loop. check your repeat counts.' };
  }
  if (result.offGrid) {
    return { ok: false, reason: 'off_grid', message: 'your drone walked off the edge of the grid.' };
  }
  if (result.hitDanger) {
    return {
      ok: false,
      reason: 'hit_danger',
      message: `your drone exploded at (${result.finalPos[0]},${result.finalPos[1]}). that is a red tile!`,
    };
  }
  if (result.chipsCollected < result.totalChips) {
    const base = `You picked up ${result.chipsCollected} of ${result.totalChips} memory chips.`;
    const tail = result.reachedEnd
      ? ' The drone reached the key, but it will not unlock without ALL chips. Add a pick_up_chip on every chip tile.'
      : ' Use the pick_up_chip block while on each chip tile.';
    return { ok: false, reason: 'missed_chip', message: base + tail };
  }
  if (!result.reachedEnd) {
    return { ok: false, reason: 'missed_end', message: 'you did not reach the END tile (4,4).' };
  }
  if (!result.usedRepeat) {
    return {
      ok: false,
      reason: 'no_repeat',
      message: 'the camera flagged your path as suspicious. use a repeat block at least once.',
    };
  }
  return { ok: true, message: 'clean path, all 3 chips grabbed, repeat detected. nice.' };
}
