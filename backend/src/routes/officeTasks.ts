import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Calendário geral do consultório (ações/tarefas internas) — visível somente para dentistas.
// ?dentistId= opcional para filtrar pela agenda de um dentista; omita para ver o consultório todo.
router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { from, to, dentistId } = req.query as Record<string, string | undefined>;
  let query = `
    SELECT t.id, t.title, t.description, t.date, t.start_time as startTime, t.end_time as endTime,
           t.dentist_id as dentistId, t.category_id as categoryId,
           c.name as categoryName, c.color as categoryColor,
           d.name as dentistName
    FROM office_tasks t
    JOIN task_categories c ON c.id = t.category_id
    LEFT JOIN users d ON d.id = t.dentist_id
    WHERE 1=1`;
  const params: any[] = [];
  if (from) {
    query += ' AND t.date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND t.date <= ?';
    params.push(to);
  }
  if (dentistId) {
    query += ' AND (t.dentist_id = ? OR t.dentist_id IS NULL)';
    params.push(dentistId);
  }
  query += ' ORDER BY t.date, t.start_time';
  res.json(await db.all(query, params));
});

const createSchema = z.object({
  categoryId: z.number().int(),
  dentistId: z.number().int().nullable().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  date: z.string().min(8),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

router.post('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { categoryId, dentistId, title, description, date, startTime, endTime } = parsed.data;
  const info = await db.run(
    `INSERT INTO office_tasks (category_id, dentist_id, title, description, date, start_time, end_time, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [categoryId, dentistId ?? null, title, description || null, date, startTime || null, endTime || null, req.user!.id]
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  await db.run('DELETE FROM office_tasks WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

export default router;
