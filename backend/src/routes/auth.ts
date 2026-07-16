import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../db';
import { signToken } from '../utils/jwt';
import { requireAuth, requireRole } from '../middleware/auth';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

const registerDentistSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  specialty: z.string().optional(),
});

// Público: qualquer pessoa pode abrir a primeira conta de dentista de um novo consultório.
// Esse dentista se torna o "dono" do tenant (consultório) — os próximos dentistas e
// pacientes cadastrados sob esse consultório ficam isolados dos demais.
router.post('/register-dentist', async (req, res) => {
  const parsed = registerDentistSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { name, email, password, specialty } = parsed.data;

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(
    'INSERT INTO users (role, name, email, password_hash) VALUES (?, ?, ?, ?)',
    ['DENTIST', name, email, hash]
  );
  const tenantId = info.lastInsertRowid;
  await db.run('UPDATE users SET tenant_id = ? WHERE id = ?', [tenantId, tenantId]);

  const colors = ['#c9a24b', '#8a9a86', '#a68a6a', '#6a8a9a', '#9a7a8a'];
  const color = colors[tenantId % colors.length];
  await db.run('INSERT INTO dentists (user_id, specialty, color) VALUES (?, ?, ?)', [
    tenantId,
    specialty || null,
    color,
  ]);
  const token = signToken({ id: tenantId, role: 'DENTIST', name, tenantId });
  res.status(201).json({ token, user: { id: tenantId, role: 'DENTIST', name, email } });
});

// Somente dentista: convida outro dentista para o mesmo consultório (tenant).
router.post('/register-dentist-internal', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = registerDentistSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { name, email, password, specialty } = parsed.data;

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(
    'INSERT INTO users (role, name, email, password_hash, tenant_id) VALUES (?, ?, ?, ?, ?)',
    ['DENTIST', name, email, hash, req.user!.tenantId]
  );
  const colors = ['#c9a24b', '#8a9a86', '#a68a6a', '#6a8a9a', '#9a7a8a'];
  const color = colors[Number(info.lastInsertRowid) % colors.length];
  await db.run('INSERT INTO dentists (user_id, specialty, color) VALUES (?, ?, ?)', [
    info.lastInsertRowid,
    specialty || null,
    color,
  ]);

  res.status(201).json({ id: info.lastInsertRowid, name, email });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { email, password } = parsed.data;

  const user = await db.get<any>(
    'SELECT id, role, name, email, password_hash, tenant_id as tenantId FROM users WHERE email = ?',
    [email]
  );
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const token = signToken({ id: user.id, role: user.role, name: user.name, tenantId: user.tenantId });
  res.json({ token, user: { id: user.id, role: user.role, name: user.name, email: user.email } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await db.get<any>('SELECT id, role, name, email FROM users WHERE id = ?', [req.user!.id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const dentist = await db.get<any>(
    `SELECT specialty, color, phone, address, instagram, stamp_name as stampName,
            cro_number as croNumber, cro_uf as croUf, signature_mime as signatureMime,
            signature_data as signatureData, logo_mime as logoMime, logo_data as logoData
     FROM dentists WHERE user_id = ?`,
    [user.id]
  );
  const { signatureData, signatureMime, logoData, logoMime, ...dentistRest } = dentist || {};
  const signatureDataUrl =
    signatureData && signatureMime
      ? `data:${signatureMime};base64,${Buffer.from(signatureData).toString('base64')}`
      : null;
  const logoDataUrl =
    logoData && logoMime ? `data:${logoMime};base64,${Buffer.from(logoData).toString('base64')}` : null;
  res.json({ ...user, ...dentistRest, signatureDataUrl, logoDataUrl });
});

const updateProfileSchema = z.object({
  specialty: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  instagram: z.string().optional(),
  stampName: z.string().optional(),
  croNumber: z.string().optional(),
  croUf: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const profileColumnMap: Record<string, string> = {
  stampName: 'stamp_name',
  croNumber: 'cro_number',
  croUf: 'cro_uf',
};

// Dados do próprio dentista usados nos cabeçalhos e assinatura dos documentos
// gerados (termo, atestado, plano, anamnese).
router.patch('/me', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });

  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    sets.push(`${profileColumnMap[key] || key} = ?`);
    params.push(value || null);
  }
  if (sets.length) {
    params.push(req.user!.id);
    await db.run(`UPDATE dentists SET ${sets.join(', ')} WHERE user_id = ?`, params);
  }
  res.json({ ok: true });
});

// Envia a imagem (PNG) da assinatura do dentista logado, usada nos PDFs gerados.
router.post('/me/signature', requireAuth, requireRole('DENTIST'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  if (req.file.mimetype !== 'image/png') return res.status(400).json({ error: 'Envie uma imagem PNG.' });

  await db.run('UPDATE dentists SET signature_data = ?, signature_mime = ? WHERE user_id = ?', [
    req.file.buffer,
    req.file.mimetype,
    req.user!.id,
  ]);
  res.status(201).json({ ok: true });
});

router.delete('/me/signature', requireAuth, requireRole('DENTIST'), async (req, res) => {
  await db.run('UPDATE dentists SET signature_data = NULL, signature_mime = NULL WHERE user_id = ?', [
    req.user!.id,
  ]);
  res.status(204).end();
});

// Envia a logo do consultório (PNG), usada no cabeçalho dos documentos gerados.
router.post('/me/logo', requireAuth, requireRole('DENTIST'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  if (req.file.mimetype !== 'image/png') return res.status(400).json({ error: 'Envie uma imagem PNG.' });

  await db.run('UPDATE dentists SET logo_data = ?, logo_mime = ? WHERE user_id = ?', [
    req.file.buffer,
    req.file.mimetype,
    req.user!.id,
  ]);
  res.status(201).json({ ok: true });
});

router.delete('/me/logo', requireAuth, requireRole('DENTIST'), async (req, res) => {
  await db.run('UPDATE dentists SET logo_data = NULL, logo_mime = NULL WHERE user_id = ?', [req.user!.id]);
  res.status(204).end();
});

export default router;
