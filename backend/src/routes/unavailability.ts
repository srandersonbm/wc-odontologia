import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me', requireAuth, requireRole('PATIENT'), async (req, res) => {
  const rows = await db.all(
    'SELECT id, date, reason, created_at as createdAt FROM patient_unavailability WHERE patient_id = ? ORDER BY date DESC',
    [req.user!.id]
  );
  res.json(rows);
});

const createSchema = z.object({
  date: z.string().min(8),
  reason: z.string().optional(),
});

router.post('/', requireAuth, requireRole('PATIENT'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const info = await db.run('INSERT INTO patient_unavailability (patient_id, date, reason) VALUES (?, ?, ?)', [
    req.user!.id,
    parsed.data.date,
    parsed.data.reason || null,
  ]);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/:id', requireAuth, requireRole('PATIENT'), async (req, res) => {
  await db.run('DELETE FROM patient_unavailability WHERE id = ? AND patient_id = ?', [
    req.params.id,
    req.user!.id,
  ]);
  res.status(204).end();
});

// Visão do dentista: indisponibilidade de todos os pacientes em um período.
router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  let query = `
    SELECT pu.id, pu.date, pu.reason, u.name as patientName, pu.patient_id as patientId
    FROM patient_unavailability pu JOIN users u ON u.id = pu.patient_id WHERE 1=1`;
  const params: any[] = [];
  if (from) {
    query += ' AND pu.date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND pu.date <= ?';
    params.push(to);
  }
  query += ' ORDER BY pu.date';
  res.json(await db.all(query, params));
});

export default router;
