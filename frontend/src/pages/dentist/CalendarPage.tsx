import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { api, ApiError } from '../../api/client';
import type { Appointment, CancelNotice, Dentist, OfficeTask, TaskCategory, Unavailability } from '../../api/types';
import { MonthCalendar } from '../../components/calendar/MonthCalendar';
import type { CalendarEvent } from '../../components/calendar/MonthCalendar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';

export function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [dentistId, setDentistId] = useState('');
  const [tasks, setTasks] = useState<OfficeTask[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [cancelNotices, setCancelNotices] = useState<CancelNotice[]>([]);
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);

  useEffect(() => {
    api.get<Dentist[]>('/dentists').then(setDentists);
    api.get<TaskCategory[]>('/task-categories').then(setCategories);
  }, []);

  const from = format(startOfMonth(month), 'yyyy-MM-dd');
  const to = format(endOfMonth(month), 'yyyy-MM-dd');

  const load = () => {
    const dentistQs = dentistId ? `&dentistId=${dentistId}` : '';
    api.get<OfficeTask[]>(`/office-tasks?from=${from}&to=${to}${dentistQs}`).then(setTasks);
    api.get<Appointment[]>(`/appointments?from=${from}&to=${to}${dentistQs}`).then(setAppointments);
    api.get<Unavailability[]>(`/unavailability?from=${from}&to=${to}`).then(setUnavailability);
    api.get<CancelNotice[]>('/plan-items/cancel-notices').then(setCancelNotices);
  };

  useEffect(() => {
    load();
  }, [month, dentistId]);

  const events: CalendarEvent[] = useMemo(() => {
    const taskEvents: CalendarEvent[] = tasks.map((t) => ({
      id: `task-${t.id}`,
      date: t.date,
      color: t.categoryColor,
      label: t.dentistId ? `${t.title}` : `${t.title} · geral`,
      time: t.startTime || undefined,
    }));
    const apptEvents: CalendarEvent[] = appointments.map((a) => ({
      id: `appt-${a.id}`,
      date: a.scheduledDate,
      color: a.procedureColor || '#c9a24b',
      label: `${a.patientName} · ${a.title}`,
      time: a.startTime,
    }));
    return [...taskEvents, ...apptEvents];
  }, [tasks, appointments]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
            Calendário
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Consultório geral e agenda de cada dentista, lado a lado.
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
              setNewTaskOpen(true);
            }}
          >
            + Nova ação
          </Button>
        </div>
      </div>

      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        events={events}
        onDayClick={(dateStr) => {
          setPrefillDate(dateStr);
          setNewTaskOpen(true);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c.id} className="badge" style={{ background: `${c.color}22`, color: c.color }}>
            ● {c.name}
          </span>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>
            Avisos de indisponibilidade
          </h2>
          {cancelNotices.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
              Nenhum aviso recente.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {cancelNotices.slice(0, 6).map((n) => (
                <li key={n.id} className="text-sm">
                  <p style={{ color: 'var(--ink)' }}>
                    <strong>{n.patientName}</strong> não poderá comparecer em{' '}
                    <strong>{n.scheduledDate}</strong> ({n.itemTitle})
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                    {n.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>
            Indisponibilidade de pacientes este mês
          </h2>
          {unavailability.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
              Nenhum registro para o período.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {unavailability.map((u) => (
                <li key={u.id} className="text-sm flex justify-between">
                  <span style={{ color: 'var(--ink)' }}>{u.patientName}</span>
                  <span style={{ color: 'var(--ink-faint)' }}>{u.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NewTaskModal
        open={newTaskOpen}
        categories={categories}
        dentists={dentists}
        defaultDate={prefillDate}
        onClose={() => setNewTaskOpen(false)}
        onCreated={() => {
          setNewTaskOpen(false);
          load();
        }}
      />
    </div>
  );
}

function NewTaskModal({
  open,
  categories,
  dentists,
  defaultDate,
  onClose,
  onCreated,
}: {
  open: boolean;
  categories: TaskCategory[];
  dentists: Dentist[];
  defaultDate?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dentistId, setDentistId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
      if (categories[0]) setCategoryId(String(categories[0].id));
    }
  }, [open, defaultDate, categories]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/office-tasks', {
        title,
        categoryId: Number(categoryId),
        dentistId: dentistId ? Number(dentistId) : null,
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: description || undefined,
      });
      setTitle('');
      setDescription('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar ação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova ação do consultório">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Título">
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Mentoria com alunos" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dentista (opcional)">
            <Select value={dentistId} onChange={(e) => setDentistId(e.target.value)}>
              <option value="">Consultório geral</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Data">
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Início">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Fim">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Descrição (opcional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <Button type="submit" variant="honey" disabled={saving}>
          {saving ? 'Criando…' : 'Criar ação'}
        </Button>
      </form>
    </Modal>
  );
}
