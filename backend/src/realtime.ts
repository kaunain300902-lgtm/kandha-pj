import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { db } from './db.js';
import { log } from './log.js';

let io: IOServer | null = null;

/**
 * Rooms:
 *   market:<marketId>  — verified, on-duty workers of that market (new job feed)
 *   job:<jobId>        — the booker and the assigned workers (status updates)
 *   user:<userId>      — anything addressed to one person
 */
export function initRealtime(server: HttpServer) {
  io = new IOServer(server, { cors: { origin: '*' }, path: '/ws' });

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token ?? '');
      const { uid } = jwt.verify(token, env.JWT_SECRET) as { uid: string };
      const user = await db.user.findUnique({ where: { id: uid }, include: { worker: true } });
      if (!user || user.blocked) return next(new Error('unauthorized'));
      socket.data.userId = user.id;
      socket.data.role = user.role;
      socket.data.workerId = user.worker?.id ?? null;
      socket.data.marketId = user.worker?.marketId ?? null;
      socket.data.verified = user.worker?.verify === 'VERIFIED';
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    if (socket.data.role === 'WORKER' && socket.data.verified && socket.data.marketId) {
      socket.join(`market:${socket.data.marketId}`);
    }
    socket.on('job:watch', (jobId: string) => socket.join(`job:${jobId}`));
    socket.on('job:unwatch', (jobId: string) => socket.leave(`job:${jobId}`));
    socket.on('disconnect', () => {});
  });

  log.info('realtime ready on /ws');
  return io;
}

export function emitToMarket(marketId: string, event: string, payload: unknown) {
  io?.to(`market:${marketId}`).emit(event, payload);
}
export function emitToJob(jobId: string, event: string, payload: unknown) {
  io?.to(`job:${jobId}`).emit(event, payload);
}
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
