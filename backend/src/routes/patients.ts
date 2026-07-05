import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const createPatientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
});

// Somente dentista: pacientes não podem se autocadastrar.
router.post('/', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { name, email, password, phone, birthDate } = parsed.data;

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(
    'INSERT INTO users (role, name, email, password_hash) VALUES (?, ?, ?, ?)',
    ['PATIENT', name, email, hash]
  );
  await db.run(
    'INSERT INTO patients (user_id, phone, birth_date, created_by_dentist_id) VALUES (?, ?, ?, ?)',
    [info.lastInsertRowid, phone || null, birthDate || null, req.user!.id]
  );

  res.status(201).json({ id: info.lastInsertRowid, name, email, phone, birthDate });
});

// Compartilhado por todo o consultório — qualquer dentista vê todos os pacientes.
router.get('/', requireAuth, requireRole('DENTIST'), async (_req, res) => {
  const rows = await db.all(
    `SELECT u.id, u.name, u.email, p.phone, p.birth_date as birthDate, p.created_at as createdAt
     FROM users u JOIN patients p ON p.user_id = u.id
     ORDER BY u.name COLLATE NOCASE`
  );
  res.json(rows);
});

router.get('/:id', requireAuth, requireRole('DENTIST'), async (req, res) => {
  const patient = await db.get(
    `SELECT u.id, u.name, u.email, p.phone, p.birth_date as birthDate, p.created_at as createdAt
     FROM users u JOIN patients p ON p.user_id = u.id WHERE u.id = ?`,
    [req.params.id]
  );
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });
  res.json(patient);
});

export default router;
