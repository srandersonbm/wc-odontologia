import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { logPatientEvent } from '../events';

const router = Router();

const createPatientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
});

// Pacientes não têm login — são apenas cadastros do consultório (tenant) do dentista logado.
router.post('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { name, email, phone, birthDate } = parsed.data;

  const info = await db.run(
    `INSERT INTO patients (tenant_id, created_by_dentist_id, name, email, phone, birth_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user!.tenantId, req.user!.id, name, email || null, phone || null, birthDate || null]
  );
  await logPatientEvent({
    tenantId: req.user!.tenantId,
    patientId: info.lastInsertRowid,
    type: 'PATIENT_CREATED',
    description: 'Cadastro do paciente criado.',
    actorId: req.user!.id,
    actorName: req.user!.name,
  });
  res.status(201).json({ id: info.lastInsertRowid, name, email, phone, birthDate });
});

// Compartilhado por todos os dentistas do mesmo consultório (tenant).
router.get('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const rows = await db.all(
    `SELECT id, name, email, phone, birth_date as birthDate, created_at as createdAt
     FROM patients WHERE tenant_id = ?
     ORDER BY name COLLATE NOCASE`,
    [req.user!.tenantId]
  );
  res.json(rows);
});

router.get('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await db.get(
    `SELECT id, name, email, phone, birth_date as birthDate, cpf, profession,
            marital_status as maritalStatus, address, city, state, created_at as createdAt
     FROM patients WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user!.tenantId]
  );
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });
  res.json(patient);
});

const updatePatientSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().or(z.literal('')).nullable().optional(),
  phone: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  maritalStatus: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
});

const columnMap: Record<string, string> = {
  birthDate: 'birth_date',
  maritalStatus: 'marital_status',
};

router.patch('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = updatePatientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const patient = await db.get('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [
    req.params.id,
    req.user!.tenantId,
  ]);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    sets.push(`${columnMap[key] || key} = ?`);
    params.push(value === '' ? null : value);
  }
  if (sets.length) {
    params.push(req.params.id);
    await db.run(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`, params);
    await logPatientEvent({
      tenantId: req.user!.tenantId,
      patientId: req.params.id,
      type: 'PATIENT_UPDATED',
      description: 'Dados cadastrais atualizados.',
      actorId: req.user!.id,
      actorName: req.user!.name,
    });
  }
  res.json({ ok: true });
});

// --- Histórico de atividades do paciente (auditoria) ---

router.get('/:id/events', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const rows = await db.all(
    `SELECT id, type, description, actor_name as actorName, created_at as createdAt
     FROM patient_events WHERE patient_id = ? ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

const generatedDocSchema = z.object({
  documentLabel: z.string().min(1),
});

// Registrado pelo front no momento em que um PDF é gerado (a geração é 100% local,
// não passa por upload) — assim a emissão de documentos também aparece no histórico.
router.post('/:id/events/document-generated', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const parsed = generatedDocSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });

  await logPatientEvent({
    tenantId: req.user!.tenantId,
    patientId: req.params.id,
    type: 'DOCUMENT_GENERATED',
    description: `PDF gerado: ${parsed.data.documentLabel}.`,
    actorId: req.user!.id,
    actorName: req.user!.name,
  });
  res.status(201).json({ ok: true });
});

// --- Anamnese (um registro por paciente, editável) ---

async function findPatientInTenant(patientId: string, tenantId: number) {
  return db.get('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patientId, tenantId]);
}

router.get('/:id/anamnesis', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const row = await db.get<any>(
    'SELECT id, data, created_at as createdAt, updated_at as updatedAt FROM anamnesis WHERE patient_id = ?',
    [req.params.id]
  );
  if (!row) return res.json(null);
  res.json({ id: row.id, data: JSON.parse(row.data), createdAt: row.createdAt, updatedAt: row.updatedAt });
});

const anamnesisSchema = z.object({
  data: z.record(z.any()),
});

router.post('/:id/anamnesis', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const parsed = anamnesisSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });

  const existing = await db.get('SELECT id FROM anamnesis WHERE patient_id = ?', [req.params.id]);
  if (existing) return res.status(409).json({ error: 'Este paciente já possui uma anamnese.' });

  const info = await db.run('INSERT INTO anamnesis (patient_id, data) VALUES (?, ?)', [
    req.params.id,
    JSON.stringify(parsed.data.data),
  ]);
  await logPatientEvent({
    tenantId: req.user!.tenantId,
    patientId: req.params.id,
    type: 'ANAMNESIS_CREATED',
    description: 'Anamnese registrada.',
    actorId: req.user!.id,
    actorName: req.user!.name,
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch('/:id/anamnesis', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const parsed = anamnesisSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });

  const existing = await db.get('SELECT id FROM anamnesis WHERE patient_id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Anamnese não encontrada.' });

  await db.run("UPDATE anamnesis SET data = ?, updated_at = datetime('now') WHERE patient_id = ?", [
    JSON.stringify(parsed.data.data),
    req.params.id,
  ]);
  await logPatientEvent({
    tenantId: req.user!.tenantId,
    patientId: req.params.id,
    type: 'ANAMNESIS_UPDATED',
    description: 'Anamnese atualizada.',
    actorId: req.user!.id,
    actorName: req.user!.name,
  });
  res.json({ ok: true });
});

export default router;
