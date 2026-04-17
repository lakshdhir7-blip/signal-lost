import { useEffect, useState } from 'react';
import { createTabLock, type TabLockState } from '@/lib/broadcast-lock';

export function MultiTabLock({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TabLockState>('primary');

  useEffect(() => {
    const lock = createTabLock();
    const unsub = lock.subscribe(setState);
    return () => {
      unsub();
      lock.dispose();
    };
  }, []);

  return (
    <>
      {children}
      {state === 'secondary' ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="multi-tab-heading"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 text-cyan-brand"
        >
          <div className="max-w-md border-2 border-magenta-brand bg-navy-deep p-8 text-center">
            <h2 id="multi-tab-heading" className="mb-3 font-display text-xl text-magenta-brand">
              ANOTHER SESSION IS LIVE
            </h2>
            <p className="mb-6 font-sans text-sm text-cyan-brand/80">
              You have Signal Lost open in another tab on this device. Close this tab, or reload to
              take control here.
            </p>
            <button
              type="button"
              className="ranger-button"
              onClick={() => window.location.reload()}
            >
              [ RELOAD ]
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
