import { useEffect, useState } from 'react';
import { useSessionStore } from '@/state/session';
import { corruptionPercent } from '@/lib/timer';

export function CorruptionMeter() {
  const startedAt = useSessionStore((s) => s.startedAt);
  const [pct, setPct] = useState(() => corruptionPercent(startedAt));

  useEffect(() => {
    const id = window.setInterval(() => setPct(corruptionPercent(startedAt)), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <span className="text-cyan-brand/50">WEB CORRUPTION</span>
      <div className="h-2 w-32 overflow-hidden border border-cyan-brand/40 bg-navy-deep">
        <div
          className="h-full bg-gradient-to-r from-magenta-brand via-alert-brand to-alert-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-magenta-brand">{Math.round(pct)}%</span>
    </div>
  );
}
