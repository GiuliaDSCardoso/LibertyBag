import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from './Button';
import { ModalShell } from './ModalShell';

interface HelpButtonProps {
  title: string;
  explanation: string;
  example: string;
}

/**
 * Botão "? Ajuda" com espaçamento consistente e modal perfeitamente enquadrado via ModalShell.
 */
export const HelpButton: React.FC<HelpButtonProps> = ({ title, explanation, example }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ajuda sobre ${title}`}
        className="w-9 h-9 sm:w-auto min-h-[36px] sm:min-h-[42px] px-0 sm:px-3.5 rounded-full sm:rounded-pill bg-blue-sky/80 dark:bg-[#2339A8] text-blue-deep dark:text-white font-bold inline-flex items-center justify-center gap-1.5 shrink-0 hover:bg-blue-sky transition-colors shadow-xs"
      >
        <HelpCircle size={17} aria-hidden="true" className="shrink-0" />
        <span className="hidden sm:inline text-xs sm:text-sm font-bold">Ajuda</span>
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle="Explicação rápida em linguagem simples"
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        footer={
          <Button fullWidth onClick={() => setOpen(false)}>
            Entendi, obrigado!
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-base leading-relaxed">{explanation}</p>

          <div className="bg-white dark:bg-[#192B85] p-4 rounded-2xl border border-blue-sky/60 dark:border-blue-sky/20">
            <p className="text-sm font-bold text-blue-royal dark:text-sun mb-1">
              Exemplo na prática:
            </p>
            <p className="text-base">{example}</p>
          </div>
        </div>
      </ModalShell>
    </>
  );
};
