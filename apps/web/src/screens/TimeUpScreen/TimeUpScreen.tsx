import { useNavigate } from 'react-router-dom';
import { STORY } from '@/lib/story';
import { useSessionStore } from '@/state/session';

export function TimeUpScreen() {
  const navigate = useNavigate();
  const currentPuzzleId = useSessionStore((s) => s.currentPuzzleId);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-deep px-6 text-cyan-brand">
      <h1 className="chromatic-pulse mb-4 font-display text-3xl text-alert-brand md:text-5xl">
        {STORY.timeUp.title}
      </h1>
      <p className="mb-8 max-w-lg text-center font-sans text-cyan-brand/80">{STORY.timeUp.message}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="ranger-button"
          onClick={() => navigate(currentPuzzleId ? `/puzzle/${currentPuzzleId}` : '/puzzle/p1')}
        >
          [ {STORY.timeUp.continueButton} ]
        </button>
        <button type="button" className="ranger-button" onClick={() => navigate('/victory')}>
          [ {STORY.timeUp.statsButton} ]
        </button>
      </div>
    </main>
  );
}
