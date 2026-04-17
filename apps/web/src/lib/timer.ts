export const MISSION_DURATION_MS = 90 * 60 * 1000;

export function formatMMSS(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const mm = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function remainingMs(startedAt: number | null, durationMs = MISSION_DURATION_MS): number {
  if (!startedAt) return durationMs;
  return Math.max(0, startedAt + durationMs - Date.now());
}

export function corruptionPercent(startedAt: number | null, durationMs = MISSION_DURATION_MS): number {
  if (!startedAt) return 0;
  const elapsed = Date.now() - startedAt;
  return Math.max(0, Math.min(95, (elapsed / durationMs) * 100));
}
