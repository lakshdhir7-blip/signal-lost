import { useEffect } from 'react';
import { useSettings } from '@/state/session';
import { initSpeech, setReadAloudEnabled } from '@/lib/speech';

/**
 * Mirrors the accessibility settings from Zustand into <html data-*> attributes
 * so globals.css can style without prop-drilling. Also toggles the TTS module.
 */
export function SettingsSync() {
  const settings = useSettings();

  useEffect(() => {
    initSpeech();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontSize = settings.fontSize;
    root.dataset.dyslexiaFont = String(settings.dyslexiaFont);
    root.dataset.highContrast = String(settings.highContrast);
    root.dataset.scanlines = String(settings.scanlines);
    root.dataset.reducedMotion = String(settings.reducedMotion);
    setReadAloudEnabled(settings.readAloud);
  }, [settings]);

  return null;
}
