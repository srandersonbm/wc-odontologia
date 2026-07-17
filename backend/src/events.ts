import { db } from './db';

export type PatientEventType =
  | 'PATIENT_CREATED'
  | 'PATIENT_UPDATED'
  | 'ANAMNESIS_CREATED'
  | 'ANAMNESIS_UPDATED'
  | 'PLAN_CREATED'
  | 'PLAN_UPDATED'
  | 'PLAN_DELETED'
  | 'PLAN_ITEM_NO_SHOW'
  | 'PLAN_ITEM_RESCHEDULED'
  | 'DOCUMENT_UPLOADED'
  | 'EXTRA_DOCUMENT_UPLOADED'
  | 'DOCUMENT_GENERATED'
  | 'ODONTOGRAMA_UPDATED'
  | 'PERIO_UPDATED';

export interface LogEventParams {
  tenantId: number;
  patientId: number | string;
  type: PatientEventType;
  description: string;
  actorId?: number;
  actorName?: string;
}

export async function logPatientEvent(params: LogEventParams) {
  await db.run(
    `INSERT INTO patient_events (tenant_id, patient_id, type, description, actor_id, actor_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [params.tenantId, params.patientId, params.type, params.description, params.actorId ?? null, params.actorName ?? null]
  );
}

// Para eventos que podem disparar muitas vezes seguidas em uma mesma edição (ex: cada
// clique no periograma), evita poluir o histórico: se já existe um evento do mesmo tipo
// dentro da janela de tempo, apenas atualiza seu horário/autor em vez de criar um novo.
export async function logPatientEventDebounced(params: LogEventParams, windowMinutes = 10) {
  const recent = await db.get<any>(
    `SELECT id FROM patient_events WHERE patient_id = ? AND type = ? AND created_at >= datetime('now', ?)
     ORDER BY created_at DESC LIMIT 1`,
    [params.patientId, params.type, `-${windowMinutes} minutes`]
  );
  if (recent) {
    await db.run(`UPDATE patient_events SET created_at = datetime('now'), actor_id = ?, actor_name = ? WHERE id = ?`, [
      params.actorId ?? null,
      params.actorName ?? null,
      recent.id,
    ]);
  } else {
    await logPatientEvent(params);
  }
}
