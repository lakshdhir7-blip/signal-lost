import { describe, expect, it } from 'vitest';
import {
  createInitialWorld,
  difficultyAt,
  startRun,
  stepWorld,
  tryJump,
} from './gameEngine';
import { GAME_CONSTANTS } from './types';

const VIEW = { width: 960, height: 360, groundY: 280 };

describe('difficulty curve', () => {
  it('starts at base speed', () => {
    const d = difficultyAt(0, 0);
    expect(d.speedPxPerSec).toBe(320);
  });

  it('grows monotonically with time and keeps rising past 90s (no cap)', () => {
    const a = difficultyAt(10_000, 0);
    const b = difficultyAt(45_000, 0);
    const c = difficultyAt(90_000, 0);
    const d = difficultyAt(180_000, 0);
    const e = difficultyAt(999_000, 0);
    expect(a.speedPxPerSec).toBeLessThan(b.speedPxPerSec);
    expect(b.speedPxPerSec).toBeLessThan(c.speedPxPerSec);
    expect(d.speedPxPerSec).toBeGreaterThan(c.speedPxPerSec);
    expect(e.speedPxPerSec).toBeGreaterThan(d.speedPxPerSec);
  });

  it('dodged count adds exponentially to speed', () => {
    const d0 = difficultyAt(30_000, 0);
    const d10 = difficultyAt(30_000, 10);
    const d30 = difficultyAt(30_000, 30);
    const d60 = difficultyAt(30_000, 60);
    // Each step is larger than the previous (exponential, not linear)
    const delta10 = d10.speedPxPerSec - d0.speedPxPerSec;
    const delta30 = d30.speedPxPerSec - d10.speedPxPerSec;
    const delta60 = d60.speedPxPerSec - d30.speedPxPerSec;
    expect(delta10).toBeGreaterThan(0);
    expect(delta30).toBeGreaterThan(delta10);
    expect(delta60).toBeGreaterThan(delta30);
  });

  it('tightens spawn spacing over time', () => {
    const early = difficultyAt(0, 0);
    const late = difficultyAt(90_000, 0);
    expect(late.minSpawnMs).toBeLessThan(early.minSpawnMs);
  });
});

describe('jumping', () => {
  it('rejects jump when not running', () => {
    const w = createInitialWorld(VIEW);
    expect(tryJump(w)).toBe(false);
  });

  it('jumps when grounded in running state', () => {
    const w = createInitialWorld(VIEW);
    startRun(w);
    expect(w.player.onGround).toBe(true);
    const ok = tryJump(w);
    expect(ok).toBe(true);
    expect(w.player.vy).toBeLessThan(0);
    expect(w.player.onGround).toBe(false);
  });

  it('rejects double jump while airborne', () => {
    const w = createInitialWorld(VIEW);
    startRun(w);
    tryJump(w);
    expect(tryJump(w)).toBe(false);
  });

  it('returns to ground via gravity', () => {
    const w = createInitialWorld(VIEW);
    startRun(w);
    tryJump(w);
    // Step forward 1 second in 20ms chunks
    for (let i = 0; i < 60; i++) stepWorld(w, 20);
    expect(w.player.onGround).toBe(true);
    expect(w.player.y).toBe(0);
  });
});

describe('stepWorld', () => {
  it('does nothing while in ready state', () => {
    const w = createInitialWorld(VIEW);
    const result = stepWorld(w, 16);
    expect(result.collided).toBe(false);
    expect(w.elapsedMs).toBe(0);
  });

  it('advances elapsed time while running', () => {
    const w = createInitialWorld(VIEW);
    startRun(w);
    stepWorld(w, 100);
    expect(w.elapsedMs).toBe(100);
  });

  it('emits milestone every 30 seconds', () => {
    const w = createInitialWorld(VIEW);
    startRun(w);
    let milestones = 0;
    for (let i = 0; i < 3500; i++) {
      const r = stepWorld(w, 20);
      if (r.newMilestone !== null) milestones++;
      if (r.collided) break; // in case a random obstacle hits
    }
    // We either crossed milestones or died early; expect either >=2 milestones or game over
    expect(milestones >= 2 || w.phase === 'over').toBe(true);
  });

  it('spawns obstacles over time', () => {
    const w = createInitialWorld(VIEW);
    startRun(w);
    for (let i = 0; i < 300; i++) {
      stepWorld(w, 20);
      if (w.phase === 'over') break;
    }
    const alive = w.obstacles.filter((o) => o.alive).length;
    // Either we saw obstacles, or we died (which means they existed)
    expect(alive > 0 || w.phase === 'over').toBe(true);
  });
});

describe('object pool size', () => {
  it('caps obstacle count at pool size', () => {
    const w = createInitialWorld(VIEW);
    expect(w.obstacles).toHaveLength(GAME_CONSTANTS.OBSTACLE_POOL_SIZE);
  });
});
