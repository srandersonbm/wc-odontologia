import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const { dentistId } = req.query as Record<string, string | undefined>;
  const tenantId = req.user!.tenantId;

  const patientCount = (
    await db.get<any>('SELECT COUNT(*) as c FROM patients WHERE tenant_id = ?', [tenantId])
  ).c;

  const pendingWhere = dentistId ? 'AND tp.dentist_id = ?' : '';
  const pendingParams = dentistId ? [tenantId, dentistId] : [tenantId];
  const pendingProcedures = (
    await db.get<any>(
      `SELECT COUNT(*) as c FROM plan_items pi
       JOIN treatment_plans tp ON tp.id = pi.plan_id
       JOIN patients p ON p.id = tp.patient_id
       WHERE pi.status != 'DONE' AND tp.status = 'ACTIVE' AND p.tenant_id = ? ${pendingWhere}`,
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
    const params = dentistId ? [tenantId, fromDate, toDate, dentistId] : [tenantId, fromDate, toDate];
    return (
      await db.get<any>(
        `SELECT COUNT(*) as c FROM plan_items pi
         JOIN treatment_plans tp ON tp.id = pi.plan_id
         JOIN patients p ON p.id = tp.patient_id
         WHERE p.tenant_id = ? AND tp.status = 'ACTIVE' AND pi.scheduled_date >= ? AND pi.scheduled_date <= ? ${where}`,
        params
      )
    ).c;
  }

  const upcomingWhere = dentistId ? 'AND tp.dentist_id = ?' : '';
  const upcomingParams = dentistId
    ? [tenantId, todayStr, weekEndStr, dentistId]
    : [tenantId, todayStr, weekEndStr];
  const upcoming = await db.all(
    `SELECT pi.id, pi.title, pi.scheduled_date as date, pi.start_time as startTime,
            p.name as patientName, d.name as dentistName, 'appointment' as kind
     FROM plan_items pi
     JOIN treatment_plans tp ON tp.id = pi.plan_id
     JOIN patients p ON p.id = tp.patient_id
     JOIN users d ON d.id = tp.dentist_id
     WHERE p.tenant_id = ? AND tp.status = 'ACTIVE' AND pi.scheduled_date >= ? AND pi.scheduled_date <= ? ${upcomingWhere}
     ORDER BY pi.scheduled_date, pi.start_time
     LIMIT 8`,
    upcomingParams
  );

  res.json({
    patientCount,
    pendingProcedures,
    todayCount: await countAppointments(todayStr, todayStr),
    tomorrowCount: await countAppointments(tomorrowStr, tomorrowStr),
    weekCount: await countAppointments(todayStr, weekEndStr),
    upcoming,
  });
});

export default router;
