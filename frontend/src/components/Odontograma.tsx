import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { api } from '../api/client';
import type { ToothNote } from '../api/types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Textarea } from './ui/Field';

const toothSvgModules = import.meta.glob('../assets/teeth/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const TOOTH_SVG_BY_FDI: Record<number, string> = {};
for (const [path, svg] of Object.entries(toothSvgModules)) {
  const match = path.match(/(\d+)\.svg$/);
  if (match) TOOTH_SVG_BY_FDI[Number(match[1])] = svg;
}

const UPPER_ORDER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ORDER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function Odontograma({ patientId }: { patientId: number }) {
  const [notes, setNotes] = useState<ToothNote[]>([]);
  const [activeTooth, setActiveTooth] = useState<number | null>(null);

  const load = () => {
    api.get<ToothNote[]>(`/patients/${patientId}/tooth-notes`).then(setNotes);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const annotated = new Set(notes.map((n) => n.toothFdi));
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="text-left">
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
            Odontograma
          </h2>
          {!open && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              {annotated.size > 0 ? `${annotated.size} dente(s) com observação` : 'Nenhuma observação ainda'}
            </p>
          )}
        </div>
        <span style={{ color: 'var(--ink-faint)', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <>
          <p className="text-sm mt-3 mb-4" style={{ color: 'var(--ink-soft)' }}>
            Clique em um dente para ver ou adicionar observações. Dentes com observações ficam marcados.
          </p>

          <div className="overflow-x-auto">
            <div className="flex flex-col gap-8 py-2" style={{ minWidth: 760 }}>
              <ToothArchRow order={UPPER_ORDER} annotated={annotated} onSelect={setActiveTooth} />
              <ToothArchRow order={LOWER_ORDER} annotated={annotated} onSelect={setActiveTooth} />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-full"
                style={{ width: 10, height: 10, background: 'var(--sky)', opacity: 0.55 }}
              />
              Com observação
            </span>
          </div>
        </>
      )}

      <ToothNotesModal
        open={activeTooth !== null}
        patientId={patientId}
        toothFdi={activeTooth ?? 0}
        notes={notes.filter((n) => n.toothFdi === activeTooth)}
        onClose={() => setActiveTooth(null)}
        onChange={load}
      />
    </div>
  );
}

function ToothArchRow({
  order,
  annotated,
  onSelect,
}: {
  order: number[];
  annotated: Set<number>;
  onSelect: (fdi: number) => void;
}) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(16, 1fr)', gap: 2 }}>
      {order.map((fdi) => (
        <button
          key={fdi}
          type="button"
          onClick={() => onSelect(fdi)}
          title={`Dente ${fdi}${annotated.has(fdi) ? ' — com observação' : ''}`}
          className={clsx('odonto-tooth', annotated.has(fdi) && 'is-annotated')}
          dangerouslySetInnerHTML={{ __html: TOOTH_SVG_BY_FDI[fdi] || '' }}
        />
      ))}
    </div>
  );
}

function ToothNotesModal({
  open,
  patientId,
  toothFdi,
  notes,
  onClose,
  onChange,
}: {
  open: boolean;
  patientId: number;
  toothFdi: number;
  notes: ToothNote[];
  onClose: () => void;
  onChange: () => void;
}) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setText('');
  }, [open, toothFdi]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/tooth-notes`, { toothFdi, note: text.trim() });
      setText('');
      onChange();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (noteId: number) => {
    await api.delete(`/patients/${patientId}/tooth-notes/${noteId}`);
    onChange();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Dente ${toothFdi}`} width={440}>
      {notes.length > 0 && (
        <ul className="flex flex-col divide-y mb-4" style={{ borderColor: 'var(--line-soft)' }}>
          {notes.map((n) => (
            <li key={n.id} className="py-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm" style={{ color: 'var(--ink)' }}>
                  {n.note}
                </p>
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  className="text-xs shrink-0"
                  style={{ color: 'var(--danger)' }}
                >
                  Excluir
                </button>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                {format(new Date(n.createdAt.replace(' ', 'T')), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                {n.dentistName ? ` · ${n.dentistName}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma observação sobre este dente…"
        />
        <Button type="submit" variant="honey" disabled={saving || !text.trim()}>
          {saving ? 'Salvando…' : '+ Adicionar observação'}
        </Button>
      </form>
    </Modal>
  );
}
