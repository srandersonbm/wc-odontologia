import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../../api/client';
import type { PatientDashboardData, TreatmentPlan } from '../../api/types';
import { TipsTicker } from '../../components/TipsTicker';
import { ProgressBar } from '../../components/ProgressBar';
import { useAuth } from '../../context/AuthContext';

export function PatientDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);

  useEffect(() => {
    api.get<PatientDashboardData>('/dashboard/me').then(setData);
    api.get<TreatmentPlan[]>('/treatment-plans/me').then(setPlans);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
          Olá, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
          Acompanhe seu tratamento e seus próximos atendimentos.
        </p>
      </div>

      <TipsTicker />

      {data?.nextAppointment ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 flex items-center justify-between"
          style={{ background: 'var(--surface)' }}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--honey-deep)' }}>
              Próximo atendimento
            </p>
            <p className="text-lg font-semibold mt-1" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
              {data.nextAppointment.title}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              {format(new Date(`${data.nextAppointment.date}T00:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
              {data.nextAppointment.startTime ? ` às ${data.nextAppointment.startTime}` : ''} · com{' '}
              {data.nextAppointment.dentistName}
            </p>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'var(--honey-soft)' }}
          >
            🦷
          </div>
        </motion.div>
      ) : (
        <div className="card p-6 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
            Nenhum atendimento agendado no momento.
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
            Meu plano de tratamento
          </h2>
          <Link to="/portal/plans" className="text-sm font-medium" style={{ color: 'var(--honey-deep)' }}>
            Ver detalhes →
          </Link>
        </div>
        {plans.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
              Você ainda não possui um plano de tratamento.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((p) => (
              <div key={p.id} className="card p-5">
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                  {p.title}
                </p>
                <ProgressBar value={p.progress} label={`${p.doneItems} de ${p.totalItems} concluídos`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
