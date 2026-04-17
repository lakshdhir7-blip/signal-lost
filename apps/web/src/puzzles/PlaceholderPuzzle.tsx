import type { PuzzleProps } from './types';

/**
 * Phase 0 placeholder. Real puzzle components land in Phase 1-3.
 * Lets a volunteer verify the PuzzleScreen shell end-to-end.
 */
export function PlaceholderPuzzle({ puzzleId, onSubmit }: PuzzleProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 font-mono text-cyan-brand">
      <div className="border-2 border-dashed border-cyan-brand/40 bg-navy-brand/40 p-8 text-center">
        <h2 className="mb-4 font-display text-xl">{puzzleId.toUpperCase()}</h2>
        <p className="mb-6 text-sm text-cyan-brand/70">
          placeholder. real puzzle ui builds in the next phase.
        </p>
        <button
          type="button"
          className="ranger-button"
          onClick={() => onSubmit({ ok: true })}
        >
          Stub Solve (dev)
        </button>
      </div>
    </div>
  );
}
