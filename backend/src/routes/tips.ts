import { Router } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json(await db.all('SELECT id, text FROM oral_health_tips ORDER BY id'));
});

export default router;
