import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Categorias compartilhadas por todo o consultório para ações internas (limpeza, mentoria, marketing...).
router.get('/', requireAuth, requireRole('DENTIST'), async (_req, res) => {
  const rows = await db.all('SELECT id, name, color FROM task_categories ORDER BY name COLLATE NOCASE');
  res.json(rows);
});

const createSchema = z.object({
  name: z.string().min(2),
  color: z.string().optional(),
});

router.post('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { name, color } = parsed.data;
  const info = await db.run('INSERT INTO task_categories (name, color) VALUES (?, ?)', [
    name,
    color || '#7c8b7a',
  ]);
  res.status(201).json({ id: info.lastInsertRowid, name, color: color || '#7c8b7a' });
});

router.delete('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  await db.run('DELETE FROM task_categories WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

export default router;
