import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

async function withProgress(plan: any) {
  const items = await db.all<any>(
    `SELECT pi.id, pi.title, pi.status, pi.scheduled_date as scheduledDate, pi.start_time as startTime,
            pi.end_time as endTime, pi.notes, pi.order_index as orderIndex,
            pt.id as procedureTypeId, pt.name as procedureName, pt.color as procedureColor
     FROM plan_items pi
     LEFT JOIN procedure_types pt ON pt.id = pi.procedure_type_id
     WHERE pi.plan_id = ?
     ORDER BY pi.order_index, pi.id`,
    [plan.id]
  );
  const total = items.length;
  const done = items.filter((i) => i.status === 'DONE').length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  return { ...plan, items, progress, totalItems: total, doneItems: done };
}

// Dentista: lista planos, opcionalmente filtrados por paciente.
router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { patientId } = req.query as Record<string, string | undefined>;
  let query = `
    SELECT tp.id, tp.title, tp.notes, tp.status, tp.created_at as createdAt,
           tp.patient_id as patientId, p.name as patientName,
           tp.dentist_id as dentistId, d.name as dentistName
    FROM treatment_plans tp
    JOIN users p ON p.id = tp.patient_id
    JOIN users d ON d.id = tp.dentist_id
    WHERE 1=1`;
  const params: any[] = [];
  if (patientId) {
    query += ' AND tp.patient_id = ?';
    params.push(patientId);
  }
  query += ' ORDER BY tp.created_at DESC';
  const plans = await db.all<any>(query, params);
  res.json(await Promise.all(plans.map(withProgress)));
});

// Paciente: apenas os próprios planos.
router.get('/me', requireAuth, requireRole('PATIENT'), async (req, res) => {
  const plans = await db.all<any>(
    `SELECT tp.id, tp.title, tp.notes, tp.status, tp.created_at as createdAt,
            tp.dentist_id as dentistId, d.name as dentistName
     FROM treatment_plans tp
     JOIN users d ON d.id = tp.dentist_id
     WHERE tp.patient_id = ?
     ORDER BY tp.created_at DESC`,
    [req.user!.id]
  );
  res.json(await Promise.all(plans.map(withProgress)));
});

function canAccessPlan(req: any, plan: any) {
  if (!plan) return false;
  if (req.user.role === 'DENTIST') return true;
  return plan.patient_id === req.user.id;
}

router.get('/:id', requireAuth, async (req, res) => {
  const plan = await db.get<any>(
    `SELECT tp.id, tp.title, tp.notes, tp.status, tp.created_at as createdAt,
            tp.patient_id, tp.patient_id as patientId, p.name as patientName,
            tp.dentist_id as dentistId, d.name as dentistName
     FROM treatment_plans tp
     JOIN users p ON p.id = tp.patient_id
     JOIN users d ON d.id = tp.dentist_id
     WHERE tp.id = ?`,
    [req.params.id]
  );
  if (!canAccessPlan(req, plan)) return res.status(404).json({ error: 'Plano não encontrado.' });
  res.json(await withProgress(plan));
});

const createPlanSchema = z.object({
  patientId: z.number().int(),
  title: z.string().min(2),
  notes: z.string().optional(),
});

router.post('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { patientId, title, notes } = parsed.data;
  const patient = await db.get('SELECT user_id FROM patients WHERE user_id = ?', [patientId]);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const info = await db.run(
    'INSERT INTO treatment_plans (patient_id, dentist_id, title, notes) VALUES (?, ?, ?, ?)',
    [patientId, req.user!.id, title, notes || null]
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

const updatePlanSchema = z.object({
  title: z.string().min(2).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

router.patch('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = updatePlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const plan = await db.get('SELECT id FROM treatment_plans WHERE id = ?', [req.params.id]);
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado.' });

  const fields = parsed.data;
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    params.push(value);
  }
  if (sets.length) {
    params.push(req.params.id);
    await db.run(`UPDATE treatment_plans SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  res.json({ ok: true });
});

// --- Itens do plano (procedimentos dentro de um plano) ---

const createItemSchema = z.object({
  procedureTypeId: z.number().int().optional(),
  title: z.string().min(2),
  scheduledDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/:id/items', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const plan = await db.get('SELECT id FROM treatment_plans WHERE id = ?', [req.params.id]);
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado.' });

  const { procedureTypeId, title, scheduledDate, startTime, endTime, notes } = parsed.data;
  const maxOrder = await db.get<any>('SELECT COALESCE(MAX(order_index), -1) as m FROM plan_items WHERE plan_id = ?', [
    req.params.id,
  ]);
  const status = scheduledDate ? 'SCHEDULED' : 'PENDING';
  const info = await db.run(
    `INSERT INTO plan_items (plan_id, procedure_type_id, title, status, scheduled_date, start_time, end_time, notes, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.id,
      procedureTypeId ?? null,
      title,
      status,
      scheduledDate || null,
      startTime || null,
      endTime || null,
      notes || null,
      maxOrder.m + 1,
    ]
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

const updateItemSchema = z.object({
  title: z.string().min(2).optional(),
  status: z.enum(['PENDING', 'SCHEDULED', 'DONE']).optional(),
  scheduledDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.patch('/items/:itemId', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const item = await db.get('SELECT id FROM plan_items WHERE id = ?', [req.params.itemId]);
  if (!item) return res.status(404).json({ error: 'Procedimento não encontrado.' });

  const fields = parsed.data;
  const columnMap: Record<string, string> = {
    scheduledDate: 'scheduled_date',
    startTime: 'start_time',
    endTime: 'end_time',
  };
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${columnMap[key] || key} = ?`);
    params.push(value);
  }
  if (sets.length) {
    params.push(req.params.itemId);
    await db.run(`UPDATE plan_items SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  res.json({ ok: true });
});

router.delete('/items/:itemId', requireAuth, requireRole('DENTIST'), async (req, res) => {
  await db.run('DELETE FROM plan_items WHERE id = ?', [req.params.itemId]);
  res.status(204).end();
});

export default router;
