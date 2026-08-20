import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { env, isProd } from './env.js';
import { log } from './log.js';
import { db } from './db.js';
import { ApiError } from './lib/http.js';
import { initRealtime } from './realtime.js';
import { authRoutes } from './routes/auth.routes.js';
import { geoRoutes } from './routes/geo.routes.js';
import { jobRoutes } from './routes/job.routes.js';
import { workerRoutes } from './routes/worker.routes.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',') }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger: log, autoLogging: { ignore: (r) => r.url === '/health' } }));
app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));

app.get('/health', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'kandha-api', db: 'up' });
  } catch {
    res.status(503).json({ ok: false, db: 'down' });
  }
});

app.use('/v1/auth', authRoutes);
app.use('/v1/geo', geoRoutes);
app.use('/v1/jobs', jobRoutes);
app.use('/v1/worker', workerRoutes);

app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not found', code: 'not_found' }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ ok: false, code: 'invalid_input', error: err.issues[0]?.message ?? 'Invalid input', issues: err.issues });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ ok: false, code: err.code, error: err.message });
  }
  log.error({ err }, 'unhandled');
  res.status(500).json({ ok: false, code: 'server_error', error: isProd ? 'Something went wrong' : String(err) });
});

const server = http.createServer(app);
initRealtime(server);
server.listen(env.PORT, () => log.info(`kandha-api on :${env.PORT}`));

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => { await db.$disconnect(); server.close(() => process.exit(0)); });
}
