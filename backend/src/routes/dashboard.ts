import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { dentistId } = req.query as Record<string, string | undefined>;

  const patientCount = (await db.get<any>('SELECT COUNT(*) as c FROM patients')).c;

  const pendingWhere = dentistId ? 'AND tp.dentist_id = ?' : '';
  const pendingParams = dentistId ? [dentistId] : [];
  const pendingProcedures = (
    await db.get<any>(
      `SELECT COUNT(*) as c FROM plan_items pi JOIN treatment_plans tp ON tp.id = pi.plan_id
       WHERE pi.status != 'DONE' ${pendingWhere}`,
      pendingParams
    )
  ).c;

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const todayStr = fmt(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = fmt(tomorrow);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = fmt(weekEnd);

  async function countAppointments(fromDate: string, toDate: string) {
    const where = dentistId ? 'AND tp.dentist_id = ?' : '';
    const params = dentistId ? [fromDate, toDate, dentistId] : [fromDate, toDate];
    return (
      await db.get<any>(
        `SELECT COUNT(*) as c FROM plan_items pi JOIN treatment_plans tp ON tp.id = pi.plan_id
         WHERE pi.scheduled_date >= ? AND pi.scheduled_date <= ? ${where}`,
        params
      )
    ).c;
  }

  async function countOfficeTasks(fromDate: string, toDate: string) {
    const where = dentistId ? 'AND (t.dentist_id = ? OR t.dentist_id IS NULL)' : '';
    const params = dentistId ? [fromDate, toDate, dentistId] : [fromDate, toDate];
    return (
      await db.get<any>(`SELECT COUNT(*) as c FROM office_tasks t WHERE t.date >= ? AND t.date <= ? ${where}`, params)
    ).c;
  }

  const upcomingWhere = dentistId ? 'AND tp.dentist_id = ?' : '';
  const upcomingParams = dentistId ? [todayStr, weekEndStr, dentistId] : [todayStr, weekEndStr];
  const upcoming = await db.all(
    `SELECT pi.id, pi.title, pi.scheduled_date as date, pi.start_time as startTime,
            p.name as patientName, d.name as dentistName, 'appointment' as kind
     FROM plan_items pi
     JOIN treatment_plans tp ON tp.id = pi.plan_id
     JOIN users p ON p.id = tp.patient_id
     JOIN users d ON d.id = tp.dentist_id
     WHERE pi.scheduled_date >= ? AND pi.scheduled_date <= ? ${upcomingWhere}
     ORDER BY pi.scheduled_date, pi.start_time
     LIMIT 8`,
    upcomingParams
  );

  res.json({
    patientCount,
    pendingProcedures,
    todayCount: (await countAppointments(todayStr, todayStr)) + (await countOfficeTasks(todayStr, todayStr)),
    tomorrowCount:
      (await countAppointments(tomorrowStr, tomorrowStr)) + (await countOfficeTasks(tomorrowStr, tomorrowStr)),
    weekCount: (await countAppointments(todayStr, weekEndStr)) + (await countOfficeTasks(todayStr, weekEndStr)),
    upcoming,
  });
});

router.get('/me', requireAuth, requireRole('PATIENT'), async (req, res) => {
  const next = await db.get(
    `SELECT pi.id, pi.title, pi.scheduled_date as date, pi.start_time as startTime, d.name as dentistName,
            pt.name as procedureName
     FROM plan_items pi
     JOIN treatment_plans tp ON tp.id = pi.plan_id
     JOIN users d ON d.id = tp.dentist_id
     LEFT JOIN procedure_types pt ON pt.id = pi.procedure_type_id
     WHERE tp.patient_id = ? AND pi.scheduled_date >= date('now')
     ORDER BY pi.scheduled_date, pi.start_time
     LIMIT 1`,
    [req.user!.id]
  );

  const plans = await db.all(`SELECT tp.id FROM treatment_plans tp WHERE tp.patient_id = ? AND tp.status = 'ACTIVE'`, [
    req.user!.id,
  ]);

  res.json({ nextAppointment: next || null, activePlanCount: plans.length });
});

export default router;
