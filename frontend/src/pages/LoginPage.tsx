import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Logo } from '../components/Logo';
import { Field, Input } from '../components/ui/Field';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'DENTIST' ? '/dashboard' : '/portal');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--paper)' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-8">
          <Logo size={44} />
        </div>
        <div className="card p-7">
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
            Bem-vindo de volta
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>
            Entre com sua conta para continuar.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="E-mail">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}
            <Button type="submit" variant="honey" disabled={loading} className="w-full mt-1">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
        <p className="text-center text-sm mt-5" style={{ color: 'var(--ink-soft)' }}>
          É dentista e ainda não tem conta?{' '}
          <Link to="/registrar" className="font-medium" style={{ color: 'var(--honey-deep)' }}>
            Cadastre seu consultório
          </Link>
        </p>
        <p className="text-center text-xs mt-3" style={{ color: 'var(--ink-faint)' }}>
          Pacientes: peça ao seu dentista para criar seu acesso.
        </p>
      </motion.div>
    </div>
  );
}
