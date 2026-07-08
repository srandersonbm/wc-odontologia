import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const uploadExtra = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const documentTypes = ['ANAMNESIS', 'TREATMENT_PLAN', 'TERMO', 'ATESTADO'] as const;

async function findPatientInTenant(patientId: string, tenantId: number) {
  return db.get('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patientId, tenantId]);
}

// Lista os documentos assinados de um paciente (sem os bytes do arquivo).
router.get('/:id/documents', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const rows = await db.all(
    `SELECT id, plan_id as planId, type, file_name as fileName, uploaded_at as uploadedAt
     FROM signed_documents WHERE patient_id = ? ORDER BY uploaded_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

const uploadBodySchema = z.object({
  type: z.enum(documentTypes),
  planId: z.string().optional(),
});

// Envia o PDF assinado de um documento (anamnese, plano, termo ou atestado).
router.post(
  '/:id/documents',
  requireAuth,
  requireRole('DENTIST'),
  upload.single('file'),
  async (req, res) => {
    const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

    const parsed = uploadBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Envie um arquivo PDF.' });
    }

    const info = await db.run(
      `INSERT INTO signed_documents (tenant_id, patient_id, plan_id, type, file_name, mime_type, data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user!.tenantId,
        req.params.id,
        parsed.data.planId ? Number(parsed.data.planId) : null,
        parsed.data.type,
        req.file.originalname,
        req.file.mimetype,
        req.file.buffer,
      ]
    );
    res.status(201).json({ id: info.lastInsertRowid });
  }
);

// Baixa os bytes de um documento assinado.
router.get('/:id/documents/:docId/file', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const doc = await db.get<any>(
    'SELECT file_name as fileName, mime_type as mimeType, data FROM signed_documents WHERE id = ? AND patient_id = ?',
    [req.params.docId, req.params.id]
  );
  if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
  res.send(Buffer.from(doc.data));
});

router.delete('/:id/documents/:docId', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  await db.run('DELETE FROM signed_documents WHERE id = ? AND patient_id = ?', [req.params.docId, req.params.id]);
  res.status(204).end();
});

// --- Documentação extra do paciente: arquivos variados, cada um com título próprio ---

// Lista a documentação extra de um paciente (sem os bytes do arquivo).
router.get('/:id/extra-documents', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const rows = await db.all(
    `SELECT id, title, file_name as fileName, mime_type as mimeType, uploaded_at as uploadedAt
     FROM patient_documents WHERE patient_id = ? ORDER BY uploaded_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

const uploadExtraBodySchema = z.object({
  title: z.string().min(1, 'Informe um título para o documento.'),
});

router.post(
  '/:id/extra-documents',
  requireAuth,
  requireRole('DENTIST'),
  uploadExtra.single('file'),
  async (req, res) => {
    const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

    const parsed = uploadExtraBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const info = await db.run(
      `INSERT INTO patient_documents (tenant_id, patient_id, title, file_name, mime_type, data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user!.tenantId, req.params.id, parsed.data.title, req.file.originalname, req.file.mimetype, req.file.buffer]
    );
    res.status(201).json({ id: info.lastInsertRowid });
  }
);

router.get('/:id/extra-documents/:docId/file', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const doc = await db.get<any>(
    'SELECT file_name as fileName, mime_type as mimeType, data FROM patient_documents WHERE id = ? AND patient_id = ?',
    [req.params.docId, req.params.id]
  );
  if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
  res.send(Buffer.from(doc.data));
});

router.delete('/:id/extra-documents/:docId', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await findPatientInTenant(req.params.id, req.user!.tenantId);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  await db.run('DELETE FROM patient_documents WHERE id = ? AND patient_id = ?', [req.params.docId, req.params.id]);
  res.status(204).end();
});

export default router;
