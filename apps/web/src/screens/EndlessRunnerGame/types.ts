export type RunnerPhase = 'ready' | 'running' | 'paused' | 'over';

export interface PlayerState {
  x: number;
  y: number; // y is offset above ground; 0 = on ground
  vy: number;
  onGround: boolean;
  width: number;
  height: number;
}

export type ObstacleKind = 'ground_shard' | 'flying_shard';

export interface Obstacle {
  id: number;
  x: number; // world x (right-to-left scroll handled externally)
  y: number; // distance above ground
  width: number;
  height: number;
  kind: ObstacleKind;
  alive: boolean;
  rotation: number;
}

export interface GameWorld {
  phase: RunnerPhase;
  elapsedMs: number; // total ms alive in current run
  spawnTimerMs: number; // ms since last spawn
  nextSpawnDelayMs: number; // ms until next spawn
  groundScrollPx: number; // cosmetic scroll offset for ground layer
  parallaxScroll: [number, number, number]; // three bg layers
  speedPxPerSec: number;
  player: PlayerState;
  obstacles: Obstacle[]; // object-pooled, fixed size
  dodged: number;
  nextObstacleId: number;
  lastMilestone: number; // last crossed 30s milestone index
  viewport: { width: number; height: number; groundY: number };
}

export const GAME_CONSTANTS = {
  GRAVITY: 2200, // px/s^2
  JUMP_VELOCITY: -850, // px/s
  PLAYER_X: 120,
  PLAYER_WIDTH: 52,
  PLAYER_HEIGHT: 56,
  OBSTACLE_POOL_SIZE: 20,
  MILESTONE_INTERVAL_MS: 30_000,
  HITBOX_SHRINK: 0.82, // forgiving collision
} as const;
