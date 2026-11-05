import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { lockBodyScroll } from '../../lib/scrollLock';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  onPrimarySubmit?: () => void;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string; // ex: 'max-w-lg', 'max-w-2xl', 'max-w-4xl'
  zIndexClass?: string; // ex: 'z-40' ou 'z-50'
  children: React.ReactNode;
}

/**
 * Container padrão para todos os popups e modais do LibertyBag:
 * - Sempre centralizado e enquadrado com respiro nas bordas (tanto em celular quanto em desktop)
 * - Cabeçalho e rodapé fixos (nunca somem no topo nem cortam botões na direita)
 * - Apenas o miolo rola verticalmente se a tela for baixa, com zero barra horizontal (overflow-x-hidden)
 * - Fecha com ESC ou clicando no fundo escuro
 * - Pressionar ENTER em qualquer campo do modal dispara a ação principal (enviar/confirmar)
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  open,
  onClose,
  onPrimarySubmit,
  title,
  subtitle,
  headerRight,
  footer,
  maxWidthClass = 'max-w-xl',
  zIndexClass = 'z-50',
  children
}) => {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trava a rolagem do fundo (body scroll lock) enquanto o modal estiver aberto
  useEffect(() => {
    if (!open) return;
    const unlock = lockBodyScroll();
    return () => unlock();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Garante que apenas o modal do topo responda às teclas
      const allDialogs = document.querySelectorAll('[role="dialog"]');
      const topDialog = allDialogs[allDialogs.length - 1];
      if (topDialog && dialogRef.current && topDialog !== dialogRef.current) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();

        // Se o foco já está num <button> ou <a>, o navegador já ativa nativamente com Enter
        if (tag === 'button' || tag === 'a' || tag === 'textarea') {
          return;
        }

        // Se o input já está dentro de um <form> próprio com botão submit, deixa o form enviar
        if (target?.closest('form')) {
          return;
        }

        if (onPrimarySubmit) {
          e.preventDefault();
          onPrimarySubmit();
          return;
        }

        // Procura o botão principal no rodapé (primary ou danger) ou marcado com data-enter-submit
        const container = dialogRef.current;
        if (!container) return;

        const submitBtn = container.querySelector<HTMLButtonElement>(
          '[data-enter-submit="true"]:not(:disabled), [data-modal-footer] button[data-variant="primary"]:not(:disabled), [data-modal-footer] button[data-variant="danger"]:not(:disabled)'
        );
        if (submitBtn) {
          e.preventDefault();
          submitBtn.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onPrimarySubmit]);

  return (
    <AnimatePresence>
      {open && (
        <div
          ref={dialogRef}
          className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-3 sm:p-5 overflow-hidden overscroll-contain`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Fundo escuro com blur suave que bloqueia toques de rolagem no fundo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
            className="fixed inset-0 bg-blue-deep/70 backdrop-blur-xs overscroll-contain touch-none"
            onClick={onClose}
          />

          {/* Caixa do Modal perfeitamente enquadrada */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={`relative z-10 w-full ${maxWidthClass} max-h-[90vh] flex flex-col bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream rounded-card-lg border-2 border-blue-royal shadow-soft overflow-hidden overscroll-contain`}
          >
            {/* Cabeçalho Fixo Enquadrado e Responsivo no Mobile */}
            <div className="shrink-0 px-3.5 py-3 sm:px-6 sm:py-4 bg-white/90 dark:bg-[#162573]/95 border-b border-blue-sky/60 dark:border-blue-sky/20">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 pr-1">
                  <h2 className="font-serif italic text-[clamp(1.05rem,4vw,1.65rem)] font-bold text-blue-royal dark:text-sun leading-tight tracking-tight">
                    {title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {headerRight}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar janela"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-cream dark:bg-blue-deep border border-blue-sky/80 flex items-center justify-center hover:bg-blue-sky/40 transition-colors shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {subtitle && (
                <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85 mt-1 sm:mt-1.5 leading-snug break-words">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Corpo rolável verticalmente e sem corte horizontal, isolado do fundo */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
              {children}
            </div>

            {/* Rodapé Fixo Opcional */}
            {footer && (
              <div
                data-modal-footer
                className="shrink-0 px-5 py-4 sm:px-6 bg-white/90 dark:bg-[#162573]/95 border-t border-blue-sky/60 dark:border-blue-sky/20"
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
