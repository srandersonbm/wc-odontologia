import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const SITES = ['mv', 'v', 'dv', 'ml', 'l', 'dl'] as const;

async function findPatientInTenant(patientId: string, tenantId: number) {
  return db.get('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patientId, tenantId]);
}

// Retorna o periograma completo do paciente: medidas por face + mobilidade/furca por dente.
router.get('/:id/perio', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const siteRows = await db.all<any>(
    `SELECT tooth_fdi as toothFdi, site, probing_depth as probingDepth, recession, bleeding, suppuration
     FROM perio_sites WHERE patient_id = ?`,
    [req.params.id]
  );
  const teethRows = await db.all<any>(
    `SELECT tooth_fdi as toothFdi, mobility, furcation FROM perio_teeth WHERE patient_id = ?`,
    [req.params.id]
  );

  res.json({
    sites: siteRows.map((s) => ({ ...s, bleeding: !!s.bleeding, suppuration: !!s.suppuration })),
    teeth: teethRows,
  });
});

const siteSchema = z.object({
  toothFdi: z.number().int(),
  site: z.enum(SITES),
  probingDepth: z.number().int().min(0).max(20).nullable().optional(),
  recession: z.number().int().min(-9).max(20).nullable().optional(),
  bleeding: z.boolean().optional(),
  suppuration: z.boolean().optional(),
});

// Grava (upsert) a medida de uma face de um dente.
router.put('/:id/perio/site', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const parsed = siteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { toothFdi, site, probingDepth, recession, bleeding, suppuration } = parsed.data;

  await db.run(
    `INSERT INTO perio_sites (tenant_id, patient_id, tooth_fdi, site, probing_depth, recession, bleeding, suppuration, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (patient_id, tooth_fdi, site) DO UPDATE SET
       probing_depth = excluded.probing_depth,
       recession = excluded.recession,
       bleeding = excluded.bleeding,
       suppuration = excluded.suppuration,
       updated_at = datetime('now')`,
    [
      req.user!.tenantId,
      req.params.id,
      toothFdi,
      site,
      probingDepth ?? null,
      recession ?? null,
      bleeding ? 1 : 0,
      suppuration ? 1 : 0,
    ]
  );
  res.json({ ok: true });
});

const toothSchema = z.object({
  toothFdi: z.number().int(),
  mobility: z.number().int().min(0).max(3).optional(),
  furcation: z.number().int().min(0).max(3).optional(),
});

// Grava (upsert) mobilidade/furca de um dente.
router.put('/:id/perio/tooth', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const parsed = toothSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { toothFdi, mobility, furcation } = parsed.data;

  await db.run(
    `INSERT INTO perio_teeth (tenant_id, patient_id, tooth_fdi, mobility, furcation, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (patient_id, tooth_fdi) DO UPDATE SET
       mobility = excluded.mobility,
       furcation = excluded.furcation,
       updated_at = datetime('now')`,
    [req.user!.tenantId, req.params.id, toothFdi, mobility ?? 0, furcation ?? 0]
  );
  res.json({ ok: true });
});

export default router;
