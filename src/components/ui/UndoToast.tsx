import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { RotateCcw, CheckCircle2, X } from 'lucide-react';
import { useAppStore } from '../../app/store/useAppStore';

export const UndoToast: React.FC = () => {
  const { undoAction, clearUndoToast } = useAppStore();
  const [isUndoing, setIsUndoing] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!undoAction) return;
    const timer = setTimeout(() => {
      clearUndoToast();
    }, 6500);
    return () => clearTimeout(timer);
  }, [undoAction, clearUndoToast]);

  const handleUndo = async () => {
    if (!undoAction || isUndoing) return;
    setIsUndoing(true);
    try {
      await undoAction.onUndo();
    } finally {
      setIsUndoing(false);
      clearUndoToast();
    }
  };

  return (
    <AnimatePresence>
      {undoAction && (
        <motion.div
          key={undoAction.id}
          role="status"
          aria-live="polite"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-[420px] z-50 bg-blue-deep text-white rounded-pill p-3 pl-4 shadow-soft border-2 border-sun flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.span
              initial={shouldReduceMotion ? {} : { scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className="shrink-0 text-sun"
            >
              <CheckCircle2 size={24} aria-hidden="true" />
            </motion.span>
            <span className="font-bold text-base truncate">{undoAction.message}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={isUndoing}
              className="min-h-[44px] px-4 rounded-pill bg-sun text-blue-deep font-bold text-sm inline-flex items-center gap-2 hover:bg-orange whitespace-nowrap transition-colors"
            >
              <RotateCcw size={16} />
              <span>{isUndoing ? 'Voltando...' : 'Desfazer'}</span>
            </button>
            <button
              type="button"
              onClick={clearUndoToast}
              aria-label="Fechar aviso"
              className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white/85 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
