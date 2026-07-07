import { Router } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const rows = await db.all(
    `SELECT u.id, u.name, u.email, d.specialty, d.color
     FROM users u JOIN dentists d ON d.user_id = u.id
     WHERE u.tenant_id = ?
     ORDER BY u.name COLLATE NOCASE`,
    [req.user!.tenantId]
  );
  res.json(rows);
});

export default router;
