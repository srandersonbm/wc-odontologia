import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api/client';

export function TipsTicker() {
  const [tips, setTips] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api
      .get<Array<{ id: number; text: string }>>('/tips')
      .then((rows) => setTips(rows.map((r) => r.text)))
      .catch(() => setTips([]));
  }, []);

  useEffect(() => {
    if (tips.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % tips.length), 6000);
    return () => clearInterval(id);
  }, [tips]);

  if (tips.length === 0) return null;

  return (
    <div
      className="card px-5 py-3.5 flex items-center gap-3 overflow-hidden"
      style={{ background: 'var(--honey-soft)', borderColor: 'transparent' }}
    >
      <span className="text-lg shrink-0" aria-hidden>
        🦷
      </span>
      <div className="relative flex-1 h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            className="text-sm absolute inset-0 flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ color: 'var(--honey-deep)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {tips[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
