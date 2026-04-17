import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '@/state/session';

type Gate = 'callsign' | 'cinematic' | 'all-solved' | 'disarmed';

interface Props {
  require: Gate;
  children: ReactNode;
}

export function RouteGuard({ require, children }: Props) {
  const callsign = useSessionStore((s) => s.callsign);
  const hasSeenCinematic = useSessionStore((s) => s.hasSeenCinematic);
  const puzzles = useSessionStore((s) => s.puzzles);
  const disarmedAt = useSessionStore((s) => s.disarmedAt);

  switch (require) {
    case 'callsign':
      if (!callsign) return <Navigate to="/" replace />;
      return <>{children}</>;

    case 'cinematic':
      if (!callsign) return <Navigate to="/" replace />;
      if (!hasSeenCinematic) return <Navigate to="/cinematic" replace />;
      return <>{children}</>;

    case 'all-solved': {
      if (!callsign) return <Navigate to="/" replace />;
      const allSolved = Object.values(puzzles).every((p) => p.status === 'solved');
      if (!allSolved) return <Navigate to="/" replace />;
      return <>{children}</>;
    }

    case 'disarmed':
      if (!callsign) return <Navigate to="/" replace />;
      if (!disarmedAt) return <Navigate to="/disarm" replace />;
      return <>{children}</>;
  }
}
