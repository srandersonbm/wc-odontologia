import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { Unavailability } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Field';

export function PatientAvailabilityPage() {
  const [items, setItems] = useState<Unavailability[]>([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get<Unavailability[]>('/unavailability/me').then(setItems);
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/unavailability', { date, reason: reason || undefined });
      setDate('');
      setReason('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar indisponibilidade.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await api.delete(`/unavailability/${id}`);
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
          Disponibilidade
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          Avise o consultório sobre dias em que você não pode ser atendido.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 flex flex-wrap items-end gap-3">
        <Field label="Data indisponível">
          <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Motivo (opcional)">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-64"
            rows={1}
          />
        </Field>
        <Button type="submit" variant="honey" disabled={saving}>
          {saving ? 'Salvando…' : 'Registrar'}
        </Button>
        {error && (
          <p className="text-sm w-full" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </form>

      <div className="card divide-y" style={{ borderColor: 'var(--line-soft)' }}>
        {items.length === 0 ? (
          <p className="p-6 text-sm text-center" style={{ color: 'var(--ink-faint)' }}>
            Nenhuma indisponibilidade registrada.
          </p>
        ) : (
          items.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {u.date}
                </p>
                {u.reason && (
                  <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                    {u.reason}
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(u.id)}
                className="text-xs px-2 py-1 rounded-md"
                style={{ color: 'var(--danger)' }}
              >
                Remover
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
