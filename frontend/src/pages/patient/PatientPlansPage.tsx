import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { TreatmentPlan } from '../../api/types';
import { ProgressBar } from '../../components/ProgressBar';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Textarea } from '../../components/ui/Field';

export function PatientPlansPage() {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [cancelItem, setCancelItem] = useState<TreatmentPlan['items'][number] | null>(null);

  const load = () => api.get<TreatmentPlan[]>('/treatment-plans/me').then(setPlans);
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
          Meu plano de tratamento
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          Avisos de indisponibilidade só podem ser enviados com 24h de antecedência.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
            Você ainda não possui plano de tratamento cadastrado.
          </p>
        </div>
      ) : (
        plans.map((plan) => (
          <div key={plan.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                  {plan.title}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                  Responsável: {plan.dentistName}
                </p>
              </div>
            </div>
            <ProgressBar value={plan.progress} label={`${plan.doneItems} de ${plan.totalItems} concluídos`} />
            <div className="mt-4 flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
              {plan.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p
                      className="text-sm"
                      style={{
                        color: 'var(--ink)',
                        textDecoration: item.status === 'DONE' ? 'line-through' : 'none',
                        opacity: item.status === 'DONE' ? 0.55 : 1,
                      }}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                      {item.scheduledDate
                        ? `${item.scheduledDate}${item.startTime ? ` às ${item.startTime}` : ''}`
                        : 'aguardando agendamento'}
                    </p>
                  </div>
                  {item.status === 'SCHEDULED' && (
                    <button
                      onClick={() => setCancelItem(item)}
                      className="text-xs px-2.5 py-1.5 rounded-lg shrink-0"
                      style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}
                    >
                      Avisar indisponibilidade
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <CancelNoticeModal item={cancelItem} onClose={() => setCancelItem(null)} onSent={load} />
    </div>
  );
}

function CancelNoticeModal({
  item,
  onClose,
  onSent,
}: {
  item: TreatmentPlan['items'][number] | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (!item) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post(`/plan-items/${item.id}/cancel-notice`, { reason });
      setReason('');
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar aviso.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={!!item} onClose={onClose} title={`Avisar: ${item.title}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Atendimento em {item.scheduledDate} {item.startTime ? `às ${item.startTime}` : ''}. Avisos só são
          aceitos com pelo menos 24 horas de antecedência.
        </p>
        <Field label="Motivo">
          <Textarea required value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <Button type="submit" variant="danger" disabled={sending}>
          {sending ? 'Enviando…' : 'Enviar aviso'}
        </Button>
      </form>
    </Modal>
  );
}
