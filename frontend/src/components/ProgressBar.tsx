import { motion } from 'framer-motion';

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {label}
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--honey-deep)' }}>
            {clamped}%
          </span>
        </div>
      )}
      <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: 'var(--line-soft)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--honey), var(--honey-deep))' }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
