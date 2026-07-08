-- WC Odontologia — schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL DEFAULT 'DENTIST',
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tenant_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dentists (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  specialty TEXT,
  color TEXT NOT NULL DEFAULT '#c9a24b',
  phone TEXT,
  address TEXT,
  instagram TEXT,
  stamp_name TEXT,
  cro_number TEXT,
  cro_uf TEXT,
  signature_data BLOB,
  signature_mime TEXT
);

-- Pacientes são cadastros do consultório (tenant), sem login no sistema.
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  created_by_dentist_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date TEXT,
  rg TEXT,
  cpf TEXT,
  profession TEXT,
  marital_status TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anamnesis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS procedure_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dentist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#c9a24b',
  default_duration_min INTEGER NOT NULL DEFAULT 30,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS treatment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dentist_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  procedure_type_id INTEGER REFERENCES procedure_types(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SCHEDULED', 'DONE')),
  scheduled_date TEXT,
  start_time TEXT,
  end_time TEXT,
  notes TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS oral_health_tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL
);

-- Cópias assinadas (PDF) enviadas pelo dentista: anamnese, plano de tratamento,
-- termo de consentimento ou atestado.
CREATE TABLE IF NOT EXISTS signed_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES treatment_plans(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ANAMNESIS', 'TREATMENT_PLAN', 'TERMO', 'ATESTADO')),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  data BLOB NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
