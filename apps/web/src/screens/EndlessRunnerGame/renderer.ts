import type { GameWorld } from './types';

const COLORS = {
  skyTop: '#070A1F',
  skyMid: '#0B0F2B',
  skyGlow: 'rgba(255, 43, 214, 0.08)',
  groundLine: '#1a2140',
  groundGlow: 'rgba(0, 229, 255, 0.12)',
  player: '#F4F9FF',
  playerStroke: '#0B0F2B',
  playerEye: '#00E5FF',
  playerAntenna: '#F9F871',
  shardFill: '#FF2BD6',
  shardGlow: 'rgba(255, 43, 214, 0.45)',
  shardStroke: '#0B0F2B',
  flyingFill: '#F9F871',
  flyingGlow: 'rgba(249, 248, 113, 0.55)',
  // Cyberpunk city silhouette layers (far → near)
  cityFar: '#0e1540',
  cityFarWindow: '#3b5bd4',
  cityMid: '#121a4d',
  cityMidWindow: '#6072e8',
  cityNear: '#1a2466',
  cityNearWindow: '#a3b3ff',
  moon: 'rgba(249, 248, 113, 0.8)',
};

// Deterministic city skyline pattern. Built once so the landscape is stable.
interface Building {
  x: number;
  width: number;
  height: number;
  windowCols: number;
  windowRows: number;
  hasAntenna: boolean;
}

interface Skyline {
  buildings: Building[];
  totalWidth: number;
}

function generateSkyline(seed: number, count: number, minH: number, maxH: number): Skyline {
  const buildings: Building[] = [];
  let x = 0;
  let rng = seed;
  const rand = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  for (let i = 0; i < count; i++) {
    const width = 40 + rand() * 60;
    const height = minH + rand() * (maxH - minH);
    buildings.push({
      x,
      width,
      height,
      windowCols: 2 + Math.floor(rand() * 3),
      windowRows: Math.max(2, Math.floor(height / 18)),
      hasAntenna: rand() > 0.7,
    });
    x += width + 6 + rand() * 14;
  }
  // Return the exact cumulative x so tiling is seamless.
  return { buildings, totalWidth: x };
}

const SKYLINE_FAR = generateSkyline(17, 30, 60, 120);
const SKYLINE_MID = generateSkyline(53, 22, 90, 170);
const SKYLINE_NEAR = generateSkyline(89, 16, 40, 80);

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  opts: { reducedMotion: boolean; flashRed: boolean },
) {
  const { width, height, groundY } = world.viewport;

  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(1, COLORS.skyMid);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  drawMoon(ctx, world);
  if (!opts.reducedMotion) {
    drawCityLayer(ctx, world, 0, SKYLINE_FAR, COLORS.cityFar, COLORS.cityFarWindow, 0.6);
    drawCityLayer(ctx, world, 1, SKYLINE_MID, COLORS.cityMid, COLORS.cityMidWindow, 0.9);
    drawCityLayer(ctx, world, 2, SKYLINE_NEAR, COLORS.cityNear, COLORS.cityNearWindow, 1);
  } else {
    // Static silhouette at the horizon for reduced motion users.
    drawCityLayer(ctx, world, 1, SKYLINE_MID, COLORS.cityMid, COLORS.cityMidWindow, 0.9, true);
  }

  drawGround(ctx, world, groundY);
  drawObstacles(ctx, world, groundY);
  drawPlayer(ctx, world, groundY);

  if (opts.flashRed) {
    ctx.fillStyle = 'rgba(255, 59, 59, 0.4)';
    ctx.fillRect(0, 0, width, height);
  }
}

function drawMoon(ctx: CanvasRenderingContext2D, world: GameWorld) {
  const { width } = world.viewport;
  ctx.save();
  ctx.fillStyle = COLORS.skyGlow;
  ctx.beginPath();
  ctx.arc(width * 0.82, 70, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.moon;
  ctx.beginPath();
  ctx.arc(width * 0.82, 70, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCityLayer(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  layerIndex: 0 | 1 | 2,
  skyline: Skyline,
  fill: string,
  windowFill: string,
  brightness: number,
  staticFreeze = false,
) {
  const { width, groundY } = world.viewport;
  const baseY = groundY;
  const layerWidth = skyline.totalWidth;

  // Smooth continuous scroll. parallaxScroll[layerIndex] is an ever-growing
  // accumulator; we take modulo against this specific layer's true width so
  // buildings slide smoothly and wrap seamlessly.
  const rawScroll = staticFreeze ? 0 : world.parallaxScroll[layerIndex] ?? 0;
  const offset = ((rawScroll % layerWidth) + layerWidth) % layerWidth;

  ctx.save();
  // Draw enough tile copies to cover the screen regardless of layer width
  const tileCount = Math.ceil(width / layerWidth) + 2;
  for (let tile = 0; tile < tileCount; tile++) {
    const tileX = tile * layerWidth - offset;
    if (tileX > width || tileX + layerWidth < 0) continue;
    for (const b of skyline.buildings) {
      const bx = tileX + b.x;
      const by = baseY - b.height;
      if (bx + b.width < 0 || bx > width) continue;
      // Body
      ctx.fillStyle = fill;
      ctx.fillRect(bx, by, b.width, b.height);
      // Antenna
      if (b.hasAntenna) {
        ctx.fillRect(bx + b.width / 2 - 1, by - 10, 2, 10);
      }
      // Windows (alpha modulated by layer brightness + gentle flicker)
      ctx.fillStyle = windowFill;
      const winW = 4;
      const winH = 5;
      const padX = (b.width - b.windowCols * (winW + 3)) / 2;
      const padY = 10;
      for (let wr = 0; wr < b.windowRows; wr++) {
        for (let wc = 0; wc < b.windowCols; wc++) {
          const seed = ((b.x * 11 + wc * 17 + wr * 31) | 0) & 0xff;
          const lit = ((seed + Math.floor(world.elapsedMs / 1200)) & 5) !== 0;
          if (!lit) continue;
          const wx = bx + padX + wc * (winW + 3);
          const wy = by + padY + wr * (winH + 3);
          ctx.globalAlpha = brightness * (0.5 + (seed % 20) / 40);
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, world: GameWorld, groundY: number) {
  const { width, height } = world.viewport;
  // Glow strip
  ctx.fillStyle = COLORS.groundGlow;
  ctx.fillRect(0, groundY, width, height - groundY);
  // Ground line
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();
  // Circuit-trace dashes scrolling
  ctx.strokeStyle = COLORS.groundLine;
  ctx.lineWidth = 1;
  const dashLen = 24;
  const offset = world.groundScrollPx % (dashLen * 2);
  ctx.beginPath();
  for (let x = -offset; x < width; x += dashLen * 2) {
    ctx.moveTo(x, groundY + 10);
    ctx.lineTo(x + dashLen, groundY + 10);
    ctx.moveTo(x + dashLen * 1.5, groundY + 22);
    ctx.lineTo(x + dashLen * 2.3, groundY + 22);
  }
  ctx.stroke();
}

function drawPlayer(ctx: CanvasRenderingContext2D, world: GameWorld, groundY: number) {
  const { player } = world;
  const px = player.x;
  const py = groundY - player.height - (-player.y); // -player.y because y goes up
  const w = player.width;
  const h = player.height;

  // Body (rounded square)
  ctx.fillStyle = COLORS.player;
  ctx.strokeStyle = COLORS.playerStroke;
  ctx.lineWidth = 3;
  roundRect(ctx, px, py, w, h - 10, 8);
  ctx.fill();
  ctx.stroke();

  // Screen (eyes area)
  ctx.fillStyle = '#0B0F2B';
  roundRect(ctx, px + 8, py + 10, w - 16, h - 32, 5);
  ctx.fill();

  // Eyes
  ctx.fillStyle = COLORS.playerEye;
  const eyeY = py + h - 38;
  ctx.beginPath();
  ctx.arc(px + 14, eyeY, 3.5, 0, Math.PI * 2);
  ctx.arc(px + w - 14, eyeY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = COLORS.playerEye;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px + w / 2, eyeY + 6, 5, 0, Math.PI);
  ctx.stroke();

  // Antennae
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 10, py);
  ctx.lineTo(px + 10, py - 6);
  ctx.moveTo(px + w - 10, py);
  ctx.lineTo(px + w - 10, py - 6);
  ctx.stroke();
  ctx.fillStyle = COLORS.playerAntenna;
  ctx.beginPath();
  ctx.arc(px + 10, py - 7, 2.4, 0, Math.PI * 2);
  ctx.arc(px + w - 10, py - 7, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Thruster glow (bob with running)
  const bob = player.onGround
    ? Math.sin(world.elapsedMs / 60) * 2
    : 0;
  ctx.fillStyle = 'rgba(0, 229, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(px + 14, py + h - 8 + bob, 6, 2 + Math.abs(bob), 0, 0, Math.PI * 2);
  ctx.ellipse(px + w - 14, py + h - 8 + bob, 6, 2 + Math.abs(bob), 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacles(ctx: CanvasRenderingContext2D, world: GameWorld, groundY: number) {
  for (const ob of world.obstacles) {
    if (!ob.alive) continue;
    const cx = ob.x + ob.width / 2;
    // Ground shards sit on the ground; flying shards are elevated by ob.y.
    const cy = groundY - ob.y - ob.height / 2;
    ctx.save();
    ctx.translate(cx, cy);

    if (ob.kind === 'flying_shard') {
      // Horizontal diamond/spike flying obstacle. Slight bob animation.
      const bob = Math.sin(world.elapsedMs / 180 + ob.id) * 2;
      ctx.translate(0, bob);
      ctx.rotate(Math.sin(world.elapsedMs / 300 + ob.id) * 0.08);
      // Glow
      ctx.fillStyle = COLORS.flyingGlow;
      drawFlyingShard(ctx, ob.width * 1.25, ob.height * 1.6);
      // Body
      ctx.fillStyle = COLORS.flyingFill;
      ctx.strokeStyle = COLORS.shardStroke;
      ctx.lineWidth = 2;
      drawFlyingShard(ctx, ob.width, ob.height);
      ctx.stroke();
    } else {
      ctx.rotate(ob.rotation * 0.2);
      // Glow
      ctx.fillStyle = COLORS.shardGlow;
      drawShard(ctx, ob.width * 1.25, ob.height * 1.2);
      // Body
      ctx.fillStyle = COLORS.shardFill;
      ctx.strokeStyle = COLORS.shardStroke;
      ctx.lineWidth = 2;
      drawShard(ctx, ob.width, ob.height);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawShard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w / 2, -h / 4);
  ctx.lineTo(w / 3, h / 2);
  ctx.lineTo(-w / 3, h / 2);
  ctx.lineTo(-w / 2, -h / 4);
  ctx.closePath();
  ctx.fill();
}

function drawFlyingShard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Wide horizontal diamond with spiked ends
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 3, -h / 2);
  ctx.lineTo(w / 3, -h / 2);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(w / 3, h / 2);
  ctx.lineTo(-w / 3, h / 2);
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
