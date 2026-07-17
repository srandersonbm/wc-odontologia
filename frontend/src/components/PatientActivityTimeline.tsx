import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../api/client';
import type { PatientEvent, PatientEventType } from '../api/types';

const typeStyle: Record<PatientEventType, { icon: string; color: string }> = {
  PATIENT_CREATED: { icon: '＋', color: 'var(--sage)' },
  PATIENT_UPDATED: { icon: '✎', color: 'var(--ink-soft)' },
  ANAMNESIS_CREATED: { icon: '📋', color: 'var(--sage)' },
  ANAMNESIS_UPDATED: { icon: '📋', color: 'var(--ink-soft)' },
  PLAN_CREATED: { icon: '🗂', color: 'var(--sage)' },
  PLAN_UPDATED: { icon: '🗂', color: 'var(--ink-soft)' },
  PLAN_DELETED: { icon: '🗂', color: 'var(--danger)' },
  PLAN_ITEM_NO_SHOW: { icon: '⚠', color: 'var(--danger)' },
  PLAN_ITEM_RESCHEDULED: { icon: '↻', color: 'var(--honey-deep)' },
  DOCUMENT_UPLOADED: { icon: '📎', color: 'var(--sage)' },
  EXTRA_DOCUMENT_UPLOADED: { icon: '📎', color: 'var(--ink-soft)' },
  DOCUMENT_GENERATED: { icon: '🖨', color: 'var(--ink-soft)' },
  ODONTOGRAMA_UPDATED: { icon: '🦷', color: 'var(--ink-soft)' },
  PERIO_UPDATED: { icon: '🦷', color: 'var(--ink-soft)' },
};

export function PatientActivityTimeline({ patientId }: { patientId: number }) {
  const [events, setEvents] = useState<PatientEvent[] | null>(null);

  useEffect(() => {
    api.get<PatientEvent[]>(`/patients/${patientId}/events`).then(setEvents);
  }, [patientId]);

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        Histórico de atividades
      </h2>

      {events === null ? (
        <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
          Carregando…
        </p>
      ) : events.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <ul className="flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
          {events.map((ev) => {
            const style = typeStyle[ev.type] || { icon: '•', color: 'var(--ink-soft)' };
            return (
              <li key={ev.id} className="flex items-start gap-3 py-2.5">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs"
                  style={{ background: 'var(--line-soft)', color: style.color }}
                >
                  {style.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>
                    {ev.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                    {format(new Date(ev.createdAt.replace(' ', 'T')), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                    {ev.actorName ? ` · ${ev.actorName}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
