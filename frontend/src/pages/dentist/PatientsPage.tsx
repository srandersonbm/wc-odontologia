import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../../api/client';
import type { Patient } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Field';

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get<Patient[]>('/patients')
      .then(setPatients)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
            Pacientes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Disponíveis para todos os dentistas do consultório.
          </p>
        </div>
        <Button variant="honey" onClick={() => setOpen(true)}>
          + Novo paciente
        </Button>
      </div>

      <Input
        placeholder="Buscar por nome ou e-mail…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="card divide-y" style={{ borderColor: 'var(--line-soft)' }}>
        {loading ? (
          <p className="p-6 text-sm text-center" style={{ color: 'var(--ink-faint)' }}>
            Carregando…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-center" style={{ color: 'var(--ink-faint)' }}>
            Nenhum paciente encontrado.
          </p>
        ) : (
          filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to={`/patients/${p.id}`}
                className="flex items-center justify-between px-5 py-4 transition-colors"
                style={{ color: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-soft)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {p.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                    {p.email}
                    {p.phone ? ` · ${p.phone}` : ''}
                  </p>
                </div>
                <span style={{ color: 'var(--ink-faint)' }}>→</span>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      <NewPatientModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          load();
        }}
      />
    </div>
  );
}

function NewPatientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/patients', { name, email, password, phone: phone || undefined });
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar paciente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo paciente">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nome completo">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="E-mail">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Telefone (opcional)">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
        </Field>
        <Field label="Senha de acesso">
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </Field>
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <Button type="submit" variant="honey" disabled={saving} className="mt-1">
          {saving ? 'Criando…' : 'Criar acesso do paciente'}
        </Button>
      </form>
    </Modal>
  );
}
