import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import type { DashboardData, Dentist } from '../../api/types';
import { StatCard } from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { Select } from '../../components/ui/Field';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [dentistId, setDentistId] = useState<string>('');

  useEffect(() => {
    api.get<Dentist[]>('/dentists').then(setDentists).catch(() => {});
  }, []);

  useEffect(() => {
    const qs = dentistId ? `?dentistId=${dentistId}` : '';
    api.get<DashboardData>(`/dashboard${qs}`).then(setData).catch(() => {});
  }, [dentistId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
            Olá, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Aqui está o panorama do consultório hoje.
          </p>
        </div>
        <Select value={dentistId} onChange={(e) => setDentistId(e.target.value)} className="sm:w-56">
          <option value="">Todos os dentistas</option>
          {dentists.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Pacientes cadastrados" value={data.patientCount} icon="◍" to="/patients" />
            <StatCard
              label="Procedimentos pendentes"
              value={data.pendingProcedures}
              icon="◎"
              to="/calendar?focus=pending"
            />
            <StatCard label="Hoje" value={data.todayCount} hint="atendimentos" icon="☀" to="/calendar" />
            <StatCard label="Amanhã" value={data.tomorrowCount} hint="atendimentos" icon="→" to="/calendar" />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
                Próximos 7 dias
              </h2>
              <span className="text-sm" style={{ color: 'var(--ink-faint)' }}>
                {data.weekCount} no total
              </span>
            </div>
            {data.upcoming.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: 'var(--ink-faint)' }}>
                Nenhum atendimento agendado para os próximos dias.
              </p>
            ) : (
              <div className="flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
                {data.upcoming.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                        {item.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                        {item.patientName} · {item.dentistName}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-medium capitalize" style={{ color: 'var(--ink)' }}>
                        {format(new Date(`${item.date}T00:00:00`), "EEE, d 'de' MMM", { locale: ptBR })}
                      </p>
                      {item.startTime && (
                        <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                          {item.startTime}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
