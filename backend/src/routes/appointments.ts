import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Itens agendados de planos aprovados (ativos) funcionam como "atendimentos" no calendário.
router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { from, to, dentistId } = req.query as Record<string, string | undefined>;
  let query = `
    SELECT pi.id, pi.title, pi.status, pi.scheduled_date as scheduledDate, pi.start_time as startTime,
           pi.end_time as endTime, pt.name as procedureName, pt.color as procedureColor,
           tp.dentist_id as dentistId, d.name as dentistName,
           tp.patient_id as patientId, p.name as patientName, tp.id as planId
    FROM plan_items pi
    JOIN treatment_plans tp ON tp.id = pi.plan_id
    JOIN users d ON d.id = tp.dentist_id
    JOIN patients p ON p.id = tp.patient_id
    LEFT JOIN procedure_types pt ON pt.id = pi.procedure_type_id
    WHERE pi.scheduled_date IS NOT NULL AND tp.status = 'ACTIVE' AND p.tenant_id = ?`;
  const params: any[] = [req.user!.tenantId];
  if (from) {
    query += ' AND pi.scheduled_date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND pi.scheduled_date <= ?';
    params.push(to);
  }
  if (dentistId) {
    query += ' AND tp.dentist_id = ?';
    params.push(dentistId);
  }
  query += ' ORDER BY pi.scheduled_date, pi.start_time';
  res.json(await db.all(query, params));
});

const createAppointmentSchema = z.object({
  patientId: z.number().int(),
  dentistId: z.number().int(),
  procedureTypeId: z.number().int(),
  date: z.string().min(8),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Agenda um atendimento: encontra (ou cria) o plano ativo do paciente com o
// dentista escolhido e adiciona o procedimento já com data marcada.
router.post('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createAppointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { patientId, dentistId, procedureTypeId, date, startTime, endTime } = parsed.data;

  const patient = await db.get('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [
    patientId,
    req.user!.tenantId,
  ]);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const dentist = await db.get('SELECT id FROM users WHERE id = ? AND tenant_id = ?', [
    dentistId,
    req.user!.tenantId,
  ]);
  if (!dentist) return res.status(404).json({ error: 'Dentista não encontrado.' });

  const procedureType = await db.get<any>(
    'SELECT id, name, default_duration_min as defaultDurationMin FROM procedure_types WHERE id = ? AND dentist_id = ?',
    [procedureTypeId, dentistId]
  );
  if (!procedureType) return res.status(404).json({ error: 'Procedimento não encontrado para este dentista.' });

  let plan = await db.get<any>(
    `SELECT id FROM treatment_plans WHERE patient_id = ? AND dentist_id = ? AND status = 'ACTIVE'
     ORDER BY created_at DESC LIMIT 1`,
    [patientId, dentistId]
  );
  let planId: number;
  if (plan) {
    planId = plan.id;
  } else {
    const info = await db.run('INSERT INTO treatment_plans (patient_id, dentist_id, title) VALUES (?, ?, ?)', [
      patientId,
      dentistId,
      'Atendimentos',
    ]);
    planId = Number(info.lastInsertRowid);
  }

  const computedEndTime = endTime || (startTime ? addMinutes(startTime, procedureType.defaultDurationMin || 30) : null);

  const maxOrder = await db.get<any>('SELECT COALESCE(MAX(order_index), -1) as m FROM plan_items WHERE plan_id = ?', [
    planId,
  ]);
  const info = await db.run(
    `INSERT INTO plan_items (plan_id, procedure_type_id, title, status, scheduled_date, start_time, end_time, order_index)
     VALUES (?, ?, ?, 'SCHEDULED', ?, ?, ?, ?)`,
    [planId, procedureTypeId, procedureType.name, date, startTime || null, computedEndTime, maxOrder.m + 1]
  );
  res.status(201).json({ id: info.lastInsertRowid, planId });
});

export default router;
