import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Logo, BeeMark } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const dentistNav: NavItem[] = [
  { to: '/dashboard', label: 'Início', icon: '⌂' },
  { to: '/patients', label: 'Pacientes', icon: '◍' },
  { to: '/calendar', label: 'Calendário', icon: '▤' },
  { to: '/settings', label: 'Configurações', icon: '⚙' },
];

const patientNav: NavItem[] = [
  { to: '/portal', label: 'Início', icon: '⌂' },
  { to: '/portal/calendar', label: 'Meu calendário', icon: '▤' },
  { to: '/portal/plans', label: 'Meu plano', icon: '◎' },
  { to: '/portal/availability', label: 'Disponibilidade', icon: '✎' },
];

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard' || item.to === '/portal'}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive ? 'shadow-sm' : '',
            ].join(' ')
          }
          style={({ isActive }) => ({
            color: isActive ? 'var(--honey-deep)' : 'var(--ink-soft)',
            background: isActive ? 'var(--honey-soft)' : 'transparent',
          })}
        >
          <span className="text-base w-5 text-center" aria-hidden>
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;
  const items = user.role === 'DENTIST' ? dentistNav : patientNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--paper)' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 shrink-0 border-r px-4 py-6 sticky top-0 h-screen"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <div className="px-2 mb-8">
          <Logo />
        </div>
        <NavLinks items={items} />
        <div className="mt-auto pt-6 border-t" style={{ borderColor: 'var(--line)' }}>
          <div className="px-2 mb-3">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
              {user.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              {user.role === 'DENTIST' ? 'Dentista' : 'Paciente'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost w-full justify-start"
            style={{ fontSize: '0.82rem' }}
          >
            ← Sair
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-16 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
      >
        <Logo size={28} />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg"
        >
          <span className="block w-5 h-0.5 rounded-full" style={{ background: 'var(--ink)' }} />
          <span className="block w-5 h-0.5 rounded-full" style={{ background: 'var(--ink)' }} />
          <span className="block w-5 h-0.5 rounded-full" style={{ background: 'var(--ink)' }} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(43,42,40,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed top-0 left-0 bottom-0 w-72 z-50 md:hidden flex flex-col px-4 py-6"
              style={{ background: 'var(--surface)' }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="flex items-center justify-between mb-8 px-2">
                <Logo size={28} />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xl"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  ×
                </button>
              </div>
              <NavLinks items={items} onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto pt-6 border-t" style={{ borderColor: 'var(--line)' }}>
                <div className="px-2 mb-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {user.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                    {user.role === 'DENTIST' ? 'Dentista' : 'Paciente'}
                  </p>
                </div>
                <button onClick={handleLogout} className="btn btn-ghost w-full justify-start">
                  ← Sair
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 animate-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export { BeeMark };
