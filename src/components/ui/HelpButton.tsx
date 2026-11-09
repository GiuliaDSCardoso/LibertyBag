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
        className="w-10 h-10 sm:w-auto min-h-[40px] sm:min-h-[42px] px-0 sm:px-3.5 rounded-full sm:rounded-pill bg-gradient-to-br from-[#FF8833] via-[#FF7518] to-[#E65500] hover:from-[#FFA055] hover:to-[#FF6B00] active:scale-95 text-white font-extrabold inline-flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-[0_3px_12px_rgba(255,117,24,0.35)] hover:shadow-[0_6px_18px_rgba(255,117,24,0.5)] border-2 border-white/70 dark:border-white/30 cursor-pointer"
      >
        <HelpCircle size={18} aria-hidden="true" className="shrink-0 text-white" />
        <span className="hidden sm:inline text-xs sm:text-sm font-bold text-white tracking-wide">Ajuda</span>
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

          <div className="bg-white dark:bg-[#152144] p-4 rounded-2xl border border-blue-sky/60 dark:border-blue-sky/20">
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
