import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { AppRoutes } from './routes';
import { SettingsSync } from './SettingsSync';
import { MultiTabLock } from '@/components/MultiTabLock';
import { SettingsGear } from '@/components/SettingsGear';
import { TimerWarnings } from '@/components/TimerWarnings';
import { installAudioDucking } from '@/audio/howl';

export function App() {
  useEffect(() => {
    installAudioDucking();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SettingsSync />
        <MultiTabLock>
          <SettingsGear />
          <TimerWarnings />
          <AppRoutes />
        </MultiTabLock>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
