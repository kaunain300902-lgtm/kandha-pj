import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { authRequired, requireRole, requireVerifiedWorker } from '../auth.js';
import { bad, conflict, forbidden, notFound, ok } from '../lib/http.js';
import { computeFare, requiredHelpers } from '../lib/fare.js';
import { shortRef } from '../lib/ref.js';
import { emitToJob, emitToMarket, emitToUser } from '../realtime.js';

export const jobRoutes = Router();
jobRoutes.use(authRequired);

const TRADES = ['HEADLOAD', 'HANDCART', 'HANDVAN', 'PORTER'] as const;

const jobPublic = {
  id: true, ref: true, kind: true, trade: true, units: true, kgPerUnit: true, helpers: true,
  pickupText: true, pickupNote: true, pickupLat: true, pickupLng: true,
  dropText: true, dropLat: true, dropLng: true,
  fareBase: true, fareExtra: true, status: true, createdAt: true, expiresAt: true,
  scheduledAt: true, lrNumber: true,
  market: { select: { id: true, name: true } },
  city: { select: { id: true, name: true, unit: true } },
} as const;

/* ------------------------------------------------------------------ *
 * BOOKER
 * ------------------------------------------------------------------ */

/** Quote first — the client shows this before anyone commits to anything. */
jobRoutes.post('/quote', async (req, res, next) => {
  try {
    const b = z.object({
      cityId: z.string(), units: z.number().int().min(1).max(500),
      kgPerUnit: z.number().int().min(1).max(200), helpers: z.number().int().min(1).max(20).default(1),
      extra: z.number().int().min(0).max(100000).default(0),
    }).parse(req.body);
    const city = await db.city.findUnique({ where: { id: b.cityId } });
    if (!city) throw bad('Unknown city');
    const fare = computeFare({ ...b, bandLow: city.bandLow, bandHigh: city.bandHigh });
    ok(res, { fare, unit: city.unit, helpersNeeded: requiredHelpers(b.units, b.kgPerUnit, b.helpers) });
  } catch (e) { next(e); }
});

jobRoutes.post('/', requireRole('BOOKER', 'WORKER'), async (req, res, next) => {
  try {
    const b = z.object({
      cityId: z.string(), marketId: z.string(),
      kind: z.enum(['BUSINESS', 'PERSONAL']).default('BUSINESS'),
      trade: z.enum(TRADES),
      units: z.number().int().min(1).max(500),
      kgPerUnit: z.number().int().min(1).max(200),
      helpers: z.number().int().min(1).max(20).default(1),
      pickupText: z.string().trim().min(3).max(160),
      pickupNote: z.string().trim().max(300).optional(),
      pickupLat: z.number().optional(), pickupLng: z.number().optional(),
      dropText: z.string().trim().min(3).max(160),
      dropLat: z.number().optional(), dropLng: z.number().optional(),
      extra: z.number().int().min(0).max(100000).default(0),
      allowOutside: z.boolean().default(false),
      scheduledAt: z.coerce.date().optional(),
    }).parse(req.body);

    const [city, market] = await Promise.all([
      db.city.findUnique({ where: { id: b.cityId } }),
      db.market.findUnique({ where: { id: b.marketId } }),
    ]);
    if (!city || !market || market.cityId !== city.id) throw bad('Unknown city or market');

    const helpers = requiredHelpers(b.units, b.kgPerUnit, b.helpers);
    const fare = computeFare({ units: b.units, kgPerUnit: b.kgPerUnit, helpers, extra: b.extra,
      bandLow: city.bandLow, bandHigh: city.bandHigh });

    const job = await db.job.create({
      data: {
        ref: shortRef(), bookerId: req.user!.id, cityId: city.id, marketId: market.id,
        kind: b.kind, trade: b.trade, units: b.units, kgPerUnit: b.kgPerUnit, helpers,
        pickupText: b.pickupText, pickupNote: b.pickupNote ?? null,
        pickupLat: b.pickupLat ?? null, pickupLng: b.pickupLng ?? null,
        dropText: b.dropText, dropLat: b.dropLat ?? null, dropLng: b.dropLng ?? null,
        fareBase: fare.base, fareExtra: fare.extra, allowOutside: b.allowOutside,
        scheduledAt: b.scheduledAt ?? null,
        expiresAt: new Date(Date.now() + 45 * 60 * 1000),
      },
      select: jobPublic,
    });

    emitToMarket(market.id, 'job:new', job);
    ok(res, { job, fare });
  } catch (e) { next(e); }
});

/** The booker's own trips. He never sees anyone else's. */
jobRoutes.get('/mine', requireRole('BOOKER', 'WORKER'), async (req, res, next) => {
  try {
    const jobs = await db.job.findMany({
      where: { bookerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        ...jobPublic,
        assignments: {
          select: {
            id: true, units: true, state: true, countWorker: true, countBooker: true,
            worker: { select: { id: true, code: true, ratingAvg: true, lastLat: true, lastLng: true,
              user: { select: { name: true, phone: true } } } },
          },
        },
      },
    });
    ok(res, jobs);
  } catch (e) { next(e); }
});

jobRoutes.get('/:id', async (req, res, next) => {
  try {
    const job = await db.job.findUnique({
      where: { id: req.params.id },
      select: {
        ...jobPublic, bookerId: true,
        booker: { select: { id: true, name: true, phone: true } },
        assignments: {
          select: {
            id: true, units: true, state: true, countWorker: true, countBooker: true, photoUrl: true,
            worker: { select: { id: true, userId: true, code: true, ratingAvg: true, lastLat: true, lastLng: true,
              user: { select: { name: true, phone: true } } } },
          },
        },
      },
    });
    if (!job) throw notFound('No such job');
    const mine = job.bookerId === req.user!.id;
    const onIt = job.assignments.some((a) => a.worker.userId === req.user!.id);
    if (!mine && !onIt && req.user!.role !== 'ADMIN') throw forbidden();
    ok(res, job);
  } catch (e) { next(e); }
});

jobRoutes.post('/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().max(200).optional() }).parse(req.body ?? {});
    const job = await db.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw notFound('No such job');
    if (job.bookerId !== req.user!.id && req.user!.role !== 'ADMIN') throw forbidden();
    if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(job.status)) throw conflict('Too late to cancel');
    const updated = await db.job.update({
      where: { id: job.id },
      data: { status: 'CANCELLED', cancelReason: reason ?? null,
        assignments: { updateMany: { where: {}, data: { state: 'CANCELLED' } } } },
      include: { assignments: { include: { worker: true } } },
    });
    emitToJob(job.id, 'job:cancelled', { jobId: job.id, reason: reason ?? null });
    updated.assignments.forEach((a) => emitToUser(a.worker.userId, 'job:cancelled', { jobId: job.id }));
    ok(res, { cancelled: true });
  } catch (e) { next(e); }
});

/** The booker's half of the count. The record only counts when both sides match. */
jobRoutes.post('/:id/count', async (req, res, next) => {
  try {
    const { assignmentId, count } = z.object({ assignmentId: z.string(), count: z.number().int().min(0).max(500) }).parse(req.body);
    const a = await db.assignment.findUnique({ where: { id: assignmentId }, include: { job: true } });
    if (!a || a.jobId !== req.params.id) throw notFound('No such assignment');
    if (a.job.bookerId !== req.user!.id) throw forbidden();
    const updated = await db.assignment.update({ where: { id: a.id }, data: { countBooker: count } });
    emitToJob(a.jobId, 'count:updated', { assignmentId: a.id, countBooker: count, countWorker: updated.countWorker });
    ok(res, { matched: updated.countWorker != null && updated.countWorker === count, assignment: updated });
  } catch (e) { next(e); }
});

jobRoutes.post('/:id/lr', async (req, res, next) => {
  try {
    const { lrNumber } = z.object({ lrNumber: z.string().trim().max(60) }).parse(req.body);
    const job = await db.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw notFound('No such job');
    if (job.bookerId !== req.user!.id) throw forbidden();
    await db.job.update({ where: { id: job.id }, data: { lrNumber } });
    ok(res, { saved: true });
  } catch (e) { next(e); }
});

jobRoutes.post('/:id/rate', async (req, res, next) => {
  try {
    const { subjectId, stars, note } = z.object({
      subjectId: z.string(), stars: z.number().int().min(1).max(5), note: z.string().max(300).optional(),
    }).parse(req.body);
    const job = await db.job.findUnique({ where: { id: req.params.id }, include: { assignments: { include: { worker: true } } } });
    if (!job) throw notFound('No such job');
    const involved = job.bookerId === req.user!.id || job.assignments.some((a) => a.worker.userId === req.user!.id);
    if (!involved) throw forbidden();

    await db.rating.upsert({
      where: { jobId_authorId: { jobId: job.id, authorId: req.user!.id } },
      update: { stars, note: note ?? null, subjectId },
      create: { jobId: job.id, authorId: req.user!.id, subjectId, stars, note: note ?? null },
    });

    const worker = await db.workerProfile.findUnique({ where: { userId: subjectId } });
    if (worker) {
      const agg = await db.rating.aggregate({ _avg: { stars: true }, _count: true, where: { subjectId } });
      await db.workerProfile.update({
        where: { id: worker.id },
        data: { ratingAvg: Number((agg._avg.stars ?? 0).toFixed(2)), ratingCount: agg._count },
      });
    }
    ok(res, { rated: true });
  } catch (e) { next(e); }
});

/* ------------------------------------------------------------------ *
 * WORKER — the board and the running order
 * ------------------------------------------------------------------ */

jobRoutes.get('/board/open', requireRole('WORKER'), requireVerifiedWorker, async (req, res, next) => {
  try {
    const q = z.object({
      scope: z.enum(['mine', 'nearby', 'all']).default('nearby'),
      sort: z.enum(['near', 'pay']).default('near'),
    }).parse(req.query);

    const worker = await db.workerProfile.findUniqueOrThrow({
      where: { id: req.workerId! }, include: { market: true },
    });
    if (!worker.marketId || !worker.market) throw bad('Set your market first');

    const where: any = {
      status: 'OPEN',
      expiresAt: { gt: new Date() },
      trade: { in: worker.trades },
      assignments: { none: { workerId: worker.id } },
    };
    if (q.scope === 'mine') where.marketId = worker.marketId;
    else {
      where.cityId = worker.market.cityId;
      // another market's job is only visible with a union-endorsed pass,
      // and only if the booker opted in to outside workers
      if (!worker.interMarket) where.marketId = worker.marketId;
      else where.OR = [{ marketId: worker.marketId }, { allowOutside: true }];
    }

    const jobs = await db.job.findMany({
      where, take: 60,
      orderBy: q.sort === 'pay' ? [{ fareExtra: 'desc' }, { fareBase: 'desc' }] : { createdAt: 'desc' },
      select: { ...jobPublic, _count: { select: { assignments: true } } },
    });

    ok(res, jobs.map((j) => ({
      ...j,
      placesLeft: Math.max(0, j.helpers - j._count.assignments),
      fareTotal: j.fareBase + j.fareExtra,
      outsideMarket: j.market.id !== worker.marketId,
    })).filter((j) => j.placesLeft > 0));
  } catch (e) { next(e); }
});

jobRoutes.post('/:id/accept', requireRole('WORKER'), requireVerifiedWorker, async (req, res, next) => {
  try {
    const worker = await db.workerProfile.findUniqueOrThrow({ where: { id: req.workerId! } });
    const result = await db.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id: req.params.id }, include: { assignments: true } });
      if (!job) throw notFound('No such job');
      if (job.status !== 'OPEN' && job.status !== 'ASSIGNED') throw conflict('That job is closed');
      if (job.expiresAt < new Date()) throw conflict('That job has expired');
      if (!worker.trades.includes(job.trade)) throw forbidden('Not one of your trades');
      if (job.marketId !== worker.marketId && !(worker.interMarket && job.allowOutside))
        throw forbidden('That job is in another market');
      if (job.assignments.length >= job.helpers) throw conflict('All places are taken');
      if (job.assignments.some((a) => a.workerId === worker.id)) throw conflict('You already took this');

      const share = Math.floor(job.units / job.helpers);
      const payout = Math.round((job.fareBase + job.fareExtra) / job.helpers);
      const assignment = await tx.assignment.create({
        data: { jobId: job.id, workerId: worker.id, units: share, payout },
      });
      const filled = job.assignments.length + 1 >= job.helpers;
      await tx.job.update({ where: { id: job.id }, data: { status: filled ? 'ASSIGNED' : 'OPEN' } });
      return { job, assignment, filled };
    });

    emitToUser(result.job.bookerId, 'job:accepted', {
      jobId: result.job.id, workerCode: worker.code, filled: result.filled,
    });
    emitToJob(result.job.id, 'job:accepted', { jobId: result.job.id, assignmentId: result.assignment.id });
    emitToMarket(worker.marketId!, 'job:taken', { jobId: result.job.id, filled: result.filled });
    ok(res, result.assignment);
  } catch (e) { next(e); }
});

const STEP = { REACHED: 'reachedAt', PICKED: 'pickedAt', DELIVERED: 'deliveredAt' } as const;

jobRoutes.post('/:id/step', requireRole('WORKER'), requireVerifiedWorker, async (req, res, next) => {
  try {
    const { state, count, photoUrl } = z.object({
      state: z.enum(['REACHED', 'PICKED', 'DELIVERED']),
      count: z.number().int().min(0).max(500).optional(),
      photoUrl: z.string().url().optional(),
    }).parse(req.body);

    const a = await db.assignment.findFirst({
      where: { jobId: req.params.id, workerId: req.workerId! }, include: { job: true },
    });
    if (!a) throw notFound('You are not on that job');
    if (a.state === 'CANCELLED') throw conflict('That job was cancelled');

    const updated = await db.$transaction(async (tx) => {
      const asg = await tx.assignment.update({
        where: { id: a.id },
        data: {
          state, [STEP[state]]: new Date(),
          countWorker: count ?? a.countWorker, photoUrl: photoUrl ?? a.photoUrl,
        },
      });
      if (state === 'DELIVERED') {
        const siblings = await tx.assignment.findMany({ where: { jobId: a.jobId } });
        const allDone = siblings.every((s) => s.state === 'DELIVERED' || s.id === asg.id);
        if (allDone) await tx.job.update({ where: { id: a.jobId }, data: { status: 'DELIVERED' } });
        await tx.workerProfile.update({
          where: { id: req.workerId! },
          data: { jobsDone: { increment: 1 }, unitsDone: { increment: asg.units } },
        });
      } else {
        await tx.job.update({ where: { id: a.jobId }, data: { status: state === 'REACHED' ? 'REACHED' : 'PICKED' } });
      }
      return asg;
    });

    emitToJob(a.jobId, 'job:step', { jobId: a.jobId, assignmentId: a.id, state, at: Date.now() });
    emitToUser(a.job.bookerId, 'job:step', { jobId: a.jobId, state });
    ok(res, updated);
  } catch (e) { next(e); }
});

jobRoutes.get('/worker/running', requireRole('WORKER'), async (req, res, next) => {
  try {
    const rows = await db.assignment.findMany({
      where: { workerId: req.workerId ?? '', state: { in: ['ACCEPTED', 'REACHED', 'PICKED'] } },
      include: { job: { select: { ...jobPublic, booker: { select: { name: true, phone: true } } } } },
      orderBy: { acceptedAt: 'desc' },
    });
    ok(res, rows);
  } catch (e) { next(e); }
});
