import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Check, X, Sparkles, Lightbulb } from 'lucide-react';
import { useAssistantStore } from './useAssistantStore';
import { TUTORIAL_STEPS } from './tutorialSteps';
import { LibertySunMascot } from '../../components/mascot/LibertySunMascot';

export const TutorialOverlay: React.FC = () => {
  const {
    isTutorialActive,
    currentStepIndex,
    isCelebrating,
    nextStep,
    prevStep,
    skipTutorial,
    finishTutorial
  } = useAssistantStore();

  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Se o passo atual pertence a outra rota ou aba, navega até ela
  useEffect(() => {
    if (!isTutorialActive) return;
    const currentPath = location.pathname + location.search;
    if (step && currentPath !== step.route) {
      navigate(step.route);
    }
  }, [isTutorialActive, step, location.pathname, location.search, navigate]);

  // Procura o elemento de spotlight na página
  useEffect(() => {
    if (!isTutorialActive || !step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(step.targetSelector!);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          return;
        }
      }
      setTargetRect(null);
    };

    const timeout = setTimeout(updateRect, 100);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [isTutorialActive, step]);

  if (!isTutorialActive && !isCelebrating) return null;

  return (
    <div
      role="dialog"
      aria-label="Tutorial interativo LibertyBag"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden pointer-events-none"
    >
      {/* 1. Backdrop suave e translúcido (mantém a tela completamente visível e nítida) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
        className="absolute inset-0 bg-[#0A1640]/10 dark:bg-black/25 pointer-events-auto"
        onClick={skipTutorial}
      />

      {/* 2. Destaque (Spotlight) com anel dourado sutil */}
      {targetRect && (
        <motion.div
          layoutId="tutorial-spotlight"
          initial={false}
          animate={{
            top: Math.max(4, targetRect.top - 6),
            left: Math.max(4, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute pointer-events-none rounded-2xl ring-4 ring-sun shadow-[0_0_20px_rgba(255,183,3,0.7)] z-10"
        />
      )}

      {/* 3. Caixa do Tutorial: compacta e bem posicionada sem cobrir o foco */}
      <div className="fixed bottom-2 inset-x-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-md w-auto z-20 pointer-events-auto">
        <AnimatePresence mode="wait">
          {isCelebrating ? (
            <motion.div
              key="celebration-card"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 15 }}
              className="bg-cream dark:bg-blue-deep border-2 border-sun rounded-2xl p-4 sm:p-5 shadow-soft text-center space-y-3"
            >
              <div className="flex justify-center -mt-10 mb-1">
                <LibertySunMascot state="celebrating" size={105} />
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-sun/20 text-blue-deep dark:text-sun font-bold text-xs">
                <Sparkles size={14} />
                <span>Tour Concluído</span>
              </div>

              <h3 className="font-serif italic text-lg sm:text-xl font-bold text-blue-royal dark:text-sun">
                Parabéns! Você está pronto! 🎉
              </h3>

              <p className="text-xs sm:text-sm text-blue-deep/90 dark:text-cream/90 leading-relaxed">
                Agora o controle financeiro está com você. Se tiver dúvidas, toque no Solzinho no cantinho da tela.
              </p>

              <button
                type="button"
                onClick={skipTutorial}
                className="w-full min-h-[42px] rounded-pill bg-blue-royal hover:bg-blue-deep active:scale-95 text-white font-bold text-sm shadow-soft transition-all"
              >
                Começar
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`step-${step.id}`}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-cream dark:bg-blue-deep border-2 border-blue-royal/50 dark:border-sun/40 rounded-2xl shadow-soft overflow-hidden flex flex-col"
            >
              {/* Barra superior compacta */}
              <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/95 dark:bg-[#152144]/95 border-b border-blue-sky/60 dark:border-blue-sky/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-pill bg-blue-royal text-white font-bold text-[11px] sm:text-xs shrink-0">
                    {step.stepNumber}/{TUTORIAL_STEPS.length}
                  </span>
                  <span className="text-xs font-bold text-blue-deep dark:text-cream truncate">
                    {step.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={skipTutorial}
                  aria-label="Pular tutorial"
                  className="p-1 rounded-lg text-blue-deep/70 dark:text-cream/70 hover:text-red-soft hover:bg-cream dark:hover:bg-blue-deep transition-colors text-xs font-bold inline-flex items-center gap-0.5 shrink-0"
                >
                  <span className="hidden sm:inline">Pular</span>
                  <X size={16} />
                </button>
              </div>

              {/* Corpo compacto com Mascote e Texto conciso */}
              <div className="p-3 sm:p-4 space-y-2.5">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="shrink-0 -mt-1">
                    <LibertySunMascot state={step.mascotState} size={50} />
                  </div>

                  <div className="flex-1 min-w-0 bg-white dark:bg-[#152144] p-2.5 sm:p-3 rounded-xl border border-blue-royal/20 shadow-xs">
                    <h4 className="font-serif italic text-xs sm:text-sm font-bold text-blue-royal dark:text-sun mb-0.5 leading-tight">
                      {step.balloonTitle}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-blue-deep/90 dark:text-cream/90 leading-snug">
                      {step.explanation}
                    </p>
                  </div>
                </div>

                {/* Dica de ouro de 1 linha */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-sun/15 border border-sun/40 text-blue-deep dark:text-cream text-[11px] sm:text-xs leading-tight flex items-start gap-1.5">
                  <Lightbulb size={15} className="text-orange shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{step.practicalTip}</span>
                </div>
              </div>

              {/* Rodapé com botões de 1 palavra e ícones */}
              <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/95 dark:bg-[#152144]/95 border-t border-blue-sky/60 dark:border-blue-sky/20 flex items-center justify-between gap-2">
                {/* Indicadores de bolinha */}
                <div className="flex items-center gap-1">
                  {TUTORIAL_STEPS.map((s, idx) => (
                    <div
                      key={s.id}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentStepIndex
                          ? 'w-4 bg-blue-royal dark:bg-sun'
                          : 'w-1.5 bg-blue-sky/70 dark:bg-white/20'
                      }`}
                    />
                  ))}
                </div>

                {/* Ações com textos curtos de 1 palavra */}
                <div className="flex items-center gap-1.5">
                  {!isFirstStep && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3 rounded-pill bg-cream dark:bg-blue-deep border border-blue-sky text-blue-deep dark:text-white font-bold text-xs inline-flex items-center gap-1 hover:bg-blue-sky/40 transition-colors"
                    >
                      <ChevronLeft size={15} />
                      <span>Voltar</span>
                    </button>
                  )}

                  {isLastStep ? (
                    <button
                      type="button"
                      onClick={finishTutorial}
                      className="min-h-[34px] sm:min-h-[38px] px-3.5 sm:px-4 rounded-pill bg-blue-royal text-white font-bold text-xs inline-flex items-center gap-1 shadow-soft hover:bg-blue-deep active:scale-95 transition-all"
                    >
                      <Check size={15} />
                      <span>Concluir</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="min-h-[34px] sm:min-h-[38px] px-3.5 sm:px-4 rounded-pill bg-blue-royal text-white font-bold text-xs inline-flex items-center gap-1 shadow-soft hover:bg-blue-deep active:scale-95 transition-all"
                    >
                      <span>Avançar</span>
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
