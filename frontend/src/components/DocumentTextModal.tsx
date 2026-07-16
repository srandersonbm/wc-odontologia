import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Textarea } from './ui/Field';

export function DocumentTextModal({
  open,
  title,
  defaultText,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  defaultText: string;
  onClose: () => void;
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState(defaultText);

  useEffect(() => {
    if (open) setText(defaultText);
  }, [open, defaultText]);

  return (
    <Modal open={open} onClose={onClose} title={title} width={640}>
      <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>
        Revise e edite o texto do documento antes de gerar o PDF. Os dados do paciente (nome, CPF, endereço etc.)
        já são incluídos automaticamente e não precisam ser repetidos aqui.
      </p>
      <Textarea
        rows={16}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ fontSize: '0.82rem', lineHeight: 1.5 }}
      />
      <div className="flex gap-3 mt-4">
        <Button variant="honey" onClick={() => onConfirm(text)} className="flex-1">
          Gerar PDF
        </Button>
        <Button variant="ghost" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
