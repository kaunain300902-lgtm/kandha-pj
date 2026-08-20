import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { authRequired, requireRole, requireVerifiedWorker } from '../auth.js';
import { bad, forbidden, notFound, ok } from '../lib/http.js';
import { workerCode } from '../lib/ref.js';
import { emitToJob, emitToUser } from '../realtime.js';

export const workerRoutes = Router();
workerRoutes.use(authRequired);

const TRADES = ['HEADLOAD', 'HANDCART', 'HANDVAN', 'PORTER'] as const;

/**
 * Registering as a worker never flips the existing account — it creates a
 * separate worker profile that starts unverified. A human at the market desk
 * clears it. Anything else makes the platform the weakest link in a chain of
 * trust it did not build.
 */
workerRoutes.post('/register', async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().trim().min(1).max(60),
      lang: z.enum(['en', 'hi', 'bn']),
      trades: z.array(z.enum(TRADES)).min(1),
      marketId: z.string(),
      photoUrl: z.string().url().optional(),
    }).parse(req.body);

    const market = await db.market.findUnique({ where: { id: body.marketId } });
    if (!market) throw bad('Unknown market');

    const existing = await db.workerProfile.findUnique({ where: { userId: req.user!.id } });
    if (existing) throw bad('This account already has a worker profile');

    let code = workerCode();
    for (let i = 0; i < 5; i++) {
      if (!(await db.workerProfile.findUnique({ where: { code } }))) break;
      code = workerCode();
    }

    const worker = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.user!.id },
        data: { name: body.name, lang: body.lang, role: 'WORKER', cityId: market.cityId },
      });
      return tx.workerProfile.create({
        data: {
          userId: req.user!.id,
          code,
          trades: body.trades,
          marketId: body.marketId,
          photoUrl: body.photoUrl ?? null,
          verify: 'PENDING',
        },
      });
    });

    ok(res, { worker, next: 'Bring your Aadhaar to the market desk to finish verification' });
  } catch (e) { next(e); }
});

workerRoutes.use(requireRole('WORKER'));

workerRoutes.get('/me', async (req, res, next) => {
  try {
    const worker = await db.workerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { market: { include: { city: true } }, user: true },
    });
    if (!worker) throw notFound('No worker profile');
    ok(res, worker);
  } catch (e) { next(e); }
});

workerRoutes.post('/duty', requireVerifiedWorker, async (req, res, next) => {
  try {
    const { onDuty } = z.object({ onDuty: z.boolean() }).parse(req.body);
    const worker = await db.workerProfile.update({ where: { id: req.workerId! }, data: { onDuty } });
    ok(res, { onDuty: worker.onDuty });
  } catch (e) { next(e); }
});

/** Location is only accepted while a job is running. Never between jobs. */
workerRoutes.post('/ping', requireVerifiedWorker, async (req, res, next) => {
  try {
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    const running = await db.assignment.findFirst({
      where: { workerId: req.workerId!, state: { in: ['ACCEPTED', 'REACHED', 'PICKED'] } },
      include: { job: true },
    });
    if (!running) throw forbidden('Location is only shared while a job is running');
    await db.workerProfile.update({
      where: { id: req.workerId! },
      data: { lastLat: lat, lastLng: lng, lastPingAt: new Date() },
    });
    emitToJob(running.jobId, 'worker:moved', { workerId: req.workerId, lat, lng, at: Date.now() });
    ok(res, { accepted: true });
  } catch (e) { next(e); }
});

workerRoutes.get('/earnings', async (req, res, next) => {
  try {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const [today, week, profile] = await Promise.all([
      db.assignment.aggregate({ _sum: { payout: true, units: true }, _count: true,
        where: { workerId: req.workerId!, state: 'DELIVERED', deliveredAt: { gte: since } } }),
      db.assignment.aggregate({ _sum: { payout: true },
        where: { workerId: req.workerId!, state: 'DELIVERED', deliveredAt: { gte: weekAgo } } }),
      db.workerProfile.findUnique({ where: { id: req.workerId! } }),
    ]);
    ok(res, {
      todayAmount: today._sum.payout ?? 0,
      todayUnits: today._sum.units ?? 0,
      todayJobs: today._count,
      weekAmount: week._sum.payout ?? 0,
      lifetimeJobs: profile?.jobsDone ?? 0,
      lifetimeUnits: profile?.unitsDone ?? 0,
      rating: profile?.ratingAvg ?? 0,
    });
  } catch (e) { next(e); }
});
