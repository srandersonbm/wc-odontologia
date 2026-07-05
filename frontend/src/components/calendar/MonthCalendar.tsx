import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

export interface CalendarEvent {
  id: number | string;
  date: string; // aaaa-MM-dd
  color: string;
  label: string;
  time?: string;
}

export function MonthCalendar({
  month,
  onMonthChange,
  events,
  onDayClick,
  onEventClick,
  markedDates = [],
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  events: CalendarEvent[];
  onDayClick?: (dateStr: string) => void;
  onEventClick?: (ev: CalendarEvent) => void;
  markedDates?: string[];
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDay.get(ev.date) || [];
    list.push(ev);
    eventsByDay.set(ev.date, list);
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold capitalize" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => onMonthChange(subMonths(month, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--ink-soft)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-soft)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ‹
          </button>
          <button
            onClick={() => onMonthChange(new Date())}
            className="px-3 h-8 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--ink-soft)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-soft)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Hoje
          </button>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--ink-soft)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-soft)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium py-2" style={{ color: 'var(--ink-faint)' }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, month);
          const dayEvents = eventsByDay.get(dateStr) || [];
          const marked = markedDates.includes(dateStr);
          const today = isToday(day);

          return (
            <motion.button
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              whileHover={{ scale: onDayClick ? 1.02 : 1 }}
              className="relative min-h-[84px] rounded-xl p-1.5 text-left flex flex-col gap-0.5 transition-colors"
              style={{
                background: marked ? 'var(--danger-soft)' : inMonth ? 'var(--surface)' : 'transparent',
                border: today ? '1.5px solid var(--honey)' : '1px solid var(--line-soft)',
                opacity: inMonth ? 1 : 0.4,
                cursor: onDayClick ? 'pointer' : 'default',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: today ? 'var(--honey-deep)' : 'var(--ink-soft)' }}
              >
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(ev);
                    }}
                    className="text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate"
                    style={{ background: `${ev.color}22`, color: ev.color }}
                    title={ev.label}
                  >
                    {ev.time ? `${ev.time} ` : ''}
                    {ev.label}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                    +{dayEvents.length - 3} mais
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function isSameDayStr(a: Date, dateStr: string) {
  return isSameDay(a, new Date(`${dateStr}T00:00:00`));
}
