import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

async function withTotals(plan: any) {
  const items = await db.all<any>(
    `SELECT pi.id, pi.title, pi.status, pi.scheduled_date as scheduledDate, pi.start_time as startTime,
            pi.end_time as endTime, pi.notes, pi.order_index as orderIndex, pi.price_cents as priceCents,
            pt.id as procedureTypeId, pt.name as procedureName, pt.color as procedureColor
     FROM plan_items pi
     LEFT JOIN procedure_types pt ON pt.id = pi.procedure_type_id
     WHERE pi.plan_id = ?
     ORDER BY pi.order_index, pi.id`,
    [plan.id]
  );
  const total = items.length;
  const done = items.filter((i) => i.status === 'DONE').length;
  const totalCents = items.reduce((sum, i) => sum + (i.priceCents || 0), 0);
  return { ...plan, items, totalItems: total, doneItems: done, totalCents };
}

// Dentista: lista planos do consultório (tenant), opcionalmente filtrados por paciente.
router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { patientId } = req.query as Record<string, string | undefined>;
  let query = `
    SELECT tp.id, tp.title, tp.notes, tp.status, tp.created_at as createdAt, tp.completed_at as completedAt,
           tp.patient_id as patientId, p.name as patientName,
           tp.dentist_id as dentistId, d.name as dentistName
    FROM treatment_plans tp
    JOIN patients p ON p.id = tp.patient_id
    JOIN users d ON d.id = tp.dentist_id
    WHERE p.tenant_id = ?`;
  const params: any[] = [req.user!.tenantId];
  if (patientId) {
    query += ' AND tp.patient_id = ?';
    params.push(patientId);
  }
  query += ' ORDER BY tp.created_at DESC';
  const plans = await db.all<any>(query, params);
  res.json(await Promise.all(plans.map(withTotals)));
});

// Todos os procedimentos pendentes (não concluídos) de planos ativos do consultório —
// usado na lista de "procedimentos pendentes" do calendário.
router.get('/pending-items', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { dentistId } = req.query as Record<string, string | undefined>;
  let query = `
    SELECT pi.id, pi.title, pi.status, pi.scheduled_date as scheduledDate, pi.start_time as startTime,
           pt.name as procedureName, pt.color as procedureColor,
           tp.id as planId, tp.title as planTitle,
           tp.dentist_id as dentistId, d.name as dentistName,
           p.id as patientId, p.name as patientName
    FROM plan_items pi
    JOIN treatment_plans tp ON tp.id = pi.plan_id
    JOIN patients p ON p.id = tp.patient_id
    JOIN users d ON d.id = tp.dentist_id
    LEFT JOIN procedure_types pt ON pt.id = pi.procedure_type_id
    WHERE pi.status != 'DONE' AND tp.status = 'ACTIVE' AND p.tenant_id = ?`;
  const params: any[] = [req.user!.tenantId];
  if (dentistId) {
    query += ' AND tp.dentist_id = ?';
    params.push(dentistId);
  }
  query += ' ORDER BY (pi.scheduled_date IS NULL), pi.scheduled_date, pi.start_time';
  res.json(await db.all(query, params));
});

function canAccessPlan(req: any, plan: any) {
  return !!plan && plan.tenantId === req.user.tenantId;
}

router.get('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const plan = await db.get<any>(
    `SELECT tp.id, tp.title, tp.notes, tp.status, tp.created_at as createdAt, tp.completed_at as completedAt,
            tp.patient_id as patientId, p.name as patientName, p.tenant_id as tenantId,
            tp.dentist_id as dentistId, d.name as dentistName
     FROM treatment_plans tp
     JOIN patients p ON p.id = tp.patient_id
     JOIN users d ON d.id = tp.dentist_id
     WHERE tp.id = ?`,
    [req.params.id]
  );
  if (!canAccessPlan(req, plan)) return res.status(404).json({ error: 'Plano não encontrado.' });
  res.json(await withTotals(plan));
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
  const patient = await db.get('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [
    patientId,
    req.user!.tenantId,
  ]);
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
  completedAt: z.string().nullable().optional(),
});

router.patch('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = updatePlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const plan = await db.get(
    `SELECT tp.id FROM treatment_plans tp JOIN patients p ON p.id = tp.patient_id
     WHERE tp.id = ? AND p.tenant_id = ?`,
    [req.params.id, req.user!.tenantId]
  );
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado.' });

  const fields = parsed.data;
  const columnMap: Record<string, string> = { completedAt: 'completed_at' };
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${columnMap[key] || key} = ?`);
    params.push(value);
  }
  // Ao marcar o plano como concluído, registra a data automaticamente (dia em que
  // foi lançado no sistema), a menos que uma data específica já tenha sido enviada.
  if (fields.status === 'COMPLETED' && fields.completedAt === undefined) {
    sets.push("completed_at = COALESCE(completed_at, date('now'))");
  } else if (fields.status && fields.status !== 'COMPLETED' && fields.completedAt === undefined) {
    sets.push('completed_at = NULL');
  }
  if (sets.length) {
    params.push(req.params.id);
    await db.run(`UPDATE treatment_plans SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const plan = await db.get(
    `SELECT tp.id FROM treatment_plans tp JOIN patients p ON p.id = tp.patient_id
     WHERE tp.id = ? AND p.tenant_id = ?`,
    [req.params.id, req.user!.tenantId]
  );
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado.' });
  await db.run('DELETE FROM treatment_plans WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

// --- Itens do plano (procedimentos e valores) ---

const createItemSchema = z.object({
  procedureTypeId: z.number().int().optional(),
  title: z.string().min(2),
  priceCents: z.number().int().nonnegative().optional(),
  scheduledDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/:id/items', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const plan = await db.get(
    `SELECT tp.id FROM treatment_plans tp JOIN patients p ON p.id = tp.patient_id
     WHERE tp.id = ? AND p.tenant_id = ?`,
    [req.params.id, req.user!.tenantId]
  );
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado.' });

  const { procedureTypeId, title, priceCents, scheduledDate, startTime, endTime, notes } = parsed.data;
  const maxOrder = await db.get<any>('SELECT COALESCE(MAX(order_index), -1) as m FROM plan_items WHERE plan_id = ?', [
    req.params.id,
  ]);
  const status = scheduledDate ? 'SCHEDULED' : 'PENDING';
  const info = await db.run(
    `INSERT INTO plan_items (plan_id, procedure_type_id, title, status, scheduled_date, start_time, end_time, notes, price_cents, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.id,
      procedureTypeId ?? null,
      title,
      status,
      scheduledDate || null,
      startTime || null,
      endTime || null,
      notes || null,
      priceCents ?? 0,
      maxOrder.m + 1,
    ]
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

const updateItemSchema = z.object({
  title: z.string().min(2).optional(),
  status: z.enum(['PENDING', 'SCHEDULED', 'DONE']).optional(),
  procedureTypeId: z.number().int().nullable().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  scheduledDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.patch('/items/:itemId', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const item = await db.get<any>('SELECT id, scheduled_date as scheduledDate FROM plan_items WHERE id = ?', [
    req.params.itemId,
  ]);
  if (!item) return res.status(404).json({ error: 'Procedimento não encontrado.' });

  const fields = parsed.data;
  const columnMap: Record<string, string> = {
    scheduledDate: 'scheduled_date',
    startTime: 'start_time',
    endTime: 'end_time',
    priceCents: 'price_cents',
    procedureTypeId: 'procedure_type_id',
  };
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${columnMap[key] || key} = ?`);
    params.push(value);
  }
  // Ao marcar como concluído sem data ainda definida, registra automaticamente o
  // dia de hoje (o dia em que foi lançado no sistema) como data de realização.
  if (fields.status === 'DONE' && fields.scheduledDate === undefined && !item.scheduledDate) {
    sets.push("scheduled_date = date('now')");
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
