import { useEffect, useState } from 'react';
import { useSessionStore } from '@/state/session';
import { formatMMSS } from '@/lib/timer';

export function CountdownTimer() {
  const startedAt = useSessionStore((s) => s.startedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = startedAt ? Math.max(0, startedAt + 90 * 60 * 1000 - now) : 90 * 60 * 1000;
  const minutes = Math.floor(remaining / 60_000);

  let color = 'text-cyan-brand';
  if (minutes < 3) color = 'text-alert-brand animate-pulse';
  else if (minutes < 10) color = 'text-orange-400';
  else if (minutes < 30) color = 'text-acid-brand';

  return (
    <div className="flex items-center gap-2 font-display text-sm">
      <span className="text-cyan-brand/50">T-MINUS</span>
      <span className={color} aria-live="polite" aria-label={`${minutes} minutes remaining`}>
        {formatMMSS(remaining)}
      </span>
    </div>
  );
}
