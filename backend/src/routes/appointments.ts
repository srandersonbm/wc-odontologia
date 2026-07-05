import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Itens agendados do plano de tratamento funcionam como "atendimentos" nos calendários.

router.get('/me', requireAuth, requireRole('PATIENT'), async (req, res) => {
  const rows = await db.all(
    `SELECT pi.id, pi.title, pi.status, pi.scheduled_date as scheduledDate, pi.start_time as startTime,
            pi.end_time as endTime, pt.name as procedureName, pt.color as procedureColor,
            d.name as dentistName, tp.id as planId
     FROM plan_items pi
     JOIN treatment_plans tp ON tp.id = pi.plan_id
     JOIN users d ON d.id = tp.dentist_id
     LEFT JOIN procedure_types pt ON pt.id = pi.procedure_type_id
     WHERE tp.patient_id = ? AND pi.scheduled_date IS NOT NULL
     ORDER BY pi.scheduled_date, pi.start_time`,
    [req.user!.id]
  );
  res.json(rows);
});

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
    JOIN users p ON p.id = tp.patient_id
    LEFT JOIN procedure_types pt ON pt.id = pi.procedure_type_id
    WHERE pi.scheduled_date IS NOT NULL`;
  const params: any[] = [];
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

export default router;
