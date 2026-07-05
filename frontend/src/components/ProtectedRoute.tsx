import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../api/types';
import { BeeMark } from './Logo';

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <BeeMark size={40} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'DENTIST' ? '/dashboard' : '/portal'} replace />;
  }

  return <>{children}</>;
}
