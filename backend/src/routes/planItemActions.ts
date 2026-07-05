import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const cancelSchema = z.object({
  reason: z.string().min(2),
});

// Paciente avisa que não poderá comparecer a um atendimento agendado — só permitido com 24h+ de antecedência.
router.post('/:itemId/cancel-notice', requireAuth, requireRole('PATIENT'), async (req, res) => {
  const parsed = cancelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe um motivo.' });

  const item = await db.get<any>(
    `SELECT pi.id, pi.scheduled_date as scheduledDate, pi.start_time as startTime, tp.patient_id as patientId
     FROM plan_items pi JOIN treatment_plans tp ON tp.id = pi.plan_id
     WHERE pi.id = ?`,
    [req.params.itemId]
  );

  if (!item || item.patientId !== req.user!.id) {
    return res.status(404).json({ error: 'Atendimento não encontrado.' });
  }
  if (!item.scheduledDate) {
    return res.status(400).json({ error: 'Este procedimento ainda não está agendado.' });
  }

  const appointmentDateTime = new Date(`${item.scheduledDate}T${item.startTime || '00:00'}:00`);
  const hoursUntil = (appointmentDateTime.getTime() - Date.now()) / TWENTY_FOUR_HOURS_MS;
  if (hoursUntil < 1) {
    return res
      .status(400)
      .json({ error: 'Avisos de indisponibilidade só podem ser enviados com 24 horas de antecedência.' });
  }

  await db.run('INSERT INTO cancel_notices (plan_item_id, patient_id, reason) VALUES (?, ?, ?)', [
    req.params.itemId,
    req.user!.id,
    parsed.data.reason,
  ]);
  await db.run("UPDATE plan_items SET status = 'PENDING' WHERE id = ?", [req.params.itemId]);
  res.status(201).json({ ok: true });
});

// Visão do dentista: lista avisos de indisponibilidade enviados por pacientes, mais recentes primeiro.
router.get('/cancel-notices', requireAuth, requireRole('DENTIST'), async (_req, res) => {
  const rows = await db.all(
    `SELECT cn.id, cn.reason, cn.created_at as createdAt,
            cn.plan_item_id as planItemId, pi.title as itemTitle, pi.scheduled_date as scheduledDate,
            u.name as patientName
     FROM cancel_notices cn
     JOIN plan_items pi ON pi.id = cn.plan_item_id
     JOIN users u ON u.id = cn.patient_id
     ORDER BY cn.created_at DESC
     LIMIT 50`
  );
  res.json(rows);
});

export default router;
