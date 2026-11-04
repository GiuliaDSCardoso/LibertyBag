import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { ModalShell } from './ModalShell';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmação clara e amigável antes de apagar qualquer coisa, enquadrada com ModalShell.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Sim, pode apagar',
  cancelLabel = 'Não, voltar',
  onConfirm,
  onCancel
}) => {
  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      title={title}
      maxWidthClass="max-w-md"
      zIndexClass="z-50"
      footer={
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" fullWidth onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-red-soft/15 text-red-soft flex items-center justify-center shrink-0">
          <AlertTriangle size={26} aria-hidden="true" />
        </div>
        <p className="text-base leading-relaxed">{description}</p>
      </div>
    </ModalShell>
  );
};
