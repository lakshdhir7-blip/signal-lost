import {
  startRunnerMusic,
  startVictoryAnthem,
  stopRunnerMusic,
  stopVictoryAnthem,
  synthCues,
} from './howl';

/**
 * Named SFX trigger surface. Components call `cues.correct()` etc; the
 * underlying implementation can swap from synth tones to Howler sprite sheet
 * without any caller changes in Phase 6.
 */
export const cues = {
  click: synthCues.click,
  hover: synthCues.hover,
  correct: synthCues.correct,
  wrong: synthCues.wrong,
  hintRequest: synthCues.hintRequest,
  lockClunk: synthCues.lockClunk,
  whoosh: synthCues.whoosh,
  disarmSuccess: synthCues.disarmSuccess,
  startVictoryAnthem,
  stopVictoryAnthem,
  startRunnerMusic,
  stopRunnerMusic,
};
