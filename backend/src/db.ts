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

export async function initDb() {
  await client.execute('PRAGMA foreign_keys = ON;');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await client.executeMultiple(schema);
}
