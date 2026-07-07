import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Cada dentista mantém sua própria lista de categorias de procedimento.
// ?dentistId= permite consultar os procedimentos de outro dentista do mesmo
// consultório (usado ao agendar um atendimento para outro profissional).
router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { dentistId } = req.query as Record<string, string | undefined>;
  let targetId = req.user!.id;
  if (dentistId && Number(dentistId) !== req.user!.id) {
    const target = await db.get('SELECT id FROM users WHERE id = ? AND tenant_id = ?', [
      dentistId,
      req.user!.tenantId,
    ]);
    if (!target) return res.status(404).json({ error: 'Dentista não encontrado.' });
    targetId = Number(dentistId);
  }
  const rows = await db.all(
    'SELECT id, name, color, default_duration_min as defaultDurationMin FROM procedure_types WHERE dentist_id = ? ORDER BY name COLLATE NOCASE',
    [targetId]
  );
  res.json(rows);
});

const createSchema = z.object({
  name: z.string().min(2),
  color: z.string().optional(),
  defaultDurationMin: z.number().int().positive().optional(),
});

router.post('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { name, color, defaultDurationMin } = parsed.data;
  const info = await db.run(
    'INSERT INTO procedure_types (dentist_id, name, color, default_duration_min) VALUES (?, ?, ?, ?)',
    [req.user!.id, name, color || '#c9a24b', defaultDurationMin || 30]
  );
  res
    .status(201)
    .json({ id: info.lastInsertRowid, name, color: color || '#c9a24b', defaultDurationMin: defaultDurationMin || 30 });
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  color: z.string().optional(),
  defaultDurationMin: z.number().int().positive().optional(),
});

router.patch('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const owned = await db.get('SELECT id FROM procedure_types WHERE id = ? AND dentist_id = ?', [
    req.params.id,
    req.user!.id,
  ]);
  if (!owned) return res.status(404).json({ error: 'Procedimento não encontrado.' });

  const columnMap: Record<string, string> = { defaultDurationMin: 'default_duration_min' };
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    sets.push(`${columnMap[key] || key} = ?`);
    params.push(value);
  }
  if (sets.length) {
    params.push(req.params.id);
    await db.run(`UPDATE procedure_types SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const owned = await db.get('SELECT id FROM procedure_types WHERE id = ? AND dentist_id = ?', [
    req.params.id,
    req.user!.id,
  ]);
  if (!owned) return res.status(404).json({ error: 'Procedimento não encontrado.' });
  await db.run('DELETE FROM procedure_types WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

export default router;
