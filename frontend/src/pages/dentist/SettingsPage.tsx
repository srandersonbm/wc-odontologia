import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { Dentist, ProcedureType } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';

const swatches = ['#c9a24b', '#8a9a86', '#a68a6a', '#6a8a9a', '#9a7a8a', '#b8564a'];

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
          Configurações
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          Personalize procedimentos e a equipe do consultório.
        </p>
      </div>
      <ProfileSection />
      <ProcedureTypesSection />
      <DentistsSection />
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {swatches.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="w-7 h-7 rounded-full transition-transform"
          style={{
            background: s,
            transform: value === s ? 'scale(1.15)' : 'scale(1)',
            outline: value === s ? `2px solid ${s}` : 'none',
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  );
}

function ProfileSection() {
  const { user, refresh } = useAuth();
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [instagram, setInstagram] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setSpecialty(user.specialty || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setInstagram(user.instagram || '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      await api.patch('/auth/me', { specialty, phone, address, instagram });
      await refresh();
      setSuccess('Dados salvos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-5">
      <h2 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
        Meu perfil e dados do consultório
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        Usados no cabeçalho dos documentos gerados (plano de tratamento, anamnese, termo e atestado).
      </p>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
        <Field label="Especialidade">
          <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ex: Clínico Geral" />
        </Field>
        <Field label="Telefone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(99) 99999-9999" />
        </Field>
        <Field label="Endereço do consultório">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Instagram">
          <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="usuario" />
        </Field>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" variant="honey" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          {success && <span className="text-sm" style={{ color: 'var(--sage)' }}>{success}</span>}
        </div>
      </form>
    </section>
  );
}

function ProcedureTypesSection() {
  const [items, setItems] = useState<ProcedureType[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(swatches[0]);
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(swatches[0]);
  const [editDuration, setEditDuration] = useState(30);

  const load = () => api.get<ProcedureType[]>('/procedure-types').then(setItems);
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/procedure-types', { name, color, defaultDurationMin: duration });
      setName('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar procedimento.');
    }
  };

  const remove = async (id: number) => {
    await api.delete(`/procedure-types/${id}`);
    load();
  };

  const startEdit = (p: ProcedureType) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.color);
    setEditDuration(p.defaultDurationMin);
  };

  const saveEdit = async (id: number) => {
    await api.patch(`/procedure-types/${id}`, {
      name: editName,
      color: editColor,
      defaultDurationMin: editDuration,
    });
    setEditingId(null);
    load();
  };

  return (
    <section className="card p-5">
      <h2 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
        Meus procedimentos
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        Categorias de tratamento próprias, usadas ao montar planos (limpeza, canal, facetas…).
      </p>
      <ul className="flex flex-col divide-y mb-5" style={{ borderColor: 'var(--line-soft)' }}>
        {items.map((p) =>
          editingId === p.id ? (
            <li key={p.id} className="py-3">
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Nome">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-48" />
                </Field>
                <Field label="Duração (min)">
                  <Input
                    type="number"
                    min={5}
                    step={5}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-28"
                  />
                </Field>
                <Field label="Cor">
                  <ColorPicker value={editColor} onChange={setEditColor} />
                </Field>
                <Button variant="honey" onClick={() => saveEdit(p.id)}>
                  Salvar
                </Button>
                <Button variant="ghost" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
              </div>
            </li>
          ) : (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                  {p.name} <span style={{ color: 'var(--ink-faint)' }}>· {p.defaultDurationMin}min</span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startEdit(p)}
                  className="text-xs px-2 py-1 rounded-md transition-colors"
                  style={{ color: 'var(--ink-soft)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="text-xs px-2 py-1 rounded-md transition-colors"
                  style={{ color: 'var(--danger)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--danger-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Excluir
                </button>
              </div>
            </li>
          )
        )}
        {items.length === 0 && (
          <p className="text-sm py-2" style={{ color: 'var(--ink-faint)' }}>
            Nenhum procedimento cadastrado ainda.
          </p>
        )}
      </ul>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <Field label="Nome">
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Canal" className="w-48" />
        </Field>
        <Field label="Duração (min)">
          <Input
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-28"
          />
        </Field>
        <Field label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        <Button type="submit" variant="honey">
          Adicionar
        </Button>
      </form>
      {error && (
        <p className="text-sm mt-2" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </section>
  );
}

function DentistsSection() {
  const [items, setItems] = useState<Dentist[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => api.get<Dentist[]>('/dentists').then(setItems);
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/register-dentist-internal', { name, email, password, specialty: specialty || undefined });
      setName('');
      setEmail('');
      setPassword('');
      setSpecialty('');
      setSuccess('Dentista cadastrado com sucesso.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cadastrar dentista.');
    }
  };

  return (
    <section className="card p-5">
      <h2 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>
        Dentistas do consultório
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        Cada dentista tem seus próprios procedimentos; os pacientes são compartilhados.
      </p>
      <ul className="flex flex-col divide-y mb-5" style={{ borderColor: 'var(--line-soft)' }}>
        {items.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {d.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                {d.email} {d.specialty ? `· ${d.specialty}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
        <Field label="Nome">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Especialidade (opcional)">
          <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        </Field>
        <Field label="E-mail">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha">
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" variant="honey">
            Cadastrar dentista
          </Button>
          {error && <span className="text-sm" style={{ color: 'var(--danger)' }}>{error}</span>}
          {success && <span className="text-sm" style={{ color: 'var(--sage)' }}>{success}</span>}
        </div>
      </form>
    </section>
  );
}
