import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Appointment } from '../../api/types';
import { MonthCalendar } from '../../components/calendar/MonthCalendar';
import type { CalendarEvent } from '../../components/calendar/MonthCalendar';

export function PatientCalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    api.get<Appointment[]>('/appointments/me').then(setAppointments);
  }, []);

  const events: CalendarEvent[] = useMemo(
    () =>
      appointments.map((a) => ({
        id: a.id,
        date: a.scheduledDate,
        color: a.procedureColor || '#c9a24b',
        label: a.title,
        time: a.startTime,
      })),
    [appointments]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
          Meu calendário
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          Apenas os seus atendimentos aparecem aqui.
        </p>
      </div>
      <MonthCalendar month={month} onMonthChange={setMonth} events={events} />
    </div>
  );
}
