import { GAME_CONSTANTS, type GameWorld, type Obstacle, type PlayerState } from './types';

export function createInitialWorld(viewport: {
  width: number;
  height: number;
  groundY: number;
}): GameWorld {
  const player: PlayerState = {
    x: GAME_CONSTANTS.PLAYER_X,
    y: 0,
    vy: 0,
    onGround: true,
    width: GAME_CONSTANTS.PLAYER_WIDTH,
    height: GAME_CONSTANTS.PLAYER_HEIGHT,
  };
  const obstacles: Obstacle[] = Array.from(
    { length: GAME_CONSTANTS.OBSTACLE_POOL_SIZE },
    (_, i) => ({
      id: i,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      kind: 'ground_shard',
      alive: false,
      rotation: 0,
    }),
  );
  return {
    phase: 'ready',
    elapsedMs: 0,
    spawnTimerMs: 0,
    nextSpawnDelayMs: 1300,
    groundScrollPx: 0,
    parallaxScroll: [0, 0, 0],
    speedPxPerSec: 320,
    player,
    obstacles,
    dodged: 0,
    nextObstacleId: GAME_CONSTANTS.OBSTACLE_POOL_SIZE,
    lastMilestone: 0,
    viewport,
  };
}

export interface DifficultyLevel {
  speedPxPerSec: number;
  minSpawnMs: number;
  maxSpawnMs: number;
}

/**
 * Difficulty curve.
 *   - TIME component: smoothstep for the first 90s, then keeps climbing.
 *   - DODGE component: EXPONENTIAL growth with every obstacle dodged. Each
 *     successful dodge adds an ever-larger speed bump. No cap.
 * Both are summed. Spawn gaps keep a sensible physical-reaction floor.
 *
 * Dodge bonus formula: sum of a geometric series where bump_n = 1 px/s * 1.03^n.
 * Closed form: 33.33 * (1.03^dodged - 1). Numbers:
 *   dodged=10  → +11 px/s
 *   dodged=25  → +36 px/s
 *   dodged=50  → +113 px/s
 *   dodged=100 → +606 px/s
 *   dodged=150 → +2625 px/s
 */
export function difficultyAt(elapsedMs: number, dodged = 0): DifficultyLevel {
  const seconds = elapsedMs / 1000;
  const t = seconds / 90;
  const timeEase = t <= 1 ? t * t * (3 - 2 * t) : 1 + (t - 1) * 0.35;
  const dodgeBonus = 33.3 * (Math.pow(1.03, dodged) - 1);
  const speedPxPerSec = 320 + timeEase * 380 + dodgeBonus;

  // Spawn timing tightens with both time and dodges.
  const combined = timeEase + dodgeBonus / 400; // dodges nudge spawns tighter too
  const minSpawnMs = Math.max(260, 1300 - combined * 900);
  const maxSpawnMs = Math.max(520, 2100 - combined * 1400);
  return { speedPxPerSec, minSpawnMs, maxSpawnMs };
}

export interface StepResult {
  collided: boolean;
  newMilestone: number | null; // milestone index if a new 30s marker was crossed
}

export function stepWorld(world: GameWorld, deltaMs: number): StepResult {
  if (world.phase !== 'running') return { collided: false, newMilestone: null };

  const dtSec = Math.max(0, Math.min(0.05, deltaMs / 1000)); // clamp big frames
  world.elapsedMs += deltaMs;

  // Advance difficulty — speed now also grows exponentially with dodged count
  const diff = difficultyAt(world.elapsedMs, world.dodged);
  world.speedPxPerSec = diff.speedPxPerSec;

  // Player physics
  world.player.vy += GAME_CONSTANTS.GRAVITY * dtSec;
  world.player.y += world.player.vy * dtSec;
  if (world.player.y >= 0) {
    world.player.y = 0;
    world.player.vy = 0;
    world.player.onGround = true;
  } else {
    world.player.onGround = false;
  }

  // Scroll ground + parallax cosmetically.
  // NB: we DO NOT mod parallax values here — the renderer does a per-layer
  // modulo against each layer's real tile width, so scroll can accumulate
  // smoothly. A hard-coded global modulo here caused frame-to-frame jumps
  // when the layer widths didn't match.
  const scrollDx = world.speedPxPerSec * dtSec;
  world.groundScrollPx = (world.groundScrollPx + scrollDx) % 48;
  world.parallaxScroll[0] += scrollDx * 0.25;
  world.parallaxScroll[1] += scrollDx * 0.5;
  world.parallaxScroll[2] += scrollDx * 0.75;

  // Obstacle spawn
  world.spawnTimerMs += deltaMs;
  if (world.spawnTimerMs >= world.nextSpawnDelayMs) {
    world.spawnTimerMs = 0;
    const span = diff.maxSpawnMs - diff.minSpawnMs;
    world.nextSpawnDelayMs = diff.minSpawnMs + Math.random() * span;
    spawnObstacle(world);
  }

  // Advance obstacles
  let collided = false;
  for (const ob of world.obstacles) {
    if (!ob.alive) continue;
    ob.x -= scrollDx;
    ob.rotation += dtSec * 3;
    // Count dodged once the obstacle passes the player
    if (ob.x + ob.width < world.player.x && !collided) {
      // Only count once: move very far left and mark with a sentinel
      if (ob.x > -10_000) {
        world.dodged += 1;
        ob.x = -20_000; // sentinel so we don't double-count next frame
      }
    }
    // Recycle off-screen
    if (ob.x < -200) {
      ob.alive = false;
      continue;
    }
    // Collision (AABB with forgiving shrink)
    if (rectsCollide(world.player, ob)) {
      collided = true;
    }
  }

  if (collided) {
    world.phase = 'over';
    return { collided: true, newMilestone: null };
  }

  // Milestones
  const milestoneIdx = Math.floor(world.elapsedMs / GAME_CONSTANTS.MILESTONE_INTERVAL_MS);
  let newMilestone: number | null = null;
  if (milestoneIdx > world.lastMilestone) {
    world.lastMilestone = milestoneIdx;
    newMilestone = milestoneIdx;
  }

  return { collided: false, newMilestone };
}

function spawnObstacle(world: GameWorld) {
  const slot = world.obstacles.find((o) => !o.alive);
  if (!slot) return;

  // Flying shards only start appearing after 15 seconds, and their ratio
  // ramps from 0 to ~35% of spawns by the 90-second mark so the player has
  // time to learn the jump mechanic first.
  const secs = world.elapsedMs / 1000;
  const flyingRatio = secs < 15 ? 0 : Math.min(0.35, (secs - 15) / 75 * 0.35);
  const isFlying = Math.random() < flyingRatio;

  slot.alive = true;
  slot.id = world.nextObstacleId++;
  slot.rotation = Math.random() * Math.PI;

  if (isFlying) {
    // Flying shard — must NOT jump. Positioned so a grounded player passes
    // safely under (ground player top ~56), but a jumping player collides.
    const width = 48 + Math.random() * 14;
    const height = 28 + Math.random() * 8;
    slot.width = width;
    slot.height = height;
    slot.x = world.viewport.width + width;
    slot.y = 60; // bottom 60 above ground; top ~88-96 — in the jump arc
    slot.kind = 'flying_shard';
  } else {
    // Ground shard — must jump over.
    const width = 26 + Math.random() * 18;
    const height = 36 + Math.random() * 22;
    slot.width = width;
    slot.height = height;
    slot.x = world.viewport.width + width;
    slot.y = 0;
    slot.kind = 'ground_shard';
  }
}

export function tryJump(world: GameWorld): boolean {
  if (world.phase !== 'running') return false;
  if (!world.player.onGround) return false;
  world.player.vy = GAME_CONSTANTS.JUMP_VELOCITY;
  world.player.onGround = false;
  return true;
}

export function startRun(world: GameWorld) {
  world.phase = 'running';
  world.elapsedMs = 0;
  world.dodged = 0;
  world.spawnTimerMs = 0;
  world.nextSpawnDelayMs = 1500;
  world.lastMilestone = 0;
  world.player.y = 0;
  world.player.vy = 0;
  world.player.onGround = true;
  world.speedPxPerSec = 320;
  world.nextSpawnDelayMs = 1300;
  for (const o of world.obstacles) o.alive = false;
}

function rectsCollide(
  player: PlayerState,
  obstacle: Obstacle,
): boolean {
  // Work in "height-above-ground" coordinates for both rects so signs stay
  // consistent. Flying shards have obstacle.y > 0 so their bottom is
  // elevated; ground shards have obstacle.y = 0.
  const shrink = GAME_CONSTANTS.HITBOX_SHRINK;
  const pw = player.width * shrink;
  const ph = player.height * shrink;
  const px = player.x + (player.width - pw) / 2;
  const playerFeet = -player.y; // player.y is negative when airborne
  const playerHead = playerFeet + ph;

  const ow = obstacle.width * shrink;
  const oh = obstacle.height * shrink;
  const ox = obstacle.x + (obstacle.width - ow) / 2;
  const obBottom = obstacle.y;
  const obTop = obstacle.y + oh;

  return (
    px < ox + ow &&
    px + pw > ox &&
    playerFeet < obTop &&
    playerHead > obBottom
  );
}
