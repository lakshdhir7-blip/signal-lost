import { z } from 'zod';

export const PUZZLE_IDS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
export type PuzzleId = (typeof PUZZLE_IDS)[number];

export const PuzzleIdSchema = z.enum(PUZZLE_IDS);

export const PUZZLE_KINDS = ['html', 'python', 'binary', 'blockly'] as const;
export type PuzzleKind = (typeof PUZZLE_KINDS)[number];

export const PUZZLE_META: Record<PuzzleId, { kind: PuzzleKind; lockName: string; codeWord: string }> = {
  p1: { kind: 'html', lockName: 'ANIMAL ENCYCLOPEDIA', codeWord: 'HELLO' },
  p2: { kind: 'python', lockName: 'BEACON CODE', codeWord: 'WORLD' },
  p3: { kind: 'binary', lockName: 'FIREWALL BINARY', codeWord: 'GOODBYE' },
  p4: { kind: 'blockly', lockName: 'RESCUE DRONE', codeWord: 'GLITCH' },
  p5: { kind: 'python', lockName: 'FRONT PAGE REBUILD', codeWord: 'NOW' },
};

export const MASTER_PHRASE = 'HELLO WORLD GOODBYE GLITCH NOW';
