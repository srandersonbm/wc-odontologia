import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

async function findPatientInTenant(patientId: string, tenantId: number) {
  return db.get('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patientId, tenantId]);
}

// Lista as observações do odontograma de um paciente (todas, de todos os dentes).
router.get('/:id/tooth-notes', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const rows = await db.all(
    `SELECT tn.id, tn.tooth_fdi as toothFdi, tn.note, tn.created_at as createdAt, d.name as dentistName
     FROM tooth_notes tn LEFT JOIN users d ON d.id = tn.dentist_id
     WHERE tn.patient_id = ? ORDER BY tn.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

const createNoteSchema = z.object({
  toothFdi: z.number().int(),
  note: z.string().min(1, 'Escreva uma observação.'),
});

router.post('/:id/tooth-notes', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' });

  const info = await db.run(
    `INSERT INTO tooth_notes (tenant_id, patient_id, tooth_fdi, note, dentist_id) VALUES (?, ?, ?, ?, ?)`,
    [req.user!.tenantId, req.params.id, parsed.data.toothFdi, parsed.data.note, req.user!.id]
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/:id/tooth-notes/:noteId', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  await db.run('DELETE FROM tooth_notes WHERE id = ? AND patient_id = ?', [req.params.noteId, req.params.id]);
  res.status(204).end();
});

export default router;
