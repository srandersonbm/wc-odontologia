import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Em produção, defina TURSO_DATABASE_URL / TURSO_AUTH_TOKEN para apontar para um
// banco libSQL (Turso) hospedado, garantindo persistência entre deploys. Localmente,
// usa um arquivo SQLite comum — nenhuma conta externa é necessária para desenvolver.
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(dataDir, 'wc-odontologia.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient(authToken ? { url, authToken } : { url });

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

export const db = {
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const res = await client.execute({ sql, args: params });
    return res.rows[0] as any;
  },
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await client.execute({ sql, args: params });
    return res.rows as any;
  },
  async run(sql: string, params: any[] = []): Promise<RunResult> {
    const res = await client.execute({ sql, args: params });
    return { lastInsertRowid: Number(res.lastInsertRowid ?? 0), changes: res.rowsAffected };
  },
};

async function tableExists(table: string): Promise<boolean> {
  const res = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    args: [table],
  });
  return res.rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return res.rows.some((r: any) => r.name === column);
}

async function addColumnIfMissing(table: string, column: string, definition: string) {
  if (!(await columnExists(table, column))) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Migra bancos criados antes da reestruturação (pacientes com login próprio,
// sem separação por consultório/tenant). Pacientes/planos antigos são
// descartados nesse processo — o cadastro de dentistas é preservado.
async function migrateLegacyShape() {
  if ((await tableExists('patients')) && (await columnExists('patients', 'user_id'))) {
    await client.executeMultiple(`
      DROP TABLE IF EXISTS cancel_notices;
      DROP TABLE IF EXISTS patient_unavailability;
      DROP TABLE IF EXISTS plan_items;
      DROP TABLE IF EXISTS treatment_plans;
      DROP TABLE IF EXISTS patients;
    `);
  }
  // O recurso de "ações do consultório" (categorias de tarefa + agenda interna)
  // foi removido — o calendário agora mostra só atendimentos de planos.
  await client.executeMultiple(`
    DROP TABLE IF EXISTS office_tasks;
    DROP TABLE IF EXISTS task_categories;
  `);
}

// SQLite não permite ALTER de uma CHECK constraint existente — para adicionar o
// status NO_SHOW a bancos já criados, a tabela precisa ser recriada e os dados copiados.
async function migratePlanItemsNoShow() {
  if (!(await tableExists('plan_items'))) return;
  const res = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name = 'plan_items'",
    args: [],
  });
  const currentSql = (res.rows[0] as any)?.sql as string | undefined;
  if (!currentSql || currentSql.includes('NO_SHOW')) return;

  await client.executeMultiple(`
    CREATE TABLE plan_items_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
      procedure_type_id INTEGER REFERENCES procedure_types(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SCHEDULED', 'DONE', 'NO_SHOW')),
      scheduled_date TEXT,
      start_time TEXT,
      end_time TEXT,
      notes TEXT,
      price_cents INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO plan_items_new SELECT * FROM plan_items;
    DROP TABLE plan_items;
    ALTER TABLE plan_items_new RENAME TO plan_items;
  `);
}

async function migrateColumnsAndTenants() {
  await addColumnIfMissing('users', 'tenant_id', 'INTEGER');
  await addColumnIfMissing('dentists', 'phone', 'TEXT');
  await addColumnIfMissing('dentists', 'address', 'TEXT');
  await addColumnIfMissing('dentists', 'instagram', 'TEXT');
  await addColumnIfMissing('dentists', 'stamp_name', 'TEXT');
  await addColumnIfMissing('dentists', 'cro_number', 'TEXT');
  await addColumnIfMissing('dentists', 'cro_uf', 'TEXT');
  await addColumnIfMissing('dentists', 'signature_data', 'BLOB');
  await addColumnIfMissing('dentists', 'signature_mime', 'TEXT');
  await addColumnIfMissing('dentists', 'logo_data', 'BLOB');
  await addColumnIfMissing('dentists', 'logo_mime', 'TEXT');
  await addColumnIfMissing('plan_items', 'price_cents', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('treatment_plans', 'completed_at', 'TEXT');

  // Cada dentista sem tenant vira dono do próprio consultório.
  await client.execute("UPDATE users SET tenant_id = id WHERE role = 'DENTIST' AND tenant_id IS NULL");
}

export async function initDb() {
  await client.execute('PRAGMA foreign_keys = ON;');
  await migrateLegacyShape();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await client.executeMultiple(schema);
  await migrateColumnsAndTenants();
  await migratePlanItemsNoShow();
}
