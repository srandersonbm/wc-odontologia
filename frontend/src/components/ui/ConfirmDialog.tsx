import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width={420}>
      <p className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>
        {description}
      </p>
      <div className="flex gap-3">
        <Button variant={danger ? 'danger' : 'honey'} onClick={onConfirm} className="flex-1">
          {confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
