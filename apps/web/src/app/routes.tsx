import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PUZZLE_IDS } from '@signal-lost/shared/puzzle-ids';
import { IntroScreen } from '@/screens/IntroScreen/IntroScreen';
import { CinematicScreen } from '@/screens/CinematicScreen/CinematicScreen';
import { PuzzleScreen } from '@/screens/PuzzleScreen/PuzzleScreen';
import { DisarmScreen } from '@/screens/DisarmScreen/DisarmScreen';
import { VictoryScreen } from '@/screens/VictoryScreen/VictoryScreen';
import { TimeUpScreen } from '@/screens/TimeUpScreen/TimeUpScreen';
import { RouteGuard } from './RouteGuard';

const EndlessRunnerGame = lazy(() => import('@/screens/EndlessRunnerGame/EndlessRunnerGame'));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<IntroScreen />} />
      <Route
        path="/cinematic"
        element={
          <RouteGuard require="callsign">
            <CinematicScreen />
          </RouteGuard>
        }
      />
      <Route
        path="/puzzle/:puzzleId"
        element={
          <RouteGuard require="cinematic">
            <PuzzleScreen />
          </RouteGuard>
        }
      />
      <Route
        path="/disarm"
        element={
          <RouteGuard require="all-solved">
            <DisarmScreen />
          </RouteGuard>
        }
      />
      <Route
        path="/victory"
        element={
          <RouteGuard require="disarmed">
            <VictoryScreen />
          </RouteGuard>
        }
      />
      <Route path="/time-up" element={<TimeUpScreen />} />
      <Route
        path="/game"
        element={
          <RouteGuard require="disarmed">
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-navy-deep font-mono text-cyan-brand">
                  Loading BYTE RUN...
                </div>
              }
            >
              <EndlessRunnerGame />
            </Suspense>
          </RouteGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Re-exported for convenience elsewhere in the app
export const VALID_PUZZLE_IDS = PUZZLE_IDS;
