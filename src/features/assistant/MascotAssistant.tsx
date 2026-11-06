import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Compass,
  Lightbulb,
  Sparkles,
  X,
  EyeOff,
  Sun,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { useAssistantStore } from './useAssistantStore';
import { getContextualHelp } from './contextualHelp';
import {
  TUTORIAL_STEP_SIMULATION_INDEX,
  TUTORIAL_STEP_INVESTMENTS_INDEX
} from './tutorialSteps';
import { LibertySunMascot } from '../../components/mascot/LibertySunMascot';

export const MascotAssistant: React.FC = () => {
  const {
    isOpen,
    isTutorialActive,
    isCelebrating,
    mascotState,
    hasSeenGreeting,
    isMascotVisible,
    openAssistant,
    closeAssistant,
    toggleAssistant,
    dismissGreeting,
    startTutorial,
    setMascotVisible
  } = useAssistantStore();

  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  // Se o tour guiado ou tela de celebração estiver ativo, o MascotAssistant se esconde para dar espaço ao tour
  if (isTutorialActive || isCelebrating) return null;

  // Se o usuário minimizou o mascote, mostra apenas uma pílula sutil no cantinho
  if (!isMascotVisible) {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-30">
        <button
          type="button"
          onClick={() => {
            setMascotVisible(true);
            openAssistant();
          }}
          aria-label="Abrir assistente virtual LibertyBag"
          className="h-10 px-3 rounded-pill bg-sun text-blue-deep font-bold text-xs shadow-soft border-2 border-orange flex items-center gap-1.5 hover-lift transition-all"
        >
          <Sun size={18} className="animate-spin-slow" />
          <span className="hidden sm:inline">Assistente</span>
        </button>
      </div>
    );
  }

  const help = getContextualHelp(location.pathname, location.search);
  const isSimulationTab =
    location.search.includes('tab=simulador') || location.pathname.startsWith('/simulador');
  const isInvestmentsTab =
    location.search.includes('tab=investimentos') || location.pathname.startsWith('/investimentos');

  return (
    <div className="fixed bottom-20 md:bottom-6 right-2 sm:right-6 z-30 select-none pointer-events-none">
      <div className="relative pointer-events-auto flex flex-col items-end">
        {/* 1. BALÃO DA PRIMEIRA VISITA (Onboarding Inicial) */}
        <AnimatePresence>
          {!hasSeenGreeting && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="mb-2 w-[calc(100vw-24px)] max-w-sm sm:max-w-md max-h-[75vh] overflow-y-auto bg-white dark:bg-[#152144] border-2 border-sun rounded-card-lg p-3.5 sm:p-5 shadow-soft text-left relative"
            >
              {/* Ponta do balão apontando para o mascote embaixo */}
              <div className="absolute -bottom-2.5 right-12 w-4 h-4 bg-white dark:bg-[#152144] border-r-2 border-b-2 border-sun rotate-45" />

              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-sun/20 text-blue-deep dark:text-sun text-xs font-bold">
                  <Sparkles size={14} />
                  <span>Assistente LibertyBag</span>
                </div>

                <button
                  type="button"
                  onClick={dismissGreeting}
                  aria-label="Fechar saudação"
                  className="w-7 h-7 rounded-full bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream flex items-center justify-center hover:bg-blue-sky/40 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <h3 className="font-serif italic text-base sm:text-lg font-bold text-blue-royal dark:text-sun mb-1.5">
                Olá! Que bom ter você por aqui! 😊
              </h3>

              <p className="text-xs sm:text-sm text-blue-deep/90 dark:text-cream/90 leading-relaxed mb-3">
                Eu sou seu assistente do LibertyBag e estou aqui para ajudar você a organizar sua vida financeira com calma e sem complicação.
              </p>

              <div className="p-2.5 rounded-xl bg-sun/15 border border-sun/30 space-y-1 mb-3 text-xs text-blue-deep dark:text-cream">
                <p className="font-bold text-blue-royal dark:text-sun flex items-center gap-1.5">
                  <Sparkles size={13} className="text-orange shrink-0" />
                  <span>Novidades no LibertyBag:</span>
                </p>
                <p className="text-[11px] leading-snug">
                  Agora você tem o <strong>Simulador de Parcelas (Pix/Crédito)</strong> e a <strong>Simulação de Investimentos & Metas</strong>!
                </p>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-blue-deep dark:text-white mb-4">
                É sua primeira vez por aqui? Quer que eu mostre como tudo funciona?
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startTutorial(0)}
                  className="flex-1 min-h-[38px] px-3.5 rounded-pill bg-blue-royal hover:bg-blue-deep active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-soft transition-all"
                >
                  <Compass size={15} />
                  <span>Ver tour</span>
                </button>

                <button
                  type="button"
                  onClick={dismissGreeting}
                  className="min-h-[38px] px-3.5 rounded-pill bg-cream dark:bg-blue-deep border border-blue-sky hover:bg-blue-sky/30 text-blue-deep dark:text-cream font-bold text-xs sm:text-sm transition-all"
                >
                  <span>Depois</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. BALÃO DE AJUDA CONTEXTUAL (Aberto ao tocar no mascote) */}
        <AnimatePresence>
          {isOpen && hasSeenGreeting && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="mb-2 w-[calc(100vw-24px)] max-w-sm sm:max-w-md max-h-[75vh] overflow-y-auto bg-white dark:bg-[#152144] border-2 border-blue-royal/40 dark:border-sun/50 rounded-card-lg p-3.5 sm:p-5 shadow-soft text-left relative"
            >
              {/* Ponta do balão apontando para o mascote embaixo */}
              <div className="absolute -bottom-2.5 right-12 w-4 h-4 bg-white dark:bg-[#152144] border-r-2 border-b-2 border-blue-royal/40 dark:border-sun/50 rotate-45" />

              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-pill bg-blue-royal/10 dark:bg-white/10 text-blue-royal dark:text-sun text-xs font-bold">
                  {help.badge}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMascotVisible(false)}
                    title="Minimizar mascote"
                    aria-label="Minimizar mascote"
                    className="p-1 text-blue-deep/60 dark:text-cream/60 hover:text-blue-royal dark:hover:text-sun transition-colors"
                  >
                    <EyeOff size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={closeAssistant}
                    aria-label="Fechar ajuda"
                    className="w-7 h-7 rounded-full bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream flex items-center justify-center hover:bg-blue-sky/40 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <h3 className="font-serif italic text-base sm:text-lg font-bold text-blue-royal dark:text-sun mb-1">
                {help.title}
              </h3>

              <p className="text-xs sm:text-sm text-blue-deep/90 dark:text-cream/90 leading-relaxed mb-3">
                {help.summary}
              </p>

              {/* Bloco de Educação Financeira / Conceito */}
              <div className="p-3 rounded-2xl bg-cream dark:bg-blue-deep border border-blue-sky/60 space-y-1 mb-3">
                <p className="text-xs font-bold text-blue-royal dark:text-sun">
                  {help.conceptTitle}
                </p>
                <p className="text-xs text-blue-deep/80 dark:text-cream/80 leading-relaxed">
                  {help.conceptText}
                </p>
              </div>

              {/* Dica do dia */}
              <div className="flex items-start gap-2 text-xs text-blue-deep/80 dark:text-cream/80 mb-4 bg-sun/15 p-2.5 rounded-xl border border-sun/30">
                <Lightbulb size={16} className="text-orange shrink-0 mt-0.5" />
                <span>{help.tipText}</span>
              </div>

              {/* Ações de Tour: Tour da tela atual ou Atalhos Rápidos */}
              <div className="space-y-2 pt-2 border-t border-blue-sky/40 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (isSimulationTab) {
                      startTutorial(TUTORIAL_STEP_SIMULATION_INDEX);
                    } else if (isInvestmentsTab) {
                      startTutorial(TUTORIAL_STEP_INVESTMENTS_INDEX);
                    } else {
                      startTutorial(0);
                    }
                  }}
                  className="w-full min-h-[38px] px-3.5 rounded-pill bg-blue-royal hover:bg-blue-deep active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-soft transition-all"
                >
                  <Compass size={15} />
                  <span>
                    {isSimulationTab
                      ? 'Tour do Simulador de Parcelas'
                      : isInvestmentsTab
                      ? 'Tour de Investimentos & Metas'
                      : 'Iniciar Tour Completo (8 etapas)'}
                  </span>
                </button>

                {/* Atalhos diretos para as 2 novas ferramentas */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => startTutorial(TUTORIAL_STEP_SIMULATION_INDEX)}
                    className="min-h-[34px] px-2.5 rounded-xl bg-blue-sky/30 dark:bg-white/10 hover:bg-blue-sky/60 dark:hover:bg-white/20 text-blue-royal-ink dark:text-sun font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-blue-sky/50 dark:border-white/10"
                    title="Aprender sobre o Simulador de Parcelas"
                  >
                    <Calculator size={13} className="shrink-0 text-orange" />
                    <span className="truncate">Tour Parcelas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startTutorial(TUTORIAL_STEP_INVESTMENTS_INDEX)}
                    className="min-h-[34px] px-2.5 rounded-xl bg-sun/20 dark:bg-white/10 hover:bg-sun/40 dark:hover:bg-white/20 text-blue-deep dark:text-sun font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-sun/40 dark:border-white/10"
                    title="Aprender sobre Investimentos e Modo Meta"
                  >
                    <TrendingUp size={13} className="shrink-0 text-blue-royal dark:text-sun" />
                    <span className="truncate">Tour Investir</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. O MASCOTE FLUTUANTE (Sem caixa branca, livre sobre o fundo) */}
        <div className="flex flex-col items-center">
          <motion.div
            whileHover={shouldReduceMotion ? {} : { scale: 1.06, rotate: 2 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.94 }}
            className="cursor-pointer relative"
            onClick={toggleAssistant}
            title="Clique para conversar com o mascote do LibertyBag!"
          >
            <LibertySunMascot
              state={isOpen ? 'talking' : !hasSeenGreeting ? 'greeting' : mascotState}
              size={80}
              className="drop-shadow-lg"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
