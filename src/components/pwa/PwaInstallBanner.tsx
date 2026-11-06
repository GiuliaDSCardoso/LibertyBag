import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Download, Share, PlusSquare, X, Check, Smartphone } from 'lucide-react';
import { usePwaInstall } from './usePwaInstall';
import { Button } from '../ui/Button';
import { ModalShell } from '../ui/ModalShell';
import { MatisseFlower } from '../illustrations/BeachIllustrations';

export const PwaInstallBanner: React.FC = () => {
  const {
    isStandalone,
    isIos,
    canInstallNative,
    isDismissed,
    promptInstall,
    dismiss
  } = usePwaInstall();

  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Não exibe se já estiver rodando como standalone instalado ou se foi dispensado
  if (isStandalone || isDismissed) {
    return null;
  }

  // Só exibe se houver suporte nativo (Android/Chrome/Edge) ou se for iOS Safari
  if (!canInstallNative && !isIos) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      return;
    }

    if (canInstallNative) {
      setIsInstalling(true);
      try {
        await promptInstall();
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-[420px] z-40 bg-white dark:bg-[#152144] text-blue-deep dark:text-cream rounded-2xl border-2 border-blue-royal/30 shadow-soft p-3.5 sm:p-4 backdrop-blur-md"
          role="region"
          aria-label="Instalação do aplicativo LibertyBag"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-royal text-white flex items-center justify-center shrink-0 shadow-xs">
              <MatisseFlower size={26} />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <h3 className="font-serif italic text-base sm:text-lg font-bold text-blue-royal dark:text-sun leading-tight">
                Instale o LibertyBag
              </h3>
              <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85 mt-0.5 leading-snug">
                {isIos
                  ? 'Abra na tela de início do seu iPhone sem barras de navegação.'
                  : 'Acesse direto pela tela inicial do seu celular, mais rápido e prático.'}
              </p>
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Fechar aviso de instalação"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cream dark:bg-blue-deep/60 hover:bg-blue-sky/40 flex items-center justify-center text-blue-deep/70 dark:text-cream/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-blue-sky/60 dark:border-blue-sky/20 justify-end">
            <Button variant="ghost" size="md" onClick={dismiss}>
              Agora não
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleInstallClick}
              disabled={isInstalling}
            >
              {isIos ? (
                <>
                  <Smartphone size={16} />
                  <span>Como instalar</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>{isInstalling ? 'Instalando...' : 'Instalar aplicativo'}</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modal com instruções visuais específicas para iPhone / iPad (iOS Safari) */}
      <ModalShell
        open={showIosInstructions}
        onClose={() => {
          setShowIosInstructions(false);
          dismiss();
        }}
        title="Instalar no iPhone ou iPad"
        subtitle="Siga estes 3 passos simples no Safari para ter o LibertyBag na sua tela inicial"
        maxWidthClass="max-w-md"
        footer={
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              setShowIosInstructions(false);
              dismiss();
            }}
          >
            <Check size={18} />
            <span>Entendi, vou adicionar</span>
          </Button>
        }
      >
        <div className="space-y-4 text-blue-deep dark:text-cream">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#152144] border border-blue-sky/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-sky/60 dark:bg-blue-royal text-blue-royal dark:text-sun flex items-center justify-center shrink-0 font-bold text-sm">
              1
            </div>
            <div className="text-sm">
              <p className="font-bold">Toque no botão de Compartilhar</p>
              <p className="text-xs text-blue-deep/80 dark:text-cream/80 mt-0.5">
                No Safari, toque no ícone com um quadrado e uma seta para cima (<Share size={13} className="inline-block -mt-1 mx-0.5" />) na barra inferior do iPhone.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#152144] border border-blue-sky/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-sky/60 dark:bg-blue-royal text-blue-royal dark:text-sun flex items-center justify-center shrink-0 font-bold text-sm">
              2
            </div>
            <div className="text-sm">
              <p className="font-bold">Role e toque em "Adicionar à Tela de Início"</p>
              <p className="text-xs text-blue-deep/80 dark:text-cream/80 mt-0.5">
                Procure a opção com o ícone de mais (<PlusSquare size={13} className="inline-block -mt-1 mx-0.5" />) chamada <strong>Adicionar à Tela de Início</strong>.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#152144] border border-blue-sky/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-sky/60 dark:bg-blue-royal text-blue-royal dark:text-sun flex items-center justify-center shrink-0 font-bold text-sm">
              3
            </div>
            <div className="text-sm">
              <p className="font-bold">Confirme tocando em "Adicionar"</p>
              <p className="text-xs text-blue-deep/80 dark:text-cream/80 mt-0.5">
                No canto superior direito da tela, toque em <strong>Adicionar</strong>. Pronto! O ícone do LibertyBag estará pronto na sua tela de início.
              </p>
            </div>
          </div>
        </div>
      </ModalShell>
    </>
  );
};
