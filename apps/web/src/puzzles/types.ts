import type { ComponentType } from 'react';
import type { PuzzleId, PuzzleKind } from '@signal-lost/shared/puzzle-ids';

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string; hintableMistake?: string };

export interface PuzzleProps {
  puzzleId: PuzzleId;
  draft: string;
  onDraftChange: (draft: string) => void;
  onSubmit: (result: ValidationResult) => void;
}

export interface PuzzleDefinition {
  id: PuzzleId;
  title: string;
  kind: PuzzleKind;
  codeWord: string;
  storyBriefing: string;
  redHerrings: string[];
  /** Short puzzle-scoped context hint passed to BYTE for better targeting. */
  hintContext: string;
  /**
   * Tiered hints used when the Worker is unreachable.
   * DO NOT include literal code solutions or the expected answer here. These
   * get bundled into the client JS and could be inspected by a student.
   * Each tier should guide, not answer.
   */
  fallbackHints: readonly [string, string, string];
  /** Max BYTE hint messages per session for this puzzle. Defaults to 3. */
  hintCap?: number;
  component: ComponentType<PuzzleProps>;
}
