import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      className="card p-5 flex items-start justify-between"
      whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
      transition={{ duration: 0.15 }}
    >
      <div>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          {label}
        </p>
        <p className="text-3xl font-semibold mt-1" style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}>
          {value}
        </p>
        {hint && (
          <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
            {hint}
          </p>
        )}
      </div>
      {icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--honey-soft)', color: 'var(--honey-deep)' }}
        >
          {icon}
        </div>
      )}
    </motion.div>
  );
}
