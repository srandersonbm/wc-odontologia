import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../../api/client';
import type { Anamnesis, AnamnesisData, Patient, ProcedureType, TreatmentPlan } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { AnamnesisForm } from '../../components/AnamnesisForm';
import { SignedDocuments } from '../../components/SignedDocuments';
import { useAuth } from '../../context/AuthContext';
import {
  formatCents,
  generateAnamnesisPdf,
  generateAtestadoPdf,
  generateTermoPdf,
  generateTreatmentPlanPdf,
} from '../../lib/pdf';

export function PatientDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null | undefined>(undefined);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [anamnesisOpen, setAnamnesisOpen] = useState(false);
  const [atestadoOpen, setAtestadoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = () => {
    api.get<Patient>(`/patients/${id}`).then(setPatient);
    api.get<TreatmentPlan[]>(`/treatment-plans?patientId=${id}`).then(setPlans);
    api.get<ProcedureType[]>('/procedure-types').then(setProcedureTypes);
    api.get<Anamnesis | null>(`/patients/${id}/anamnesis`).then(setAnamnesis);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!patient || !user) return null;

  const handleSaveAnamnesis = async (data: AnamnesisData) => {
    if (anamnesis) {
      await api.patch(`/patients/${id}/anamnesis`, { data });
    } else {
      await api.post(`/patients/${id}/anamnesis`, { data });
    }
    setAnamnesisOpen(false);
    load();
  };

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
              {patient.email || 'sem e-mail'}
              {patient.phone ? ` · ${patient.phone}` : ''}
            </p>
          </div>
          <Button variant="honey" onClick={() => setNewPlanOpen(true)}>
            + Plano de tratamento
          </Button>
        </div>
      </div>

      {/* Dados cadastrais */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
            Dados cadastrais
          </h2>
          <button onClick={() => setEditOpen(true)} className="text-sm font-medium" style={{ color: 'var(--honey-deep)' }}>
            Editar
          </button>
        </div>
        <div className="grid sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
          <InfoField label="RG" value={patient.rg} />
          <InfoField label="CPF" value={patient.cpf} />
          <InfoField label="Data de nascimento" value={patient.birthDate} />
          <InfoField label="Profissão" value={patient.profession} />
          <InfoField label="Estado civil" value={patient.maritalStatus} />
          <InfoField label="Endereço" value={patient.address} />
          <InfoField label="Cidade" value={patient.city} />
          <InfoField label="Estado" value={patient.state} />
        </div>
      </div>

      {/* Anamnese */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
            Anamnese
          </h2>
          {anamnesis ? (
            <div className="flex gap-2">
              <button
                onClick={() => setAnamnesisOpen(true)}
                className="text-sm font-medium"
                style={{ color: 'var(--honey-deep)' }}
              >
                Editar
              </button>
              <button
                onClick={() => generateAnamnesisPdf(patient, user, anamnesis.data)}
                className="text-sm font-medium"
                style={{ color: 'var(--honey-deep)' }}
              >
                Gerar PDF da anamnese
              </button>
            </div>
          ) : (
            anamnesis === null && (
              <Button variant="honey" onClick={() => setAnamnesisOpen(true)}>
                Iniciar anamnese
              </Button>
            )
          )}
        </div>
        {anamnesis ? (
          <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>
            {anamnesis.data.queixaPrincipal || 'Anamnese registrada.'}
          </p>
        ) : (
          anamnesis === null && (
            <p className="text-sm mb-3" style={{ color: 'var(--ink-faint)' }}>
              Nenhuma anamnese iniciada para este paciente ainda.
            </p>
          )
        )}
        <SignedDocuments patientId={patient.id} type="ANAMNESIS" label="Enviar anamnese assinada" />
      </div>

      {/* Documentos */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          Documentos
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Button variant="ghost" onClick={() => generateTermoPdf(patient, user)} className="mb-2">
              Gerar termo de consentimento
            </Button>
            <SignedDocuments patientId={patient.id} type="TERMO" label="Enviar termo assinado" />
          </div>
          <div>
            <Button variant="ghost" onClick={() => setAtestadoOpen(true)} className="mb-2">
              Emitir atestado
            </Button>
            <SignedDocuments patientId={patient.id} type="ATESTADO" label="Enviar atestado assinado" />
          </div>
        </div>
      </div>

      {/* Planos de tratamento */}
      {plans.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
            Este paciente ainda não possui plano de tratamento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              patient={patient}
              procedureTypes={procedureTypes}
              onChange={load}
            />
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

      <Modal
        open={anamnesisOpen}
        onClose={() => setAnamnesisOpen(false)}
        title={anamnesis ? 'Editar anamnese' : 'Iniciar anamnese'}
        width={640}
      >
        <AnamnesisForm initial={anamnesis?.data} onSave={handleSaveAnamnesis} />
      </Modal>

      <AtestadoModal
        open={atestadoOpen}
        onClose={() => setAtestadoOpen(false)}
        onGenerate={(opts) => {
          generateAtestadoPdf(patient, user, opts);
          setAtestadoOpen(false);
        }}
      />

      <EditPatientModal
        open={editOpen}
        patient={patient}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
      />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
        {label}
      </p>
      <p style={{ color: value ? 'var(--ink)' : 'var(--ink-faint)' }}>{value || '—'}</p>
    </div>
  );
}

function EditPatientModal({
  open,
  patient,
  onClose,
  onSaved,
}: {
  open: boolean;
  patient: Patient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(patient);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(patient), [patient]);

  const upd = (key: keyof Patient, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/patients/${patient.id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate,
        rg: form.rg,
        cpf: form.cpf,
        profession: form.profession,
        maritalStatus: form.maritalStatus,
        address: form.address,
        city: form.city,
        state: form.state,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar dados cadastrais" width={560}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => upd('name', e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={form.phone || ''} onChange={(e) => upd('phone', e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input value={form.email || ''} onChange={(e) => upd('email', e.target.value)} />
          </Field>
          <Field label="Data de nascimento">
            <Input type="date" value={form.birthDate || ''} onChange={(e) => upd('birthDate', e.target.value)} />
          </Field>
          <Field label="RG">
            <Input value={form.rg || ''} onChange={(e) => upd('rg', e.target.value)} />
          </Field>
          <Field label="CPF">
            <Input value={form.cpf || ''} onChange={(e) => upd('cpf', e.target.value)} />
          </Field>
          <Field label="Profissão">
            <Input value={form.profession || ''} onChange={(e) => upd('profession', e.target.value)} />
          </Field>
          <Field label="Estado civil">
            <Input value={form.maritalStatus || ''} onChange={(e) => upd('maritalStatus', e.target.value)} />
          </Field>
          <Field label="Cidade">
            <Input value={form.city || ''} onChange={(e) => upd('city', e.target.value)} />
          </Field>
          <Field label="Estado">
            <Input value={form.state || ''} onChange={(e) => upd('state', e.target.value)} />
          </Field>
        </div>
        <Field label="Endereço">
          <Input value={form.address || ''} onChange={(e) => upd('address', e.target.value)} />
        </Field>
        <Button type="submit" variant="honey" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </Modal>
  );
}

function AtestadoModal({
  open,
  onClose,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (opts: {
    finalidade: string;
    date: string;
    startTime: string;
    endTime: string;
    days: string;
    cid: string;
  }) => void;
}) {
  const [finalidade, setFinalidade] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [days, setDays] = useState('');
  const [cid, setCid] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Emitir atestado">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGenerate({ finalidade, date, startTime, endTime, days, cid });
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Finalidade (opcional)">
          <Input value={finalidade} onChange={(e) => setFinalidade(e.target.value)} placeholder="que se destinar" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Das">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Às">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dias de convalescença">
            <Input value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
          <Field label="C.I.D. (opcional)">
            <Input value={cid} onChange={(e) => setCid(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" variant="honey">
          Gerar PDF do atestado
        </Button>
      </form>
    </Modal>
  );
}

function PlanCard({
  plan,
  patient,
  procedureTypes,
  onChange,
}: {
  plan: TreatmentPlan;
  patient: Patient;
  procedureTypes: ProcedureType[];
  onChange: () => void;
}) {
  const { user } = useAuth();
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
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="badge"
            style={{
              background: plan.status === 'ACTIVE' ? 'var(--honey-soft)' : 'var(--line-soft)',
              color: plan.status === 'ACTIVE' ? 'var(--honey-deep)' : 'var(--ink-soft)',
            }}
          >
            {plan.status === 'ACTIVE' ? 'Ativo' : plan.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
          </span>
          {user && (
            <button
              onClick={() => generateTreatmentPlanPdf(patient, user, plan)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
              style={{ color: 'var(--honey-deep)', background: 'var(--honey-soft)' }}
            >
              Gerar PDF do plano
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 text-sm">
        <span style={{ color: 'var(--ink-soft)' }}>{plan.totalItems} procedimento(s)</span>
        <span className="font-semibold" style={{ color: 'var(--ink)' }}>
          Total: {formatCents(plan.totalCents)}
        </span>
      </div>

      <div className="flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
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
                  {formatCents(item.priceCents)}
                  {item.scheduledDate ? ` · ${item.scheduledDate}${item.startTime ? ` às ${item.startTime}` : ''}` : ''}
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

      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--line-soft)' }}>
        <SignedDocuments patientId={patient.id} type="TREATMENT_PLAN" planId={plan.id} label="Enviar plano assinado" />
      </div>

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
  const [price, setPrice] = useState('');
  const [procedureTypeId, setProcedureTypeId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const priceCents = price ? Math.round(Number(price.replace(',', '.')) * 100) : 0;
      await api.post(`/treatment-plans/${planId}/items`, {
        title,
        priceCents,
        procedureTypeId: procedureTypeId ? Number(procedureTypeId) : undefined,
      });
      setTitle('');
      setPrice('');
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
        <Field label="Valor (R$)">
          <Input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0,00"
          />
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
