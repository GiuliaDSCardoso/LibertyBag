import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import {
  MatisseFlower,
  ShellIllustration,
  SunIllustration
} from '../../components/illustrations/BeachIllustrations';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAppStore } from '../../app/store/useAppStore';
import { db } from '../../db/dexie';
import { DEFAULT_USER_ID } from '../../db/seed';

export const OnboardingModal: React.FC = () => {
  const { hasSeenOnboarding, userName, completeOnboarding } = useAppStore();
  const [step, setStep] = useState(0);
  const [nameInput, setNameInput] = useState(userName || '');

  if (hasSeenOnboarding) return null;

  const handleFinish = async (skip = false) => {
    const chosenName = skip ? userName : nameInput.trim();
    if (chosenName) {
      await db.users.update(DEFAULT_USER_ID, {
        name: chosenName,
        updatedAt: new Date().toISOString()
      });
    }
    completeOnboarding(chosenName);
    setStep(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream overflow-y-auto flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas ao LibertyBag"
    >
      <div className="w-full max-w-md py-4">
        {/* Topo com indicadores de passo e botão Pular */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2" aria-label={`Passo ${step + 1} de 3`}>
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                className={`h-2.5 rounded-full transition-all ${
                  idx === step
                    ? 'w-8 bg-blue-royal dark:bg-sun'
                    : 'w-2.5 bg-blue-sky dark:bg-white/30'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleFinish(true)}
            className="min-h-[48px] px-4 rounded-pill text-sm font-bold text-blue-royal dark:text-sun hover:bg-blue-sky/40 transition-colors"
          >
            Pular apresentação
          </button>
        </div>

        {/* Tela 1: O que é o app */}
        {step === 0 && (
          <Card variant="framed" withFlowerWatermark>
            <div className="flex flex-col items-center text-center py-2">
              <div className="mb-4">
                <MatisseFlower size={108} />
              </div>
              <span className="inline-block px-3.5 py-1 rounded-pill bg-sun text-blue-deep text-xs font-bold mb-3">
                Bem-vindo(a) ao LibertyBag
              </span>
              <h1 className="font-serif italic text-3xl font-bold text-blue-royal dark:text-sun mb-3">
                Seu dinheiro explicado de um jeito calmo
              </h1>
              <p className="text-base leading-relaxed mb-4">
                Aqui não tem palavras difíceis nem planilhas complicadas. Você vê na hora{' '}
                <strong>o dinheiro que entrou</strong>, <strong>o dinheiro que saiu</strong> e{' '}
                <strong>quanto sobrou</strong> no mês.
              </p>
              <div className="w-full bg-blue-sky/45 dark:bg-[#192B85] rounded-2xl p-3.5 text-sm text-left mb-6">
                <p className="font-bold mb-1">💡 Dica importante:</p>
                <p>
                  Em todas as telas existe um botão <strong>? Ajuda</strong> no topo. Se tiver
                  qualquer dúvida, é só tocar nele!
                </p>
              </div>
              <Button fullWidth size="lg" onClick={() => setStep(1)}>
                <span>Próximo</span>
                <ArrowRight size={20} />
              </Button>
            </div>
          </Card>
        )}

        {/* Tela 2: Como adicionar um gasto em 3 toques */}
        {step === 1 && (
          <Card variant="framed">
            <div className="flex flex-col items-center text-center py-2">
              <div className="mb-4">
                <SunIllustration size={104} />
              </div>
              <span className="inline-block px-3.5 py-1 rounded-pill bg-blue-sky text-blue-deep text-xs font-bold mb-3">
                Rápido e sem medo de errar
              </span>
              <h1 className="font-serif italic text-3xl font-bold text-blue-royal dark:text-sun mb-3">
                Anote um gasto em 3 toques
              </h1>
              <div className="w-full space-y-2.5 text-left mb-5">
                <div className="flex items-center gap-3 bg-white dark:bg-[#192B85] p-3.5 rounded-2xl border border-blue-sky/60">
                  <span className="w-8 h-8 rounded-full bg-blue-royal text-white font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <p className="text-base">
                    Digite o <strong>valor</strong> no teclado grande.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-[#192B85] p-3.5 rounded-2xl border border-blue-sky/60">
                  <span className="w-8 h-8 rounded-full bg-blue-royal text-white font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <p className="text-base">
                    Escolha se o dinheiro <strong>Entrou</strong> ou <strong>Saiu</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-[#192B85] p-3.5 rounded-2xl border border-blue-sky/60">
                  <span className="w-8 h-8 rounded-full bg-blue-royal text-white font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <p className="text-base">
                    Toque na <strong>categoria</strong> (ex.: Mercado) e pronto, já salvou!
                  </p>
                </div>
              </div>
              <p className="text-sm opacity-85 mb-6">
                Tocou errado? Sempre aparece o botão <strong>Desfazer</strong> logo depois.
              </p>
              <Button fullWidth size="lg" onClick={() => setStep(2)}>
                <span>Próximo</span>
                <ArrowRight size={20} />
              </Button>
            </div>
          </Card>
        )}

        {/* Tela 3: O que é o cofrinho + Nome da pessoa */}
        {step === 2 && (
          <Card variant="framed" withFlowerWatermark>
            <div className="flex flex-col items-center text-center py-2">
              <div className="mb-3">
                <ShellIllustration size={96} />
              </div>
              <span className="inline-block px-3.5 py-1 rounded-pill bg-sun text-blue-deep text-xs font-bold mb-2">
                Seus sonhos têm lugar
              </span>
              <h1 className="font-serif italic text-3xl font-bold text-blue-royal dark:text-sun mb-2">
                Guarde no Cofrinho aos poucos
              </h1>
              <p className="text-base leading-relaxed mb-5">
                O <strong>Cofrinho</strong> serve para separar dinheiro para um objetivo (como uma
                viagem ou uma reserva). O app mostra quanto guardar por mês para chegar lá tranquilo.
              </p>

              <div className="w-full text-left bg-white dark:bg-[#192B85] p-4 rounded-2xl border border-blue-sky/70 mb-6">
                <label
                  htmlFor="onboarding-name-input"
                  className="block font-bold text-base mb-1 text-blue-deep dark:text-cream"
                >
                  Como você gosta de ser chamado(a)?
                </label>
                <p className="text-xs opacity-75 mb-2.5">
                  Usaremos apenas para dar bom dia na tela inicial.
                </p>
                <input
                  id="onboarding-name-input"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ex.: Mãe, Maria, Giulia..."
                  className="w-full min-h-[50px] px-4 rounded-xl bg-cream dark:bg-blue-deep text-blue-deep dark:text-white border-2 border-blue-sky focus:border-blue-royal text-base font-medium"
                />
              </div>

              <Button fullWidth size="lg" onClick={() => handleFinish(false)}>
                <Check size={22} />
                <span>Começar a usar agora</span>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
