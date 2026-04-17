import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './env.js';
import { handleHint } from './hint-handler.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());

app.use('*', async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN;
  const middleware = cors({
    origin: origin === '*' ? '*' : [origin],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  });
  return middleware(c, next);
});

app.get('/', (c) =>
  c.json({
    service: 'signal-lost-worker',
    env: c.env.ENVIRONMENT,
    ok: true,
  }),
);

app.post('/api/hint', (c) => handleHint(c));

app.notFound((c) => c.json({ error: 'not_found' }, 404));

app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: 'internal_error', code: 'unknown' }, 500);
});

export default app;
