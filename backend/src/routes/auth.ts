import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db';
import { signToken } from '../utils/jwt';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const registerDentistSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  specialty: z.string().optional(),
});

// Público: qualquer pessoa pode abrir a primeira conta de dentista do consultório.
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
  const colors = ['#c9a24b', '#8a9a86', '#a68a6a', '#6a8a9a', '#9a7a8a'];
  const color = colors[info.lastInsertRowid % colors.length];
  await db.run('INSERT INTO dentists (user_id, specialty, color) VALUES (?, ?, ?)', [
    info.lastInsertRowid,
    specialty || null,
    color,
  ]);

  const token = signToken({ id: info.lastInsertRowid, role: 'DENTIST', name });
  res.status(201).json({ token, user: { id: info.lastInsertRowid, role: 'DENTIST', name, email } });
});

// Somente dentista: convida outro dentista para o consultório.
router.post('/register-dentist-internal', requireAuth, requireRole('DENTIST'), async (req, res) => {
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
  const colors = ['#c9a24b', '#8a9a86', '#a68a6a', '#6a8a9a', '#9a7a8a'];
  const color = colors[info.lastInsertRowid % colors.length];
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
    'SELECT id, role, name, email, password_hash FROM users WHERE email = ?',
    [email]
  );
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const token = signToken({ id: user.id, role: user.role, name: user.name });
  res.json({ token, user: { id: user.id, role: user.role, name: user.name, email: user.email } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await db.get<any>('SELECT id, role, name, email FROM users WHERE id = ?', [req.user!.id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (user.role === 'DENTIST') {
    const dentist = await db.get<any>('SELECT specialty, color FROM dentists WHERE user_id = ?', [user.id]);
    return res.json({ ...user, specialty: dentist?.specialty, color: dentist?.color });
  }
  const patient = await db.get<any>(
    'SELECT phone, birth_date, created_by_dentist_id FROM patients WHERE user_id = ?',
    [user.id]
  );
  res.json({ ...user, ...patient });
});

export default router;
