import { Router } from 'express';
import { db } from '../db.js';
import { ok } from '../lib/http.js';

export const geoRoutes = Router();

/** Public — the app needs this before anyone signs in. */
geoRoutes.get('/cities', async (_req, res, next) => {
  try {
    const cities = await db.city.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { markets: { where: { active: true }, orderBy: { name: 'asc' } } },
    });
    ok(res, cities);
  } catch (e) { next(e); }
});
