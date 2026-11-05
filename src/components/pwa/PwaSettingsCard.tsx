import React, { useState } from 'react';
import { Smartphone, Download, Check, Share, PlusSquare, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ModalShell } from '../ui/ModalShell';
import { usePwaInstall } from './usePwaInstall';

export const PwaSettingsCard: React.FC = () => {
  const { isStandalone, isIos, canInstallNative, promptInstall } = usePwaInstall();
  const [showIosModal, setShowIosModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosModal(true);
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
      <Card variant="white" staggerIndex={1} className="space-y-3.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sun text-blue-deep flex items-center justify-center shrink-0">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="title-section">Aplicativo no Celular</h2>
            <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85 mt-0.5">
              Instale o LibertyBag na tela inicial para usar em tela cheia como um aplicativo de verdade.
            </p>
          </div>
        </div>

        {isStandalone ? (
          <div className="p-3 rounded-xl bg-green-ok/15 text-green-ok border border-green-ok/30 flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <div className="w-6 h-6 rounded-full bg-green-ok text-white flex items-center justify-center shrink-0">
              <Check size={14} strokeWidth={3} />
            </div>
            <span>Você já está usando o aplicativo instalado neste aparelho!</span>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {isIos ? (
                <Button variant="primary" size="md" onClick={() => setShowIosModal(true)}>
                  <Share size={16} />
                  <span>Como instalar no iPhone / iPad</span>
                </Button>
              ) : canInstallNative ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleInstall}
                  disabled={isInstalling}
                >
                  <Download size={16} />
                  <span>{isInstalling ? 'Instalando...' : 'Instalar aplicativo agora'}</span>
                </Button>
              ) : (
                <div className="p-2.5 rounded-xl bg-blue-sky/40 dark:bg-blue-royal/30 text-xs text-blue-deep/90 dark:text-cream/90 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-royal dark:text-sun shrink-0" />
                  <span>Para instalar, abra pelo navegador do seu celular (Chrome ou Safari) e toque em "Instalar aplicativo".</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Modal explicativo iOS */}
      <ModalShell
        open={showIosModal}
        onClose={() => setShowIosModal(false)}
        title="Instalar no iPhone ou iPad"
        subtitle="Passo a passo rápido pelo Safari"
        maxWidthClass="max-w-md"
        footer={
          <Button variant="primary" fullWidth onClick={() => setShowIosModal(false)}>
            <Check size={18} />
            <span>Fechar</span>
          </Button>
        }
      >
        <div className="space-y-3.5 text-blue-deep dark:text-cream text-sm">
          <div className="p-3 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky/60 flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-royal text-white flex items-center justify-center shrink-0 text-xs font-bold">1</span>
            <div>
              <p className="font-bold">Toque em Compartilhar no Safari</p>
              <p className="text-xs text-blue-deep/80 dark:text-cream/80 mt-0.5">
                É o ícone com um quadrado e uma seta para cima (<Share size={12} className="inline-block -mt-0.5" />) na barra inferior do navegador.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky/60 flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-royal text-white flex items-center justify-center shrink-0 text-xs font-bold">2</span>
            <div>
              <p className="font-bold">Toque em "Adicionar à Tela de Início"</p>
              <p className="text-xs text-blue-deep/80 dark:text-cream/80 mt-0.5">
                Role as opções e selecione o item com o ícone de (<PlusSquare size={12} className="inline-block -mt-0.5" />).
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky/60 flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-royal text-white flex items-center justify-center shrink-0 text-xs font-bold">3</span>
            <div>
              <p className="font-bold">Toque em "Adicionar"</p>
              <p className="text-xs text-blue-deep/80 dark:text-cream/80 mt-0.5">
                No canto superior direito, toque em Adicionar. O ícone oficial do LibertyBag aparecerá na sua tela inicial!
              </p>
            </div>
          </div>
        </div>
      </ModalShell>
    </>
  );
};
