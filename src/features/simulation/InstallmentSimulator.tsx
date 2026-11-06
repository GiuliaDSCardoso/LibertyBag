import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Zap,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Settings2,
  X,
  Check
} from 'lucide-react';
import { useAppStore } from '../../app/store/useAppStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CustomSelect } from '../../components/ui/CustomSelect';
import {
  POPULAR_BANKS,
  simulateAllBanks,
  getSavedBankLimits,
  saveBankLimits,
  type SimulationType,
  type BankConfig,
  type StoredLimitsMap
} from './simulationService';
import { formatCentsToBRL, parseReaisStringToCents } from '../../lib/money';

interface InstallmentSimulatorProps {
  initialAmountCents?: number;
  initialType?: SimulationType;
  onApplyInstallmentPlan?: (plan: {
    totalFinalCents: number;
    installmentCents: number;
    installments: number;
    interestMonthlyPercent: number;
    bankName: string;
  }) => void;
}

export const InstallmentSimulator: React.FC<InstallmentSimulatorProps> = ({
  initialAmountCents = 100000, // R$ 1.000 padrão
  initialType = 'credito',
  onApplyInstallmentPlan
}) => {
  const { activeUserId, activeSpaceId, showUndoToast } = useAppStore();

  const [simulationType, setSimulationType] = useState<SimulationType>(initialType);
  const [amountInput, setAmountInput] = useState<string>(
    (initialAmountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
  const [installments, setInstallments] = useState<number>(12);
  const [selectedBankId, setSelectedBankId] = useState<string>('nubank');

  // Ajustes de taxa customizada e limites salvos
  const [customRateMap, setCustomRateMap] = useState<Record<string, number>>({});
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);
  const [limitsMap, setLimitsMap] = useState<StoredLimitsMap>(() =>
    getSavedBankLimits(activeUserId, activeSpaceId)
  );
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState<boolean>(false);
  const [showFullComparison, setShowFullComparison] = useState<boolean>(false);

  // Sincroniza limites ao mudar de usuário/espaço
  useEffect(() => {
    setLimitsMap(getSavedBankLimits(activeUserId, activeSpaceId));
  }, [activeUserId, activeSpaceId]);

  const amountCents = useMemo(() => {
    return Math.max(100, parseReaisStringToCents(amountInput));
  }, [amountInput]);

  const selectedBank: BankConfig = useMemo(() => {
    return POPULAR_BANKS.find((b) => b.id === selectedBankId) || POPULAR_BANKS[0];
  }, [selectedBankId]);

  // Taxa ativa do banco atual
  const currentRate = useMemo(() => {
    if (customRateMap[selectedBank.id] !== undefined) {
      return customRateMap[selectedBank.id];
    }
    return simulationType === 'credito'
      ? selectedBank.creditMonthlyRate
      : selectedBank.pixMonthlyRate;
  }, [selectedBank, simulationType, customRateMap]);

  // Simulação completa de todos os bancos
  const simulation = useMemo(() => {
    return simulateAllBanks({
      amountCents,
      installments,
      simulationType,
      limits: limitsMap,
      customRateMap
    });
  }, [amountCents, installments, simulationType, limitsMap, customRateMap]);

  // Item do banco atualmente selecionado
  const currentBankItem = useMemo(() => {
    return (
      simulation.results.find((r) => r.bank.id === selectedBank.id) ||
      simulation.bestOption
    );
  }, [simulation, selectedBank]);

  // Salvar limites editados pelo modal
  const handleSaveLimits = (newLimits: StoredLimitsMap) => {
    setLimitsMap(newLimits);
    saveBankLimits(activeUserId, activeSpaceId, newLimits);
    setIsLimitsModalOpen(false);
    showUndoToast('Seus limites foram atualizados com sucesso!', async () => {});
  };

  const QUICK_INSTALLMENTS = [1, 2, 3, 6, 10, 12, 18, 24];

  return (
    <div className="space-y-8" data-tutorial="installment-simulator">
      {/* 1. Header com Estilo Retrô e Respiro Generoso */}
      <div className="bg-white dark:bg-[#152144] p-6 sm:p-7 rounded-card border-2 border-blue-sky/70 dark:border-white/10 shadow-card space-y-3 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7AAEEB] to-[#5087C4] text-white flex items-center justify-center shrink-0 shadow-md border border-white/40">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="title-section">Simulador de Parcelamento</h2>
              <p className="text-xs sm:text-sm text-blue-deep/80 dark:text-cream/80 mt-0.5">
                Pix Parcelado e Cartão de Crédito com taxas reais dos principais bancos.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsLimitsModalOpen(true)}
            className="!text-blue-deep dark:!text-white border border-blue-sky/60 dark:border-white/20"
          >
            <Settings2 size={16} />
            <span>Meus Limites</span>
          </Button>
        </div>
      </div>

      {/* 2. Formulário Interativo Soft UI & Glassmorphism */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel de Controles (6 colunas no desktop) */}
        <div className="lg:col-span-6 space-y-7">
          <Card variant="white" className="space-y-7 p-6 sm:p-8">
            {/* Modalidade: Crédito x Pix Parcelado */}
            <div className="space-y-3">
              <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                Tipo de Parcelamento
              </label>
              <div className="grid grid-cols-2 gap-3 p-1.5 rounded-full bg-cream/70 dark:bg-[#0D152D]/60 border border-blue-sky/40 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSimulationType('credito')}
                  className={`min-h-[46px] rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    simulationType === 'credito'
                      ? 'bg-blue-royal text-white shadow-soft scale-[1.02]'
                      : 'text-blue-deep/80 dark:text-cream/80 hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  <CreditCard size={18} />
                  <span>Cartão de Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulationType('pix_parcelado')}
                  className={`min-h-[46px] rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    simulationType === 'pix_parcelado'
                      ? 'bg-orange text-white shadow-soft scale-[1.02]'
                      : 'text-blue-deep/80 dark:text-cream/80 hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  <Zap size={18} />
                  <span>Pix Parcelado</span>
                </button>
              </div>
            </div>

            {/* Valor da Compra (R$) */}
            <div className="space-y-3 pt-6 border-t border-blue-sky/40 dark:border-white/10">
              <label htmlFor="sim-amount" className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                Valor Total da Compra (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif italic text-lg font-bold text-blue-deep/60 dark:text-cream/60">
                  R$
                </span>
                <input
                  id="sim-amount"
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-h-[54px] pl-12 pr-4 rounded-2xl bg-white/90 dark:bg-[#0D152D]/80 border-2 border-blue-sky/70 dark:border-white/15 font-serif italic text-xl font-bold text-blue-deep dark:text-cream shadow-xs focus:border-blue-royal focus:ring-2 focus:ring-blue-royal/20"
                />
              </div>

              {/* Atalhos de valores rápidos */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                {[300, 800, 1500, 3000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() =>
                      setAmountInput(
                        val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      )
                    }
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-sky/30 dark:bg-white/10 hover:bg-blue-sky/60 dark:hover:bg-white/20 text-blue-deep dark:text-cream border border-blue-sky/40 dark:border-white/10 transition-all active:scale-95"
                  >
                    R$ {val.toLocaleString('pt-BR')}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de Banco Brasileiro */}
            <div className="space-y-3 pt-6 border-t border-blue-sky/40 dark:border-white/10">
              <label htmlFor="sim-bank" className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                Escolha o Banco
              </label>
              <CustomSelect
                id="sim-bank"
                value={selectedBankId}
                onChange={(newId) => setSelectedBankId(newId)}
                size="md"
                options={POPULAR_BANKS.map((b) => {
                  const rate =
                    simulationType === 'credito' ? b.creditMonthlyRate : b.pixMonthlyRate;
                  return {
                    value: b.id,
                    label: b.name,
                    color: b.color,
                    description: b.description,
                    badge: (
                      <span className="text-xs px-2 py-0.5 rounded-pill font-bold bg-blue-sky/30 dark:bg-white/10 text-blue-deep dark:text-cream">
                        {rate.toFixed(2)}% a.m.
                      </span>
                    )
                  };
                })}
              />

              {/* Ajuste de taxa personalizada */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsEditingRate(!isEditingRate)}
                  className="inline-flex items-center gap-1.5 text-blue-royal dark:text-sun font-bold underline hover:opacity-80 transition-opacity"
                >
                  <Sliders size={13} />
                  <span>
                    {isEditingRate ? 'Usar taxa padrão do banco' : 'Ajustar taxa de juros manualmente'}
                  </span>
                </button>
                <span className="font-extrabold text-blue-deep/75 dark:text-cream/75">
                  Taxa ativa: {currentRate.toFixed(2)}% a.m.
                </span>
              </div>

              {isEditingRate && (
                <div className="p-3.5 rounded-2xl bg-blue-sky/25 dark:bg-white/5 border border-blue-sky/40 dark:border-white/10 space-y-2 mt-2">
                  <label htmlFor="custom-rate" className="block text-xs font-bold">
                    Sua taxa personalizada no {selectedBank.shortName} (% ao mês):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="custom-rate"
                      type="number"
                      step="0.05"
                      min="0"
                      max="20"
                      value={currentRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCustomRateMap((prev) => ({ ...prev, [selectedBank.id]: val }));
                      }}
                      className="w-32 min-h-[42px] px-3 rounded-xl bg-white dark:bg-[#0D152D] border border-blue-sky font-bold text-center"
                    />
                    <span className="text-xs font-bold">% ao mês</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quantidade de Parcelas */}
            <div className="space-y-4 pt-6 border-t border-blue-sky/40 dark:border-white/10">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                  Número de Parcelas
                </label>
                <span className="font-serif italic text-xl font-bold text-blue-royal dark:text-sun">
                  {installments}x
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {QUICK_INSTALLMENTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setInstallments(n)}
                    className={`min-w-[44px] min-h-[44px] px-3.5 rounded-full text-xs font-bold transition-all ${
                      installments === n
                        ? 'bg-blue-royal text-white shadow-soft scale-105'
                        : 'bg-white/80 dark:bg-[#0D152D]/80 text-blue-deep dark:text-cream border border-blue-sky/50 dark:border-white/10 hover:bg-blue-sky/30'
                    }`}
                  >
                    {n === 1 ? '1x (À vista)' : `${n}x`}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <input
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-royal cursor-pointer"
                  aria-label="Slider de quantidade de parcelas"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Painel de Resultados, Cruzamento de Limites e Recomendação (6 colunas no desktop) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card Principal de Resultado Retrô */}
          <div className="bg-white dark:bg-[#152144] p-6 sm:p-7 rounded-card border-2 border-blue-sky/70 dark:border-white/10 shadow-card space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-blue-sky/40 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs border border-white/40"
                  style={{ backgroundColor: selectedBank.color }}
                >
                  {selectedBank.shortName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">{selectedBank.name}</h3>
                  <p className="text-xs text-blue-deep/75 dark:text-cream/75">
                    {simulationType === 'credito' ? 'Cartão de Crédito' : 'Pix Parcelado'} • {currentRate.toFixed(2)}% a.m.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-royal/20 text-blue-royal dark:text-sun border border-blue-royal/30">
                {installments}x parcelas
              </span>
            </div>

            {/* Bloco de Destaque da Parcela */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-white/90 to-blue-sky/20 dark:from-[#0D152D]/90 dark:to-white/5 border border-white/60 dark:border-white/10 space-y-1 text-center shadow-inner">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-deep/70 dark:text-cream/70">
                Valor de Cada Parcela
              </span>
              <div className="font-serif italic text-3xl sm:text-4xl font-extrabold text-blue-royal-ink dark:text-sun">
                {installments}x de {formatCentsToBRL(currentBankItem.installmentAmountCents)}
              </div>
              <p className="text-xs text-blue-deep/60 dark:text-cream/60 pt-1">
                Total final a ser pago: <strong>{formatCentsToBRL(currentBankItem.finalTotalCents)}</strong>
              </p>
            </div>

            {/* Três Métricas Claras */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-white/50 dark:border-white/10">
                <span className="text-[11px] font-bold text-blue-deep/70 dark:text-cream/70 block">
                  Original
                </span>
                <span className="font-bold text-xs sm:text-sm text-blue-deep dark:text-cream">
                  {formatCentsToBRL(amountCents)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-white/50 dark:border-white/10">
                <span className="text-[11px] font-bold text-blue-deep/70 dark:text-cream/70 block">
                  Juros Totais
                </span>
                <span
                  className={`font-bold text-xs sm:text-sm ${
                    currentBankItem.totalInterestCents > 0 ? 'text-red-soft' : 'text-green-ok'
                  }`}
                >
                  +{formatCentsToBRL(currentBankItem.totalInterestCents)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-white/50 dark:border-white/10">
                <span className="text-[11px] font-bold text-blue-deep/70 dark:text-cream/70 block">
                  Taxa Mensal
                </span>
                <span className="font-bold text-xs sm:text-sm text-blue-deep dark:text-cream">
                  {currentRate.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Aviso Inteligente de Limite */}
            {currentBankItem.registeredLimitCents > 0 ? (
              currentBankItem.exceedsLimit ? (
                <div className="p-4 rounded-2xl bg-red-soft/15 border-2 border-red-soft/40 text-blue-deep dark:text-cream space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-red-soft font-bold text-sm">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>Atenção: Ultrapassa seu limite cadastrado!</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    A compra final de <strong>{formatCentsToBRL(currentBankItem.finalTotalCents)}</strong> excede seu limite de{' '}
                    <strong>{formatCentsToBRL(currentBankItem.registeredLimitCents)}</strong> no {selectedBank.shortName} por{' '}
                    <span className="text-red-soft font-bold">
                      {formatCentsToBRL(currentBankItem.overLimitCents)}
                    </span>.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-green-ok/15 border border-green-ok/35 text-blue-deep dark:text-cream space-y-1">
                  <div className="flex items-center gap-2 text-green-ok font-bold text-xs">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>Dentro do seu limite cadastrado no {selectedBank.shortName}</span>
                  </div>
                  <div className="w-full bg-cream dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-green-ok h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((currentBankItem.finalTotalCents / currentBankItem.registeredLimitCents) * 100)
                        )}%`
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-blue-deep/70 dark:text-cream/70 text-right">
                    Ocupará {Math.round((currentBankItem.finalTotalCents / currentBankItem.registeredLimitCents) * 100)}% de{' '}
                    {formatCentsToBRL(currentBankItem.registeredLimitCents)}
                  </p>
                </div>
              )
            ) : (
              <div className="p-3 rounded-2xl bg-blue-sky/20 dark:bg-white/5 border border-blue-sky/40 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
                <span className="text-blue-deep/75 dark:text-cream/75">
                  Nenhum limite cadastrado para o {selectedBank.shortName}.
                </span>
                <button
                  type="button"
                  onClick={() => setIsLimitsModalOpen(true)}
                  className="font-bold underline text-blue-royal dark:text-sun shrink-0"
                >
                  Cadastrar limite
                </button>
              </div>
            )}

            {/* Ação opcional: Aplicar plano à transação atual */}
            {onApplyInstallmentPlan && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() =>
                  onApplyInstallmentPlan({
                    totalFinalCents: currentBankItem.finalTotalCents,
                    installmentCents: currentBankItem.installmentAmountCents,
                    installments,
                    interestMonthlyPercent: currentRate,
                    bankName: selectedBank.shortName
                  })
                }
              >
                <Check size={18} />
                <span>Usar este parcelamento no lançamento</span>
              </Button>
            )}
          </div>

          {/* 3. Card de Recomendação Inteligente LibertyBag */}
          <Card variant="sun" className="space-y-4 p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange text-white flex items-center justify-center shrink-0 shadow-xs border border-white/40">
                <TrendingDown size={22} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif italic font-bold text-base sm:text-lg text-blue-deep dark:text-white">
                    Recomendação Inteligente
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white dark:bg-[#15234A] text-orange dark:text-sun shadow-xs">
                    Economia
                  </span>
                </div>
                <p className="text-xs text-blue-deep/90 dark:text-cream leading-relaxed">
                  O <strong className="text-blue-deep dark:text-white">{simulation.bestOption.bank.name}</strong> oferece o menor custo para esta simulação de {installments}x.
                  {simulation.maxSavingsCents > 0 && (
                    <>
                      {' '}Você economiza até{' '}
                      <strong className="text-green-ok dark:text-[#4ADE80]">
                        {formatCentsToBRL(simulation.maxSavingsCents)}
                      </strong>{' '}
                      em comparação com o banco mais caro.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Ação rápida para trocar para o melhor banco */}
            {simulation.bestOption.bank.id !== selectedBank.id && (
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setSelectedBankId(simulation.bestOption.bank.id)}
                className="shadow-sm"
              >
                <span>Mudar para {simulation.bestOption.bank.shortName}</span>
              </Button>
            )}

            {/* Alternador para ver comparação de todos os bancos */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowFullComparison(!showFullComparison)}
                className="w-full text-xs font-extrabold uppercase tracking-wider text-blue-deep flex items-center justify-center gap-1.5 py-1"
              >
                <span>
                  {showFullComparison ? 'Ocultar comparação detalhada' : 'Ver ranking de todos os bancos'}
                </span>
                {showFullComparison ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showFullComparison && (
                <div className="mt-3 space-y-2 pt-2 border-t border-orange/20">
                  {simulation.results.map((item, idx) => {
                    const isSelected = item.bank.id === selectedBank.id;
                    const isBest = idx === 0;
                    return (
                      <div
                        key={item.bank.id}
                        onClick={() => setSelectedBankId(item.bank.id)}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-white shadow-sm border-blue-royal'
                            : 'bg-white/60 hover:bg-white border-white/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs font-bold w-5 text-blue-deep/70">
                            #{idx + 1}
                          </span>
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-extrabold shrink-0"
                            style={{ backgroundColor: item.bank.color }}
                          >
                            {item.bank.shortName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs truncate block text-blue-deep">
                              {item.bank.shortName}
                            </span>
                            <span className="text-[11px] text-blue-deep/75">
                              {item.monthlyRatePercent.toFixed(2)}% a.m.
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs text-blue-deep block">
                            {installments}x de {formatCentsToBRL(item.installmentAmountCents)}
                          </span>
                          <span className="text-[10px] text-blue-deep/75 block">
                            Total {formatCentsToBRL(item.finalTotalCents)}
                          </span>
                          {isBest && (
                            <span className="text-[10px] font-extrabold text-green-ok block">
                              ★ Mais barato
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Modal Soft UI: Cadastro e Gerenciamento de Limites por Banco */}
      <AnimatePresence>
        {isLimitsModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-deep/70 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="Cadastrar Limites por Banco"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-cream dark:bg-blue-deep rounded-card-lg p-6 sm:p-7 space-y-6 border-2 border-blue-royal shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-blue-sky/40 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-royal text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="font-serif italic font-bold text-lg text-blue-deep dark:text-cream">
                      Meus Limites Bancários
                    </h3>
                    <p className="text-xs text-blue-deep/75 dark:text-cream/75 mt-0.5">
                      Cadastre seus limites de Cartão e Pix Parcelado para receber alertas inteligentes.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLimitsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/70 dark:bg-white/10 flex items-center justify-center text-blue-deep dark:text-cream hover:bg-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista de Bancos com inputs de Limite */}
              <div className="space-y-4">
                {POPULAR_BANKS.map((bank) => {
                  const currentLim = limitsMap[bank.id] || { creditLimitCents: 0, pixLimitCents: 0 };
                  return (
                    <div
                      key={bank.id}
                      className="p-4 rounded-2xl bg-white/80 dark:bg-[#0D152D]/80 border border-white/60 dark:border-white/10 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: bank.color }}
                        >
                          {bank.shortName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-sm">{bank.name}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`limit-credit-${bank.id}`}
                            className="block text-xs font-bold text-blue-deep/70 dark:text-cream/70 mb-1"
                          >
                            Limite Cartão de Crédito (R$)
                          </label>
                          <input
                            id={`limit-credit-${bank.id}`}
                            type="number"
                            placeholder="Ex.: 3000"
                            defaultValue={
                              currentLim.creditLimitCents > 0
                                ? (currentLim.creditLimitCents / 100).toFixed(0)
                                : ''
                            }
                            onChange={(e) => {
                              const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                              setLimitsMap((prev) => ({
                                ...prev,
                                [bank.id]: {
                                  creditLimitCents: cents,
                                  pixLimitCents: prev[bank.id]?.pixLimitCents || 0
                                }
                              }));
                            }}
                            className="w-full min-h-[44px] px-3.5 rounded-xl bg-cream/70 dark:bg-white/5 border border-blue-sky/60 dark:border-white/15 text-sm font-bold"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`limit-pix-${bank.id}`}
                            className="block text-xs font-bold text-blue-deep/70 dark:text-cream/70 mb-1"
                          >
                            Limite Pix Parcelado (R$)
                          </label>
                          <input
                            id={`limit-pix-${bank.id}`}
                            type="number"
                            placeholder="Ex.: 1500"
                            defaultValue={
                              currentLim.pixLimitCents > 0
                                ? (currentLim.pixLimitCents / 100).toFixed(0)
                                : ''
                            }
                            onChange={(e) => {
                              const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                              setLimitsMap((prev) => ({
                                ...prev,
                                [bank.id]: {
                                  creditLimitCents: prev[bank.id]?.creditLimitCents || 0,
                                  pixLimitCents: cents
                                }
                              }));
                            }}
                            className="w-full min-h-[44px] px-3.5 rounded-xl bg-cream/70 dark:bg-white/5 border border-blue-sky/60 dark:border-white/15 text-sm font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ações do Modal */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-blue-sky/40 dark:border-white/10">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setIsLimitsModalOpen(false)}
                  className="!text-blue-deep dark:!text-white"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleSaveLimits(limitsMap)}
                >
                  <Check size={18} />
                  <span>Salvar Meus Limites</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
