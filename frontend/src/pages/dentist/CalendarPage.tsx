import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { Appointment, Dentist, Patient, PendingItem, ProcedureType } from '../../api/types';
import { MonthCalendar } from '../../components/calendar/MonthCalendar';
import type { CalendarEvent } from '../../components/calendar/MonthCalendar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select } from '../../components/ui/Field';

export function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [month, setMonth] = useState(new Date());
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [dentistId, setDentistId] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const pendingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<Dentist[]>('/dentists').then(setDentists);
  }, []);

  const from = format(startOfMonth(month), 'yyyy-MM-dd');
  const to = format(endOfMonth(month), 'yyyy-MM-dd');

  const load = () => {
    const dentistQs = dentistId ? `&dentistId=${dentistId}` : '';
    api.get<Appointment[]>(`/appointments?from=${from}&to=${to}${dentistQs}`).then(setAppointments);
    api
      .get<PendingItem[]>(`/treatment-plans/pending-items${dentistId ? `?dentistId=${dentistId}` : ''}`)
      .then(setPendingItems);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, dentistId]);

  useEffect(() => {
    if (searchParams.get('focus') === 'pending') {
      pendingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pendingItems.length]);

  const events: CalendarEvent[] = useMemo(
    () =>
      appointments.map((a) => ({
        id: a.id,
        date: a.scheduledDate,
        color: a.procedureColor || '#c9a24b',
        label: `${a.patientName} · ${a.title}`,
        time: a.startTime,
        patientId: a.patientId,
        tooltip: {
          title: a.procedureName || a.title,
          time:
            a.startTime && a.endTime
              ? `${a.startTime} – ${a.endTime}`
              : a.startTime
                ? `${a.startTime}`
                : undefined,
          patientName: a.patientName || '',
          dentistName: a.dentistName || '',
        },
      })),
    [appointments]
  );

  const legend = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach((a) => {
      if (a.procedureName) map.set(a.procedureName, a.procedureColor || '#c9a24b');
    });
    return [...map.entries()];
  }, [appointments]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
            Calendário
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Atendimentos agendados dos planos aprovados, por consultório ou por dentista.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dentistId} onChange={(e) => setDentistId(e.target.value)} className="w-48">
            <option value="">Consultório geral</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Button
            variant="honey"
            onClick={() => {
              setPrefillDate(undefined);
              setNewOpen(true);
            }}
          >
            + Novo atendimento
          </Button>
        </div>
      </div>

      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        events={events}
        onDayClick={(dateStr) => {
          setPrefillDate(dateStr);
          setNewOpen(true);
        }}
        onEventClick={(ev) => {
          if (ev.patientId) navigate(`/patients/${ev.patientId}`);
        }}
      />

      {legend.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {legend.map(([name, color]) => (
            <span key={name} className="badge" style={{ background: `${color}22`, color }}>
              ● {name}
            </span>
          ))}
        </div>
      )}

      <div ref={pendingRef} className="card p-5 scroll-mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
            Procedimentos pendentes
          </h2>
          <span className="text-sm" style={{ color: 'var(--ink-faint)' }}>
            {pendingItems.length}
          </span>
        </div>
        {pendingItems.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
            Nenhum procedimento pendente no momento.
          </p>
        ) : (
          <ul className="flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
            {pendingItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => navigate(`/patients/${item.patientId}`)}
                  className="w-full flex items-center justify-between gap-3 py-2.5 text-left transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: item.procedureColor || '#c9a24b' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                        {item.title} <span style={{ color: 'var(--ink-faint)' }}>· {item.patientName}</span>
                      </p>
                      <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                        {item.planTitle} · {item.dentistName}
                        {item.scheduledDate
                          ? ` · agendado para ${item.scheduledDate}${item.startTime ? ` às ${item.startTime}` : ''}`
                          : ' · sem data'}
                      </p>
                    </div>
                  </div>
                  <span
                    className="badge shrink-0"
                    style={{
                      background: item.status === 'SCHEDULED' ? 'var(--honey-soft)' : 'var(--line-soft)',
                      color: item.status === 'SCHEDULED' ? 'var(--honey-deep)' : 'var(--ink-soft)',
                    }}
                  >
                    {item.status === 'SCHEDULED' ? 'Agendado' : 'Pendente'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewAppointmentModal
        open={newOpen}
        dentists={dentists}
        defaultDate={prefillDate}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          setNewOpen(false);
          load();
        }}
      />
    </div>
  );
}

function NewAppointmentModal({
  open,
  dentists,
  defaultDate,
  onClose,
  onCreated,
}: {
  open: boolean;
  dentists: Dentist[];
  defaultDate?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [patientId, setPatientId] = useState('');
  const [dentistId, setDentistId] = useState('');
  const [procedureTypeId, setProcedureTypeId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const endTimeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
      setDentistId(String(user.id));
      setPatientId('');
      setProcedureTypeId('');
      setStartTime('');
      setEndTime('');
      setError('');
      api.get<Patient[]>('/patients').then(setPatients);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate, user]);

  useEffect(() => {
    if (open && dentistId) {
      api.get<ProcedureType[]>(`/procedure-types?dentistId=${dentistId}`).then((types) => {
        setProcedureTypes(types);
        setProcedureTypeId((current) => (types.some((t) => String(t.id) === current) ? current : ''));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dentistId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/appointments', {
        patientId: Number(patientId),
        dentistId: Number(dentistId),
        procedureTypeId: Number(procedureTypeId),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao agendar atendimento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo atendimento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Paciente">
          <Select required value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Selecione…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dentista">
          <Select required value={dentistId} onChange={(e) => setDentistId(e.target.value)}>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Procedimento">
          <Select required value={procedureTypeId} onChange={(e) => setProcedureTypeId(e.target.value)}>
            <option value="">Selecione…</option>
            {procedureTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          {procedureTypes.length === 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
              Esse dentista ainda não tem procedimentos cadastrados em Configurações.
            </p>
          )}
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Data">
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Início">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                // ao completar o horário, já leva o foco pro campo "Fim"
                if (e.target.value) endTimeRef.current?.focus();
              }}
            />
          </Field>
          <Field label="Fim">
            <Input ref={endTimeRef} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <Button type="submit" variant="honey" disabled={saving}>
          {saving ? 'Agendando…' : 'Agendar atendimento'}
        </Button>
      </form>
    </Modal>
  );
}
