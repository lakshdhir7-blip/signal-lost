import { PUZZLE_IDS, PUZZLE_META, type PuzzleId } from '@signal-lost/shared/puzzle-ids';
import { useSessionStore } from '@/state/session';

interface Props {
  activeId: PuzzleId | null;
}

const LOCK_ICONS: Record<'locked' | 'unlocked' | 'solved', string> = {
  locked: '🔒',
  unlocked: '◉',
  solved: '✔',
};

export function ProgressSidebar({ activeId }: Props) {
  const puzzles = useSessionStore((s) => s.puzzles);

  return (
    <nav
      aria-label="Mission progress"
      className="flex h-full w-20 flex-col border-r-2 border-cyan-brand/20 bg-navy-deep py-6"
    >
      <ul className="flex flex-col items-center gap-4">
        {PUZZLE_IDS.map((id, idx) => {
          const progress = puzzles[id];
          const meta = PUZZLE_META[id];
          const isActive = id === activeId;
          const stateClass =
            progress.status === 'locked'
              ? 'border-cyan-brand/20 text-cyan-brand/30 bg-navy-brand/40'
              : progress.status === 'solved'
                ? 'border-green-400 text-green-400 bg-green-400/10 shadow-[0_0_16px_rgba(74,222,128,0.4)]'
                : isActive
                  ? 'border-cyan-brand text-cyan-brand bg-cyan-brand/10 animate-pulse-cyan'
                  : 'border-cyan-brand/60 text-cyan-brand/80';
          return (
            <li key={id} className="relative">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-none border-2 font-display text-lg ${stateClass}`}
                title={meta.lockName}
                aria-label={`Lock ${idx + 1}: ${meta.lockName} - ${progress.status}`}
              >
                <span aria-hidden="true">{LOCK_ICONS[progress.status]}</span>
              </div>
              {progress.codeWord ? (
                <div className="mt-1 truncate text-center font-mono text-[10px] text-green-400">
                  {progress.codeWord}
                </div>
              ) : (
                <div className="mt-1 text-center font-mono text-[10px] text-cyan-brand/40">
                  {String(idx + 1).padStart(2, '0')}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
