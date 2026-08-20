import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from './env.js';
import { db } from './db.js';
import { forbidden, unauthorized } from './lib/http.js';

export type JwtPayload = { uid: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; phone: string; role: 'BOOKER' | 'WORKER' | 'ADMIN'; cityId: string | null };
      workerId?: string;
    }
  }
}

export const signToken = (uid: string) =>
  jwt.sign({ uid } satisfies JwtPayload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });

export const hashCode = (code: string) => bcrypt.hash(code, 8);
export const compareCode = (code: string, hash: string) => bcrypt.compare(code, hash);

/** Normalise an Indian mobile number to E.164 digits without the plus. */
export function normalisePhone(input: string): string | null {
  const d = String(input).replace(/\D/g, '');
  if (d.length === 10 && /^[6-9]/.test(d)) return '91' + d;
  if (d.length === 12 && d.startsWith('91')) return d;
  if (d.length >= 11 && d.length <= 15) return d; // other countries, best effort
  return null;
}

export async function authRequired(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized();
    const { uid } = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await db.user.findUnique({ where: { id: uid }, include: { worker: true } });
    if (!user || user.blocked) throw unauthorized();
    req.user = { id: user.id, phone: user.phone, role: user.role, cityId: user.cityId };
    req.workerId = user.worker?.id;
    db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
    next();
  } catch (e) {
    next(e instanceof Error && 'status' in e ? e : unauthorized());
  }
}

/**
 * The wall. A booker token can never reach a worker route, and vice versa —
 * this is a fairness rule, not tidiness: a booker who could read the board
 * could see what every other booker pays and who has been idle all morning.
 */
export function requireRole(...roles: Array<'BOOKER' | 'WORKER' | 'ADMIN'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === 'ADMIN') return next();
    if (!roles.includes(req.user.role)) return next(forbidden('This account cannot access that'));
    next();
  };
}

export async function requireVerifiedWorker(req: Request, _res: Response, next: NextFunction) {
  if (!req.workerId) return next(forbidden('Register as a worker first'));
  const w = await db.workerProfile.findUnique({ where: { id: req.workerId } });
  if (!w) return next(forbidden('Register as a worker first'));
  if (w.verify !== 'VERIFIED')
    return next(forbidden('Your card is not verified yet. Visit the market desk.'));
  next();
}
