import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { env } from '../env.js';
import { sendSms } from '../sms.js';
import { log } from '../log.js';
import { authRequired, compareCode, hashCode, normalisePhone, signToken } from '../auth.js';
import { bad, ok, unauthorized } from '../lib/http.js';

export const authRoutes = Router();

const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

authRoutes.post('/otp/request', otpLimiter, async (req, res, next) => {
  try {
    const { phone } = z.object({ phone: z.string() }).parse(req.body);
    const p = normalisePhone(phone);
    if (!p) throw bad('That does not look like a mobile number');

    const code = String(Math.floor(100000 + Math.random() * 899999));
    await db.otpCode.create({
      data: {
        phone: p,
        codeHash: await hashCode(code),
        expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000),
      },
    });
    await sendSms(p, `${code} is your Kandha code. It expires in 5 minutes.`);
    if (env.OTP_DEV_MODE) log.info({ phone: p, code }, 'DEV OTP');
    ok(res, { sent: true, devCode: env.OTP_DEV_MODE ? code : undefined });
  } catch (e) { next(e); }
});

authRoutes.post('/otp/verify', otpLimiter, async (req, res, next) => {
  try {
    const { phone, code, name, lang, cityId } = z
      .object({
        phone: z.string(),
        code: z.string().length(6),
        name: z.string().trim().min(1).max(60).optional(),
        lang: z.enum(['en', 'hi', 'bn']).optional(),
        cityId: z.string().optional(),
      })
      .parse(req.body);

    const p = normalisePhone(phone);
    if (!p) throw bad('That does not look like a mobile number');

    const row = await db.otpCode.findFirst({
      where: { phone: p, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) throw unauthorized('That code has expired. Ask for a new one.');
    if (row.attempts >= 5) throw unauthorized('Too many tries. Ask for a new code.');

    const good = await compareCode(code, row.codeHash);
    await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 }, consumed: good } });
    if (!good) throw unauthorized('Wrong code');

    const user = await db.user.upsert({
      where: { phone: p },
      update: { name: name ?? undefined, lang: lang ?? undefined, cityId: cityId ?? undefined },
      create: { phone: p, name: name ?? null, lang: lang ?? 'en', cityId: cityId ?? null, role: 'BOOKER' },
      include: { worker: true },
    });

    ok(res, {
      token: signToken(user.id),
      user: {
        id: user.id, phone: user.phone, name: user.name, role: user.role,
        lang: user.lang, cityId: user.cityId,
        worker: user.worker && { id: user.worker.id, code: user.worker.code, verify: user.worker.verify, onDuty: user.worker.onDuty },
      },
    });
  } catch (e) { next(e); }
});

authRoutes.get('/me', authRequired, async (req, res, next) => {
  try {
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { worker: { include: { market: true } }, savedPlaces: true },
    });
    ok(res, user);
  } catch (e) { next(e); }
});

authRoutes.patch('/me', authRequired, async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().trim().min(1).max(60).optional(),
      lang: z.enum(['en', 'hi', 'bn']).optional(),
      cityId: z.string().optional(),
    }).parse(req.body);
    const user = await db.user.update({ where: { id: req.user!.id }, data: body });
    ok(res, user);
  } catch (e) { next(e); }
});

authRoutes.post('/device', authRequired, async (req, res, next) => {
  try {
    const { pushToken, platform } = z.object({ pushToken: z.string(), platform: z.string() }).parse(req.body);
    await db.device.upsert({
      where: { pushToken },
      update: { userId: req.user!.id, platform },
      create: { userId: req.user!.id, pushToken, platform },
    });
    ok(res, { saved: true });
  } catch (e) { next(e); }
});
