import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../../api/client';
import type { Patient, ProcedureType, TreatmentPlan } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { ProgressBar } from '../../components/ProgressBar';

export function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [newPlanOpen, setNewPlanOpen] = useState(false);

  const load = () => {
    api.get<Patient>(`/patients/${id}`).then(setPatient);
    api.get<TreatmentPlan[]>(`/treatment-plans?patientId=${id}`).then(setPlans);
    api.get<ProcedureType[]>('/procedure-types').then(setProcedureTypes);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!patient) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/patients" className="text-sm" style={{ color: 'var(--ink-faint)' }}>
          ← Pacientes
        </Link>
        <div className="flex items-center justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
              {patient.name}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              {patient.email}
              {patient.phone ? ` · ${patient.phone}` : ''}
            </p>
          </div>
          <Button variant="honey" onClick={() => setNewPlanOpen(true)}>
            + Plano de tratamento
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
            Este paciente ainda não possui plano de tratamento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} procedureTypes={procedureTypes} onChange={load} />
          ))}
        </div>
      )}

      <NewPlanModal
        open={newPlanOpen}
        patientId={Number(id)}
        onClose={() => setNewPlanOpen(false)}
        onCreated={() => {
          setNewPlanOpen(false);
          load();
        }}
      />
    </div>
  );
}

function PlanCard({
  plan,
  procedureTypes,
  onChange,
}: {
  plan: TreatmentPlan;
  procedureTypes: ProcedureType[];
  onChange: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleItem, setScheduleItem] = useState<TreatmentPlan['items'][number] | null>(null);

  const toggleDone = async (itemId: number, status: string) => {
    await api.patch(`/treatment-plans/items/${itemId}`, {
      status: status === 'DONE' ? 'PENDING' : 'DONE',
    });
    onChange();
  };

  const removeItem = async (itemId: number) => {
    await api.delete(`/treatment-plans/items/${itemId}`);
    onChange();
  };

  return (
    <motion.div layout className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
            {plan.title}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            Responsável: {plan.dentistName}
            {plan.notes ? ` · ${plan.notes}` : ''}
          </p>
        </div>
        <span
          className="badge shrink-0"
          style={{
            background: plan.status === 'ACTIVE' ? 'var(--honey-soft)' : 'var(--line-soft)',
            color: plan.status === 'ACTIVE' ? 'var(--honey-deep)' : 'var(--ink-soft)',
          }}
        >
          {plan.status === 'ACTIVE' ? 'Ativo' : plan.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
        </span>
      </div>

      <ProgressBar value={plan.progress} label={`${plan.doneItems} de ${plan.totalItems} procedimentos`} />

      <div className="mt-4 flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
        {plan.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2.5 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => toggleDone(item.id, item.status)}
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                style={{
                  borderColor: item.status === 'DONE' ? 'var(--honey)' : 'var(--line)',
                  background: item.status === 'DONE' ? 'var(--honey)' : 'transparent',
                  color: '#fff',
                  fontSize: '11px',
                }}
              >
                {item.status === 'DONE' ? '✓' : ''}
              </button>
              <div className="min-w-0">
                <p
                  className="text-sm truncate"
                  style={{
                    color: 'var(--ink)',
                    textDecoration: item.status === 'DONE' ? 'line-through' : 'none',
                    opacity: item.status === 'DONE' ? 0.55 : 1,
                  }}
                >
                  {item.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                  {item.procedureName ? `${item.procedureName} · ` : ''}
                  {item.scheduledDate
                    ? `${item.scheduledDate}${item.startTime ? ` às ${item.startTime}` : ''}`
                    : 'sem data'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setScheduleItem(item)}
                className="text-xs px-2 py-1 rounded-md transition-colors"
                style={{ color: 'var(--ink-soft)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-soft)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Agendar
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="text-xs px-2 py-1 rounded-md transition-colors"
                style={{ color: 'var(--danger)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--danger-soft)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="text-sm mt-3 font-medium"
        style={{ color: 'var(--honey-deep)' }}
      >
        + Adicionar procedimento
      </button>

      <AddItemModal
        open={addOpen}
        planId={plan.id}
        procedureTypes={procedureTypes}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          onChange();
        }}
      />
      <ScheduleItemModal
        item={scheduleItem}
        onClose={() => setScheduleItem(null)}
        onSaved={() => {
          setScheduleItem(null);
          onChange();
        }}
      />
    </motion.div>
  );
}

function NewPlanModal({
  open,
  patientId,
  onClose,
  onCreated,
}: {
  open: boolean;
  patientId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/treatment-plans', { patientId, title, notes: notes || undefined });
      setTitle('');
      setNotes('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar plano.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo plano de tratamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Título">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Tratamento ortodôntico"
          />
        </Field>
        <Field label="Observações (opcional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <Button type="submit" variant="honey" disabled={saving}>
          {saving ? 'Criando…' : 'Criar plano'}
        </Button>
      </form>
    </Modal>
  );
}

function AddItemModal({
  open,
  planId,
  procedureTypes,
  onClose,
  onCreated,
}: {
  open: boolean;
  planId: number;
  procedureTypes: ProcedureType[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [procedureTypeId, setProcedureTypeId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/treatment-plans/${planId}/items`, {
        title,
        procedureTypeId: procedureTypeId ? Number(procedureTypeId) : undefined,
      });
      setTitle('');
      setProcedureTypeId('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao adicionar procedimento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar procedimento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Categoria de procedimento (opcional)">
          <Select value={procedureTypeId} onChange={(e) => setProcedureTypeId(e.target.value)}>
            <option value="">Selecione…</option>
            {procedureTypes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição">
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Limpeza — sessão 1" />
        </Field>
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <Button type="submit" variant="honey" disabled={saving}>
          {saving ? 'Adicionando…' : 'Adicionar'}
        </Button>
      </form>
    </Modal>
  );
}

function ScheduleItemModal({
  item,
  onClose,
  onSaved,
}: {
  item: TreatmentPlan['items'][number] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setDate(item.scheduledDate || '');
      setStartTime(item.startTime || '');
      setEndTime(item.endTime || '');
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/treatment-plans/items/${item.id}`, {
        scheduledDate: date || null,
        startTime: startTime || null,
        endTime: endTime || null,
        status: date ? 'SCHEDULED' : 'PENDING',
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!item} onClose={onClose} title={`Agendar: ${item.title}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Fim">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" variant="honey" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar agendamento'}
        </Button>
      </form>
    </Modal>
  );
}
