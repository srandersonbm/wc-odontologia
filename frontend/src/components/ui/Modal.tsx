import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="fixed inset-0 -z-10"
            style={{ background: 'rgba(43, 42, 40, 0.35)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
          <motion.div
            className="card relative w-full p-6 my-auto"
            style={{ maxWidth: width, boxShadow: 'var(--shadow-lg)' }}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full w-8 h-8 flex items-center justify-center text-lg transition-colors"
                style={{ color: 'var(--ink-soft)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-soft)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                ×
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
