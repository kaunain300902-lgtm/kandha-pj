import type { Response } from 'express';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'error') {
    super(message);
  }
}
export const bad = (m: string, code = 'bad_request') => new ApiError(400, m, code);
export const unauthorized = (m = 'Sign in again') => new ApiError(401, m, 'unauthorized');
export const forbidden = (m = 'Not allowed') => new ApiError(403, m, 'forbidden');
export const notFound = (m = 'Not found') => new ApiError(404, m, 'not_found');
export const conflict = (m: string) => new ApiError(409, m, 'conflict');

export const ok = (res: Response, data: unknown) => res.json({ ok: true, data });
