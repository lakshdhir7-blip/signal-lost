import * as Blockly from 'blockly';
import type { Instruction } from './simulator';

const DRONE_HUE = 180;
const CONTROL_HUE = 280;
const HERRING_HUE = 30;

let registered = false;

export function registerDroneBlocks() {
  if (registered) return;
  registered = true;

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'drone_move_forward',
      message0: 'move forward 1 tile',
      previousStatement: null,
      nextStatement: null,
      colour: DRONE_HUE,
      tooltip: 'Moves the drone one tile in the direction it is facing.',
    },
    {
      type: 'drone_turn_left',
      message0: 'turn left 90°',
      previousStatement: null,
      nextStatement: null,
      colour: DRONE_HUE,
    },
    {
      type: 'drone_turn_right',
      message0: 'turn right 90°',
      previousStatement: null,
      nextStatement: null,
      colour: DRONE_HUE,
    },
    {
      type: 'drone_pick_up_chip',
      message0: 'pick up chip',
      previousStatement: null,
      nextStatement: null,
      colour: DRONE_HUE,
    },
    {
      type: 'drone_repeat_n',
      message0: 'repeat %1 times',
      args0: [{ type: 'field_number', name: 'TIMES', value: 2, min: 0, max: 20, precision: 1 }],
      message1: 'do %1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      colour: CONTROL_HUE,
    },
    // Red herring blocks
    {
      type: 'drone_shout',
      message0: 'shout "HELLO"',
      previousStatement: null,
      nextStatement: null,
      colour: HERRING_HUE,
      tooltip: 'Shouts. Nothing else happens.',
    },
    {
      type: 'drone_teleport',
      message0: 'teleport to %1, %2 🔒',
      args0: [
        { type: 'field_number', name: 'X', value: 0 },
        { type: 'field_number', name: 'Y', value: 0 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HERRING_HUE,
      tooltip: 'Requires admin key. You do not have one.',
      enableContextMenu: false,
    },
    {
      type: 'drone_scan_camera',
      message0: 'scan camera',
      previousStatement: null,
      nextStatement: null,
      colour: HERRING_HUE,
      tooltip: 'Returns fake sensor data.',
    },
    {
      type: 'drone_fly_above',
      message0: 'fly above obstacles',
      previousStatement: null,
      nextStatement: null,
      colour: HERRING_HUE,
      tooltip: 'Sounds amazing. Not installed on this drone.',
    },
    {
      type: 'drone_stealth_mode',
      message0: 'activate stealth mode',
      previousStatement: null,
      nextStatement: null,
      colour: HERRING_HUE,
      tooltip: 'Drains battery. Does nothing useful.',
    },
    {
      type: 'drone_boost_engine',
      message0: 'boost engine %1 seconds',
      args0: [{ type: 'field_number', name: 'SECS', value: 2, min: 0, max: 10 }],
      previousStatement: null,
      nextStatement: null,
      colour: HERRING_HUE,
      tooltip: 'Revs the engine. Camera will hear you.',
    },
    {
      type: 'drone_call_backup',
      message0: 'call backup drone 🔒',
      previousStatement: null,
      nextStatement: null,
      colour: HERRING_HUE,
      tooltip: 'Locked. You are the backup.',
      enableContextMenu: false,
    },
    {
      type: 'drone_decoy_beep',
      message0: 'play decoy beep',
      previousStatement: null,
      nextStatement: null,
      colour: HERRING_HUE,
      tooltip: 'Cute sound. No effect.',
    },
  ]);
}

export const DRONE_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Movement',
      colour: DRONE_HUE,
      contents: [
        { kind: 'block', type: 'drone_move_forward' },
        { kind: 'block', type: 'drone_turn_left' },
        { kind: 'block', type: 'drone_turn_right' },
        { kind: 'block', type: 'drone_pick_up_chip' },
      ],
    },
    {
      kind: 'category',
      name: 'Control',
      colour: CONTROL_HUE,
      contents: [
        { kind: 'block', type: 'drone_repeat_n' },
      ],
    },
    {
      kind: 'category',
      name: 'Extras',
      colour: HERRING_HUE,
      contents: [
        { kind: 'block', type: 'drone_shout' },
        { kind: 'block', type: 'drone_teleport', disabled: 'true' },
        { kind: 'block', type: 'drone_scan_camera' },
        { kind: 'block', type: 'drone_fly_above' },
        { kind: 'block', type: 'drone_stealth_mode' },
        { kind: 'block', type: 'drone_boost_engine' },
        { kind: 'block', type: 'drone_call_backup', disabled: 'true' },
        { kind: 'block', type: 'drone_decoy_beep' },
      ],
    },
  ],
};

/** Convert a Blockly top-level block chain into a structured instruction list. */
export function blocksToInstructions(topBlock: Blockly.Block | null): Instruction[] {
  const out: Instruction[] = [];
  let current: Blockly.Block | null = topBlock;
  while (current) {
    const ins = blockToInstruction(current);
    if (ins) out.push(ins);
    current = current.getNextBlock();
  }
  return out;
}

function blockToInstruction(block: Blockly.Block): Instruction | null {
  switch (block.type) {
    case 'drone_move_forward':
      return { op: 'move_forward' };
    case 'drone_turn_left':
      return { op: 'turn_left' };
    case 'drone_turn_right':
      return { op: 'turn_right' };
    case 'drone_pick_up_chip':
      return { op: 'pick_up_chip' };
    case 'drone_repeat_n': {
      const times = Number(block.getFieldValue('TIMES') ?? 0);
      const first = block.getInputTargetBlock('DO');
      const body = blocksToInstructions(first);
      return { op: 'repeat', times, body };
    }
    case 'drone_shout':
      return { op: 'shout' };
    case 'drone_scan_camera':
      return { op: 'scan_camera' };
    case 'drone_fly_above':
    case 'drone_stealth_mode':
    case 'drone_boost_engine':
    case 'drone_decoy_beep':
      // All red herrings. They execute as a no-op that still counts toward
      // the step cap so spamming them does not help.
      return { op: 'shout' };
    case 'drone_teleport':
    case 'drone_call_backup':
      // Locked, never executes.
      return null;
    default:
      return null;
  }
}

/**
 * Count total uses of each tracked block type in the workspace, including
 * blocks nested inside repeat_n bodies.
 */
export function countBlockUses(topBlock: Blockly.Block | null): Record<string, number> {
  const counts: Record<string, number> = {};
  const visit = (b: Blockly.Block | null) => {
    let cur: Blockly.Block | null = b;
    while (cur) {
      counts[cur.type] = (counts[cur.type] ?? 0) + 1;
      // Recurse into statement inputs (e.g., the DO slot of repeat)
      for (const input of cur.inputList) {
        const child = input.connection?.targetBlock();
        if (child) visit(child);
      }
      cur = cur.getNextBlock();
    }
  };
  visit(topBlock);
  return counts;
}
