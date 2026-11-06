import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  TrendingUp,
  Target,
  Sparkles,
  Coins,
  PieChart as PieIcon,
  Award,
  Shield,
  Zap,
  Building2,
  Landmark,
  Droplets,
  Globe,
  RefreshCw,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Clock,
  X,
  Sliders
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { formatCentsToBRL, parseReaisStringToCents } from '../../lib/money';
import {
  INVESTMENT_ASSETS,
  INVESTMENT_INSTITUTIONS,
  MARKET_BENCHMARKS,
  SECTOR_STOCK_TIPS,
  SIMPLE_INVESTMENT_GUIDE,
  calculateInvestmentSimulation,
  calculateGoalMode,
  calculateDiversifiedPortfolio,
  getBestInvestmentRecommendation,
  fetchLiveBacenRates,
  type PeriodUnit,
  type SimulationParams,
  type RiskProfile,
  type LiquidityPreference,
  type LiveMarketRates,
  type SectorStockTip
} from './investmentService';

const PRESET_INITIALS = [1000, 5000, 10000, 25000, 50000];
const PRESET_APORTES = [200, 500, 1000, 2000, 3000];
const PRESET_GOALS = [10000, 25000, 50000, 100000, 250000];

export const InvestmentSimulator: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  // Modo: Simulação Livre vs Modo Meta
  const [activeMode, setActiveMode] = useState<'simulacao' | 'meta'>('simulacao');

  // Perfil de Risco e Preferência de Liquidez (Novidade Fase 4 Avançada)
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('moderado');
  const [liquidityPreference, setLiquidityPreference] = useState<LiquidityPreference>('prazo_fixo');

  // Parâmetros do Formulário
  const [selectedAssetId, setSelectedAssetId] = useState<string>('tesouro_selic');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('inter');
  const [initialInput, setInitialInput] = useState<string>('5.000,00');
  const [monthlyInput, setMonthlyInput] = useState<string>('500,00');
  const [periodValue, setPeriodValue] = useState<number>(24);
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('months');
  const [reinvestDividends, setReinvestDividends] = useState<boolean>(true);
  const [customRate, setCustomRate] = useState<number | undefined>(undefined);
  const [isEditingRate, setIsEditingRate] = useState<boolean>(false);

  // Parâmetros do Modo Meta
  const [goalInput, setGoalInput] = useState<string>('50.000,00');
  const [goalTargetOption, setGoalTargetOption] = useState<'months_needed' | 'aporte_needed'>('months_needed');

  // Visualização de Resultados: 'diversificacao' (Ganhos & Carteira), 'evolucao' (Gráfico), 'ativo_unico'
  const [resultTab, setResultTab] = useState<'diversificacao' | 'evolucao' | 'ativo_unico'>('diversificacao');

  // Setor Selecionado para Dicas de Ações
  const [selectedSectorId, setSelectedSectorId] = useState<string>('eletricas');

  // Modais Educativos e de Cenário Mundial
  const [isLearningGuideOpen, setIsLearningGuideOpen] = useState<boolean>(false);
  const [isGlobalScenarioOpen, setIsGlobalScenarioOpen] = useState<boolean>(false);

  // Taxas de Mercado ao Vivo (BACEN SGS)
  const [marketRates, setMarketRates] = useState<LiveMarketRates>({
    selicAnnualPercent: MARKET_BENCHMARKS.selicAnnualPercent,
    cdiAnnualPercent: MARKET_BENCHMARKS.cdiAnnualPercent,
    ipcaAnnualPercent: MARKET_BENCHMARKS.ipcaAnnualPercent,
    poupancaAnnualPercent: MARKET_BENCHMARKS.poupancaAnnualPercent,
    lastUpdated: 'Referência BCB (Estável)',
    isLive: false
  });
  const [isSyncingRates, setIsSyncingRates] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Sincroniza taxas reais do Banco Central
  const handleSyncBacenRates = async () => {
    setIsSyncingRates(true);
    setSyncFeedback(null);
    try {
      const live = await fetchLiveBacenRates();
      setMarketRates(live);
      setSyncFeedback(live.isLive ? 'Taxas sincronizadas com o BACEN!' : 'Usando taxas oficiais de referência.');
    } finally {
      setIsSyncingRates(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  // Conversões numéricas
  const initialCents = useMemo(() => parseReaisStringToCents(initialInput), [initialInput]);
  const monthlyCents = useMemo(() => parseReaisStringToCents(monthlyInput), [monthlyInput]);
  const goalCents = useMemo(() => parseReaisStringToCents(goalInput), [goalInput]);

  // Executa Simulação do Ativo Específico
  const simulationParams: SimulationParams = useMemo(() => {
    return {
      initialAmountCents: initialCents,
      monthlyContributionCents: monthlyCents,
      periodValue,
      periodUnit,
      reinvestDividends,
      assetId: selectedAssetId,
      institutionId: selectedInstitutionId,
      customAnnualRatePercent: customRate
    };
  }, [
    initialCents,
    monthlyCents,
    periodValue,
    periodUnit,
    reinvestDividends,
    selectedAssetId,
    selectedInstitutionId,
    customRate
  ]);

  const simulation = useMemo(
    () => calculateInvestmentSimulation(simulationParams),
    [simulationParams]
  );

  // Executa Cálculo dos Ganhos e Resultados da Carteira Diversificada
  const diversifiedResult = useMemo(() => {
    return calculateDiversifiedPortfolio({
      initialAmountCents: initialCents,
      monthlyContributionCents: monthlyCents,
      periodMonths: simulation.totalMonths,
      riskProfile,
      liquidityPreference,
      reinvestDividends
    });
  }, [
    initialCents,
    monthlyCents,
    simulation.totalMonths,
    riskProfile,
    liquidityPreference,
    reinvestDividends
  ]);

  // Executa Cálculo do Modo Meta
  const goalResult = useMemo(() => {
    return calculateGoalMode({
      targetGoalCents: goalCents,
      initialAmountCents: initialCents,
      monthlyContributionCents: monthlyCents,
      targetMonths: simulation.totalMonths,
      effectiveAnnualRatePercent: diversifiedResult.blendedAnnualRatePercent
    });
  }, [goalCents, initialCents, monthlyCents, simulation.totalMonths, diversifiedResult.blendedAnnualRatePercent]);

  // Recomendação Inteligente e Alocação de Carteira
  const bestRecommendation = useMemo(
    () => getBestInvestmentRecommendation(simulation.totalMonths, activeMode === 'meta'),
    [simulation.totalMonths, activeMode]
  );

  // Setor ativo para as dicas de ações
  const activeSectorTip = useMemo<SectorStockTip>(() => {
    return SECTOR_STOCK_TIPS.find((s) => s.id === selectedSectorId) || SECTOR_STOCK_TIPS[0];
  }, [selectedSectorId]);

  // Dados formatados para o Gráfico de Evolução
  const chartEvolutionData = useMemo(() => {
    const step = Math.max(1, Math.floor(diversifiedResult.timeline.length / 12));
    return diversifiedResult.timeline
      .filter((_, idx) => idx % step === 0 || idx === diversifiedResult.timeline.length - 1)
      .map((pt) => ({
        mes: `Mês ${pt.month}`,
        investido: Number((pt.investedTotalCents / 100).toFixed(2)),
        rendimento: Number((pt.interestGrossTotalCents / 100).toFixed(2)),
        totalBruto: Number((pt.grossBalanceCents / 100).toFixed(2))
      }));
  }, [diversifiedResult.timeline]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-14" data-tutorial="investments-view">
      {/* 1. Barra de Benchmark e Taxas ao Vivo (BACEN SGS 432 & Cenário Mundial) */}
      <div className="bg-white dark:bg-[#152144] p-3 sm:p-4 rounded-2xl border-2 border-blue-sky/70 dark:border-white/10 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-green-ok animate-pulse shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
              Taxas de Mercado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs w-full sm:w-auto">
            <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-blue-sky/30 dark:bg-white/10 font-bold truncate">
              Selic: <strong className="text-blue-royal dark:text-sun">{marketRates.selicAnnualPercent.toFixed(2)}%</strong>
            </span>
            <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-blue-sky/30 dark:bg-white/10 font-bold truncate">
              CDI: <strong className="text-blue-royal dark:text-sun">{marketRates.cdiAnnualPercent.toFixed(2)}%</strong>
            </span>
            <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-blue-sky/30 dark:bg-white/10 font-bold truncate">
              IPCA: <strong className="text-blue-royal dark:text-sun">{marketRates.ipcaAnnualPercent.toFixed(2)}%</strong>
            </span>
            <span className="px-2 py-0.5 sm:py-1 rounded-lg bg-blue-sky/30 dark:bg-white/10 font-bold truncate">
              Poupança: <strong className="text-blue-royal dark:text-sun">{marketRates.poupancaAnnualPercent.toFixed(2)}%</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Botão Sincronizar BACEN */}
          <button
            type="button"
            onClick={handleSyncBacenRates}
            disabled={isSyncingRates}
            title="Consultar API pública do Banco Central do Brasil"
            className="flex-1 sm:flex-initial h-8 sm:h-9 px-2.5 rounded-xl bg-cream dark:bg-[#0D152D] hover:bg-blue-sky/30 text-blue-deep dark:text-cream text-[11px] sm:text-xs font-bold border border-blue-sky/60 dark:border-white/20 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isSyncingRates ? 'animate-spin text-blue-royal' : 'text-blue-royal dark:text-sun shrink-0'} />
            <span>BACEN</span>
          </button>

          {/* Botão Cenário Mundial */}
          <button
            type="button"
            onClick={() => setIsGlobalScenarioOpen(true)}
            className="flex-1 sm:flex-initial h-8 sm:h-9 px-2.5 rounded-xl bg-blue-royal text-white hover:bg-blue-deep text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Globe size={12} className="shrink-0" />
            <span className="truncate">Cenário Mundial</span>
          </button>

          {/* Botão Aprender a Investir */}
          <button
            type="button"
            onClick={() => setIsLearningGuideOpen(true)}
            className="flex-1 sm:flex-initial h-8 sm:h-9 px-2.5 rounded-xl bg-[#FF7518] hover:bg-[#e66710] text-white text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <BookOpen size={12} className="shrink-0 text-white" />
            <span className="truncate">Guia Fácil</span>
          </button>
        </div>

        {syncFeedback && (
          <div className="w-full text-xs font-bold text-green-ok text-right -mt-1">
            ✓ {syncFeedback}
          </div>
        )}
      </div>

      {/* 2. Cabeçalho Principal com Seletor de Modo (Simulação vs Meta) */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-1 sm:pt-2">
        <div className="w-full sm:flex-1 min-w-0 pr-0 sm:pr-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-sun/20 text-blue-deep dark:text-sun text-xs font-bold mb-2">
            <Sparkles size={14} className="text-orange shrink-0" />
            <span className="truncate">Inteligência Financeira • Simulação & Carteira</span>
          </div>
          <h1 className="title-page text-blue-royal dark:text-sun break-words">
            Simulador de Investimentos & Metas
          </h1>
          <p className="text-sm sm:text-base text-blue-deep/85 dark:text-cream/85 mt-1 sm:mt-2 leading-relaxed">
            Descubra os ganhos da diversificação, calibre seu perfil de risco e veja o poder dos juros compostos trabalhando para você.
          </p>
        </div>

        {/* Alternador de Modo: Simulação Livre vs Modo Meta */}
        <div className="w-full sm:w-auto flex shrink-0 p-1.5 bg-white dark:bg-[#152144] rounded-2xl border-2 border-blue-sky/70 dark:border-white/10 shadow-card">
          <button
            type="button"
            onClick={() => setActiveMode('simulacao')}
            className={`flex-1 sm:flex-initial min-h-[42px] px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeMode === 'simulacao'
                ? 'bg-blue-royal text-white shadow-soft'
                : 'text-blue-deep dark:text-cream hover:bg-cream dark:hover:bg-white/10'
            }`}
          >
            <TrendingUp size={16} className="shrink-0" />
            <span className="truncate">Simulação Livre</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('meta')}
            className={`flex-1 sm:flex-initial min-h-[42px] px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeMode === 'meta'
                ? 'bg-orange text-white shadow-soft'
                : 'text-blue-deep dark:text-cream hover:bg-cream dark:hover:bg-white/10'
            }`}
          >
            <Target size={16} className="shrink-0" />
            <span className="truncate">Modo Meta</span>
          </button>
        </div>
      </header>

      {/* 3. Grid Principal em 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* ================= COLUNA ESQUERDA: FORMULÁRIO E CONTROLES (6 colunas) ================= */}
        <div className="lg:col-span-6 space-y-5 sm:space-y-6">
          <Card variant="white" className="space-y-5 sm:space-y-6 p-4 sm:p-6 lg:p-7">
            {/* Bloco Meta (Exibido apenas quando Modo Meta estiver ativo) */}
            <AnimatePresence>
              {activeMode === 'meta' && (
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  className="space-y-4 pb-6 border-b border-blue-sky/40 dark:border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="goal-amount"
                      className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-orange"
                    >
                      🎯 Qual é o Valor Alvo da sua Meta?
                    </label>
                    <span className="text-xs font-bold text-blue-deep/70 dark:text-cream/70">
                      {goalResult.progressPercent}% já garantido
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif italic text-lg font-bold text-blue-deep/60 dark:text-cream/60">
                      R$
                    </span>
                    <input
                      id="goal-amount"
                      type="text"
                      inputMode="decimal"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder="50.000,00"
                      className="w-full min-h-[54px] pl-12 pr-4 rounded-2xl bg-cream/70 dark:bg-[#0D152D]/80 border-2 border-orange/60 font-serif italic text-xl font-bold text-blue-deep dark:text-cream shadow-xs focus:border-orange focus:ring-2 focus:ring-orange/20"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {PRESET_GOALS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setGoalInput(
                            val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          )
                        }
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange/15 hover:bg-orange/30 text-orange dark:text-sun border border-orange/40 transition-all active:scale-95 cursor-pointer"
                      >
                        R$ {val.toLocaleString('pt-BR')}
                      </button>
                    ))}
                  </div>

                  {/* Alternador do Modo Meta */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setGoalTargetOption('months_needed')}
                      className={`min-h-[42px] px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        goalTargetOption === 'months_needed'
                          ? 'bg-orange text-white border-orange shadow-xs'
                          : 'bg-white dark:bg-[#0D152D] text-blue-deep dark:text-cream border-blue-sky/60'
                      }`}
                    >
                      Quanto tempo falta com aportes?
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalTargetOption('aporte_needed')}
                      className={`min-h-[42px] px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        goalTargetOption === 'aporte_needed'
                          ? 'bg-orange text-white border-orange shadow-xs'
                          : 'bg-white dark:bg-[#0D152D] text-blue-deep dark:text-cream border-blue-sky/60'
                      }`}
                    >
                      Quanto aportar p/ prazo fixo?
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bloco 1: Perfil de Risco (Leve / Moderado / Alto) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                  1. Seu Perfil de Risco
                </label>
                <button
                  type="button"
                  onClick={() => setIsLearningGuideOpen(true)}
                  className="text-xs text-blue-royal dark:text-sun font-bold inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <HelpCircle size={13} />
                  <span>Entenda os perfis</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: 'leve',
                      label: 'Leve',
                      sub: 'Conservador',
                      emoji: '🐢'
                    },
                    {
                      id: 'moderado',
                      label: 'Moderado',
                      sub: 'Equilibrado',
                      emoji: '🐎'
                    },
                    {
                      id: 'alto',
                      label: 'Alto Risco',
                      sub: 'Arrojado',
                      emoji: '🦅'
                    }
                  ] as const
                ).map((p) => {
                  const isSelected = riskProfile === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRiskProfile(p.id)}
                      className={`p-2 sm:p-2.5 rounded-xl border-2 text-center sm:text-left transition-all cursor-pointer min-w-0 ${
                        isSelected
                          ? 'bg-blue-sky/30 dark:bg-white/10 border-blue-royal dark:border-sun shadow-xs scale-[1.02]'
                          : 'bg-white dark:bg-[#0D152D] border-blue-sky/50 dark:border-white/10 hover:bg-cream dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="text-lg sm:text-xl mb-0.5">{p.emoji}</div>
                      <div className="font-extrabold text-[11px] sm:text-xs text-blue-deep dark:text-cream leading-tight truncate">
                        {p.label}
                      </div>
                      <div className="text-[9px] sm:text-[11px] text-blue-deep/65 dark:text-cream/65 truncate">
                        {p.sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-blue-deep/75 dark:text-cream/75 leading-relaxed pt-0.5">
                {riskProfile === 'leve' && '🐢 Foco em segurança total e previsibilidade (100% Renda Fixa protegida por Tesouro e FGC).'}
                {riskProfile === 'moderado' && '🐎 Equilíbrio clássico entre solidez da renda fixa e renda passiva de Fundos Imobiliários e dividendos.'}
                {riskProfile === 'alto' && '🦅 Maior multiplicação patrimonial e dividendos acelerados no longo prazo.'}
              </p>
            </div>

            {/* Bloco 2: Necessidade de Liquidez (Poder retirar a qualquer momento?) */}
            <div className="space-y-3 pt-6 border-t border-blue-sky/40 dark:border-white/10">
              <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                2. Quer Poder Retirar o Dinheiro a Qualquer Momento?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLiquidityPreference('qualquer_momento')}
                  className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                    liquidityPreference === 'qualquer_momento'
                      ? 'bg-blue-sky/30 dark:bg-white/10 border-blue-royal dark:border-sun shadow-xs'
                      : 'bg-white dark:bg-[#0D152D] border-blue-sky/50 dark:border-white/10 hover:bg-cream dark:hover:bg-white/5'
                  }`}
                >
                  <Zap size={20} className="text-orange shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-blue-deep dark:text-cream block">
                      Sim, quero Liquidez Diária
                    </span>
                    <span className="text-[11px] text-blue-deep/70 dark:text-cream/70 block leading-tight mt-0.5">
                      Reserva de emergência com saque imediato 24h via 99Pay ou Tesouro Selic.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLiquidityPreference('prazo_fixo')}
                  className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                    liquidityPreference === 'prazo_fixo'
                      ? 'bg-blue-sky/30 dark:bg-white/10 border-blue-royal dark:border-sun shadow-xs'
                      : 'bg-white dark:bg-[#0D152D] border-blue-sky/50 dark:border-white/10 hover:bg-cream dark:hover:bg-white/5'
                  }`}
                >
                  <Clock size={20} className="text-blue-royal dark:text-sun shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-blue-deep dark:text-cream block">
                      Não, posso deixar no prazo
                    </span>
                    <span className="text-[11px] text-blue-deep/70 dark:text-cream/70 block leading-tight mt-0.5">
                      Libera LCIs isentas e CDBs de 120% CDI com rentabilidades turbinadas.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Bloco 3: Valores (Entrada Inicial + Aporte Mensal) */}
            <div className="space-y-5 pt-6 border-t border-blue-sky/40 dark:border-white/10">
              {/* Valor de Entrada */}
              <div className="space-y-2">
                <label
                  htmlFor="invest-initial"
                  className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun"
                >
                  3. Valor de Entrada (Investimento Inicial)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif italic text-lg font-bold text-blue-deep/60 dark:text-cream/60">
                    R$
                  </span>
                  <input
                    id="invest-initial"
                    type="text"
                    inputMode="decimal"
                    value={initialInput}
                    onChange={(e) => setInitialInput(e.target.value)}
                    placeholder="1.000,00"
                    className="w-full min-h-[54px] pl-12 pr-4 rounded-2xl bg-white/90 dark:bg-[#0D152D]/80 border-2 border-blue-sky/70 dark:border-white/15 font-serif italic text-xl font-bold text-blue-deep dark:text-cream shadow-xs focus:border-blue-royal focus:ring-2 focus:ring-blue-royal/20"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_INITIALS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setInitialInput(
                          val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        )
                      }
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-sky/30 dark:bg-white/10 hover:bg-blue-sky/60 dark:hover:bg-white/20 text-blue-deep dark:text-cream border border-blue-sky/40 dark:border-white/10 transition-all active:scale-95 cursor-pointer"
                    >
                      R$ {val.toLocaleString('pt-BR')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aporte Mensal */}
              <div className="space-y-2 pt-2">
                <label
                  htmlFor="invest-monthly"
                  className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun"
                >
                  4. Aporte Mensal (Guardar todo mês)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif italic text-lg font-bold text-blue-deep/60 dark:text-cream/60">
                    R$
                  </span>
                  <input
                    id="invest-monthly"
                    type="text"
                    inputMode="decimal"
                    value={monthlyInput}
                    onChange={(e) => setMonthlyInput(e.target.value)}
                    placeholder="300,00"
                    className="w-full min-h-[54px] pl-12 pr-4 rounded-2xl bg-white/90 dark:bg-[#0D152D]/80 border-2 border-blue-sky/70 dark:border-white/15 font-serif italic text-xl font-bold text-blue-deep dark:text-cream shadow-xs focus:border-blue-royal focus:ring-2 focus:ring-blue-royal/20"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_APORTES.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setMonthlyInput(
                          val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        )
                      }
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-sky/30 dark:bg-white/10 hover:bg-blue-sky/60 dark:hover:bg-white/20 text-blue-deep dark:text-cream border border-blue-sky/40 dark:border-white/10 transition-all active:scale-95 cursor-pointer"
                    >
                      R$ {val.toLocaleString('pt-BR')}/mês
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bloco 4: Tempo de Resgate (Slider + Seletor Dias / Meses / Anos) */}
            <div className="space-y-4 pt-6 border-t border-blue-sky/40 dark:border-white/10">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                  5. Tempo de Resgate
                </label>
                <span className="font-serif italic text-xl font-bold text-blue-royal dark:text-sun">
                  {periodValue} {periodUnit === 'years' ? 'ano(s)' : periodUnit === 'months' ? 'meses' : 'dias'}
                  {periodUnit !== 'months' && (
                    <span className="text-xs font-normal text-blue-deep/60 dark:text-cream/60 ml-1">
                      (~{simulation.totalMonths} meses)
                    </span>
                  )}
                </span>
              </div>

              {/* Seletor de Unidade: Dias, Meses, Anos */}
              <div className="grid grid-cols-3 gap-2.5 p-1 bg-cream/80 dark:bg-[#0D152D]/70 rounded-2xl border border-blue-sky/50 dark:border-white/10">
                {(
                  [
                    { id: 'days', label: 'Dias' },
                    { id: 'months', label: 'Meses' },
                    { id: 'years', label: 'Anos' }
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setPeriodUnit(id);
                      if (id === 'years' && periodValue > 30) setPeriodValue(5);
                      if (id === 'days' && periodValue < 30) setPeriodValue(180);
                    }}
                    className={`min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      periodUnit === id
                        ? 'bg-blue-royal text-white shadow-soft'
                        : 'text-blue-deep dark:text-cream hover:bg-white/40 dark:hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Slider de Tempo */}
              <div className="pt-2">
                <input
                  type="range"
                  min={periodUnit === 'years' ? 1 : periodUnit === 'days' ? 30 : 1}
                  max={periodUnit === 'years' ? 30 : periodUnit === 'days' ? 1080 : 120}
                  step={1}
                  value={periodValue}
                  onChange={(e) => setPeriodValue(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-royal cursor-pointer"
                  aria-label="Slider de tempo de investimento"
                />
              </div>
            </div>

            {/* Bloco 5: Comparar com Ativo & Instituição Específica */}
            <div className="space-y-3 pt-6 border-t border-blue-sky/40 dark:border-white/10">
              <label
                htmlFor="select-asset"
                className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun"
              >
                6. Ativo e Instituição para Comparação Específica
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CustomSelect
                  id="select-asset"
                  value={selectedAssetId}
                  onChange={(val) => {
                    setSelectedAssetId(val);
                    setCustomRate(undefined);
                  }}
                  size="md"
                  options={INVESTMENT_ASSETS.map((asset) => ({
                    value: asset.id,
                    label: asset.name,
                    description: `${asset.categoryLabel} • ${asset.liquidity}`,
                    badge: (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-pill font-extrabold ${
                          asset.isTaxFree
                            ? 'bg-green-ok/20 text-green-ok border border-green-ok/30'
                            : 'bg-blue-sky/40 dark:bg-white/10 text-blue-royal-ink dark:text-sun'
                        }`}
                      >
                        {asset.isTaxFree ? 'Isento IR' : `${asset.defaultAnnualRatePercent.toFixed(2)}% a.a.`}
                      </span>
                    )
                  }))}
                />

                <CustomSelect
                  id="select-institution"
                  value={selectedInstitutionId}
                  onChange={(val) => {
                    setSelectedInstitutionId(val);
                    setCustomRate(undefined);
                  }}
                  size="md"
                  options={INVESTMENT_INSTITUTIONS.map((inst) => {
                    const rate = inst.categoryAssets[selectedAssetId] ?? simulation.asset.defaultAnnualRatePercent;
                    return {
                      value: inst.id,
                      label: inst.name,
                      color: inst.color,
                      description: inst.description,
                      badge: (
                        <span className="text-[11px] px-2 py-0.5 rounded-pill font-bold bg-blue-sky/30 dark:bg-white/10 text-blue-deep dark:text-cream">
                          {rate.toFixed(2)}% a.a.
                        </span>
                      )
                    };
                  })}
                />
              </div>

              {/* Ajuste manual de taxa */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingRate(!isEditingRate)}
                  className="inline-flex items-center gap-1.5 text-blue-royal dark:text-sun font-bold underline hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <Sliders size={13} />
                  <span>{isEditingRate ? 'Usar taxa padrão' : 'Ajustar taxa anual manualmente'}</span>
                </button>
                <span className="font-extrabold text-blue-deep/75 dark:text-cream/75">
                  Taxa ativa: {simulation.effectiveAnnualRatePercent.toFixed(2)}% a.a.
                </span>
              </div>

              {isEditingRate && (
                <div className="p-3.5 rounded-2xl bg-blue-sky/25 dark:bg-white/5 border border-blue-sky/40 space-y-2 mt-2">
                  <label htmlFor="custom-annual-rate" className="block text-xs font-bold">
                    Sua taxa anual estimada (% ao ano):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="custom-annual-rate"
                      type="number"
                      step="0.1"
                      min="1"
                      max="40"
                      value={customRate ?? simulation.effectiveAnnualRatePercent}
                      onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                      className="w-32 min-h-[42px] px-3 rounded-xl bg-white dark:bg-[#0D152D] border border-blue-sky font-bold text-center"
                    />
                    <span className="text-xs font-bold">% ao ano</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bloco 6: Toggle de Reinvestimento (Efeito Bola de Neve) */}
            <div className="pt-6 border-t border-blue-sky/40 dark:border-white/10 flex items-center justify-between gap-4">
              <div>
                <span className="block font-bold text-xs sm:text-sm text-blue-deep dark:text-cream">
                  Reinvestir lucros e dividendos mensais
                </span>
                <span className="block text-xs text-blue-deep/70 dark:text-cream/70 mt-0.5">
                  Ativa o efeito bola de neve (juros sobre juros).
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={reinvestDividends}
                onClick={() => setReinvestDividends(!reinvestDividends)}
                className={`w-14 h-8 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                  reinvestDividends ? 'bg-green-ok' : 'bg-blue-deep/20 dark:bg-white/20'
                }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`w-6 h-6 rounded-full bg-white shadow-md ${
                    reinvestDividends ? 'ml-auto' : 'mr-auto'
                  }`}
                />
              </button>
            </div>
          </Card>
        </div>

        {/* ================= COLUNA DIREITA: RESULTADOS, GANHOS DA DIVERSIFICAÇÃO E GRÁFICOS (6 colunas) ================= */}
        <div className="lg:col-span-6 space-y-7">
          {/* Seletor de Visão de Resultados */}
          <div className="flex items-center justify-between gap-2 p-1.5 bg-white dark:bg-[#152144] rounded-2xl border-2 border-blue-sky/70 dark:border-white/10 shadow-card">
            <button
              type="button"
              onClick={() => setResultTab('diversificacao')}
              className={`flex-1 min-h-[40px] px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                resultTab === 'diversificacao'
                  ? 'bg-blue-royal text-white shadow-soft'
                  : 'text-blue-deep dark:text-cream hover:bg-cream dark:hover:bg-white/10'
              }`}
            >
              <PieIcon size={15} />
              <span>Ganhos da Carteira</span>
            </button>

            <button
              type="button"
              onClick={() => setResultTab('evolucao')}
              className={`flex-1 min-h-[40px] px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                resultTab === 'evolucao'
                  ? 'bg-blue-royal text-white shadow-soft'
                  : 'text-blue-deep dark:text-cream hover:bg-cream dark:hover:bg-white/10'
              }`}
            >
              <TrendingUp size={15} />
              <span>Evolução no Tempo</span>
            </button>

            <button
              type="button"
              onClick={() => setResultTab('ativo_unico')}
              className={`flex-1 min-h-[40px] px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                resultTab === 'ativo_unico'
                  ? 'bg-blue-royal text-white shadow-soft'
                  : 'text-blue-deep dark:text-cream hover:bg-cream dark:hover:bg-white/10'
              }`}
            >
              <Coins size={15} />
              <span>Ativo Único</span>
            </button>
          </div>

          {/* 1. Card de Resultados da Carteira Diversificada */}
          {resultTab === 'diversificacao' && (
            <div className="bg-white dark:bg-[#152144] p-4 sm:p-6 lg:p-7 rounded-card border-2 border-blue-sky/70 dark:border-white/10 shadow-card space-y-4 sm:space-y-5 relative">
              <div className="flex items-center justify-between gap-3 border-b border-blue-sky/40 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-royal to-blue-deep text-white flex items-center justify-center font-extrabold text-sm shadow-xs border border-white/40 shrink-0">
                    <PieIcon size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base truncate">Carteira Diversificada Recomendada</h3>
                    <p className="text-xs text-blue-deep/75 dark:text-cream/75 truncate">
                      Perfil {diversifiedResult.riskLabel} • Taxa: <strong>{diversifiedResult.blendedAnnualRatePercent.toFixed(2)}% a.a.</strong>
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-green-ok/15 text-green-ok border border-green-ok/35 shrink-0">
                  + Rentável
                </span>
              </div>

              {/* Destaque do Montante Final da Carteira */}
              <div className="p-4 sm:p-5 rounded-2xl bg-cream dark:bg-[#0D152D] border-2 border-blue-royal/20 dark:border-white/10 space-y-1 text-center shadow-inner">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-deep/70 dark:text-cream/70 block">
                  Valor Líquido Final da Carteira
                </span>
                <div className="font-serif italic text-2xl sm:text-3xl lg:text-4xl font-extrabold text-blue-royal dark:text-sun">
                  {formatCentsToBRL(diversifiedResult.netFinalCents)}
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-blue-deep/80 dark:text-cream/80 flex items-center justify-center gap-2 pt-0.5">
                  <span>Bruto: {formatCentsToBRL(diversifiedResult.grossFinalCents)}</span>
                  <span className="text-red-soft">(-{formatCentsToBRL(diversifiedResult.totalIncomeTaxCents)} IR est.)</span>
                </div>
              </div>

              {/* Comparativo Triplo: Poupança x Ativo Único x Carteira Diversificada */}
              <div className="space-y-2 pt-1">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                  Comparativo de Ganhos: Por que Diversificar?
                </span>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-cream dark:bg-white/5 border border-blue-sky/40 dark:border-white/10 text-center space-y-0.5 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-blue-deep/70 dark:text-cream/70 block truncate">1. Poupança</span>
                    <span className="font-bold text-xs sm:text-sm block text-blue-deep/80 dark:text-cream/80 truncate">
                      {formatCentsToBRL(diversifiedResult.poupancaFinalCents)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-red-soft block truncate">Perde inflação</span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-blue-sky/20 dark:bg-white/5 border border-blue-sky/50 dark:border-white/10 text-center space-y-0.5 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-blue-royal dark:text-sun block truncate">2. Ativo Único</span>
                    <span className="font-bold text-xs sm:text-sm block text-blue-deep dark:text-cream truncate">
                      {formatCentsToBRL(simulation.netTotalCents)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-blue-deep/60 dark:text-cream/60 block truncate">{simulation.asset.categoryLabel}</span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-green-ok/15 dark:bg-green-ok/25 border-2 border-green-ok/40 text-center space-y-0.5 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-green-ok block truncate">3. Carteira</span>
                    <span className="font-extrabold text-xs sm:text-sm block text-green-ok truncate">
                      {formatCentsToBRL(diversifiedResult.netFinalCents)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-green-ok block truncate">
                      +{formatCentsToBRL(diversifiedResult.poupancaExtraGainCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Renda Passiva Mensal Gerada */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-sun/15 border border-sun/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-sun text-blue-deep flex items-center justify-center shrink-0 border border-orange/40">
                    <Coins size={16} className="text-orange" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-blue-deep dark:text-cream block truncate">
                      Renda Passiva Mensal Estimada
                    </span>
                    <span className="text-[11px] text-blue-deep/75 dark:text-cream/75 block truncate">
                      Pingando todo mês sem mexer no valor guardado.
                    </span>
                  </div>
                </div>

                <div className="font-serif italic text-base sm:text-lg font-extrabold text-blue-royal dark:text-sun shrink-0">
                  +{formatCentsToBRL(diversifiedResult.monthlyPassiveIncomeCents)}/mês
                </div>
              </div>

              {/* Diagnóstico Inteligente: Melhor Cenário para o Momento */}
              <div className="p-4 rounded-xl bg-blue-sky/25 dark:bg-[#15234A] border-2 border-blue-royal/30 dark:border-sun/40 space-y-2">
                <div className="flex items-center gap-2 text-blue-royal dark:text-sun">
                  <Sparkles size={15} className="text-orange dark:text-sun shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-royal dark:text-sun">
                    {diversifiedResult.diagnosis.title}
                  </span>
                </div>
                <h4 className="font-serif italic text-xs sm:text-sm font-bold text-blue-deep dark:text-white leading-tight">
                  {diversifiedResult.diagnosis.headline}
                </h4>
                <p className="text-xs text-blue-deep/90 dark:text-cream leading-relaxed">
                  {diversifiedResult.diagnosis.explanation}
                </p>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-white/10 border border-blue-sky/40 dark:border-white/15 text-[11px] font-bold text-blue-royal-ink dark:text-sun flex items-center gap-2">
                  <Award size={14} className="shrink-0 text-orange dark:text-sun" />
                  <span className="dark:text-cream leading-tight">{diversifiedResult.diagnosis.highlightTip}</span>
                </div>
              </div>

              {/* Gráfico Donut de Alocação da Carteira */}
              <div className="space-y-3 pt-2 border-t border-blue-sky/30 dark:border-white/10">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-blue-royal-ink dark:text-sun">
                  Composição da Sua Carteira Personalizada
                </span>

                <div className="h-44 w-full" aria-label="Gráfico Donut de Alocação">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={diversifiedResult.allocations}
                        dataKey="percentage"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {diversifiedResult.allocations.map((entry) => (
                          <Cell key={entry.category} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {diversifiedResult.allocations.map((item) => (
                    <div
                      key={item.category}
                      className="p-2 rounded-lg bg-cream dark:bg-white/5 border border-blue-sky/40 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="min-w-0">
                          <span className="font-bold truncate block">{item.category}</span>
                          <span className="text-[10px] text-blue-deep/65 dark:text-cream/65 truncate block">
                            {item.highlightAsset}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-blue-royal dark:text-sun block">{item.percentage}%</span>
                        <span className="text-[9px] text-green-ok block">~{item.expectedAnnualRate}% a.a.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Card de Evolução Temporal */}
          {resultTab === 'evolucao' && (
            <Card variant="white" className="space-y-5 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3 border-b border-blue-sky/40 dark:border-white/10 pb-3">
                <h3 className="font-serif italic text-base sm:text-lg font-bold text-blue-royal dark:text-sun flex items-center gap-2">
                  <TrendingUp size={18} />
                  <span>Curva de Crescimento com Juros Compostos</span>
                </h3>
                <span className="text-xs font-bold text-blue-deep/70 dark:text-cream/70">
                  {simulation.totalMonths} meses projetados
                </span>
              </div>

              <div className="h-72 w-full pt-2" aria-label="Gráfico de evolução patrimonial">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartEvolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2346C8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2346C8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E9E6B" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#2E9E6B" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(val) => formatCentsToBRL(Math.round(Number(val) * 100))} />
                    <Area
                      type="monotone"
                      dataKey="investido"
                      name="Total Investido"
                      stroke="#2346C8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorInvestido)"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalBruto"
                      name="Montante com Juros"
                      stroke="#2E9E6B"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3.5 rounded-xl bg-sun/15 border border-sun/30 text-xs text-blue-deep dark:text-cream leading-relaxed">
                💡 <strong>Repare na inclinação da linha verde:</strong> No começo o valor sobe devagar por causa dos seus aportes, mas após o segundo ano o rendimento dos juros começa a ultrapassar o dinheiro do seu bolso. É a bola de neve!
              </div>
            </Card>
          )}

          {/* 3. Card de Ativo Único Específico */}
          {resultTab === 'ativo_unico' && (
            <div className="bg-white dark:bg-[#152144] p-6 sm:p-8 rounded-card border-2 border-blue-sky/70 dark:border-white/10 shadow-card space-y-6 relative">
              <div className="flex items-center justify-between gap-3 border-b border-blue-sky/40 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs border border-white/40 shrink-0"
                    style={{ backgroundColor: simulation.institution.color }}
                  >
                    {simulation.institution.shortName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base sm:text-lg truncate">{simulation.asset.name}</h3>
                    <p className="text-xs text-blue-deep/75 dark:text-cream/75 truncate">
                      {simulation.institution.name} • {simulation.effectiveAnnualRatePercent.toFixed(2)}% a.a.
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold shrink-0 ${
                    simulation.asset.isTaxFree
                      ? 'bg-green-ok/15 text-green-ok border border-green-ok/35'
                      : 'bg-blue-sky/40 dark:bg-white/10 text-blue-royal-ink dark:text-sun'
                  }`}
                >
                  {simulation.asset.isTaxFree ? '100% Isento IR' : `IR: ${simulation.incomeTaxRatePercent}%`}
                </span>
              </div>

              {/* Destaque do Montante Final */}
              <div className="p-6 rounded-2xl bg-cream dark:bg-[#0D152D] border-2 border-blue-royal/20 dark:border-white/10 space-y-2 text-center shadow-inner">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-deep/70 dark:text-cream/70 block">
                  Valor Total no Ativo Único
                </span>
                <div className="font-serif italic text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-royal dark:text-sun">
                  {formatCentsToBRL(simulation.netTotalCents)}
                </div>
                <div className="text-xs font-semibold text-blue-deep/80 dark:text-cream/80 flex items-center justify-center gap-2 pt-1">
                  <span>Bruto: {formatCentsToBRL(simulation.grossTotalCents)}</span>
                  {!simulation.asset.isTaxFree && (
                    <span className="text-red-soft">(-{formatCentsToBRL(simulation.incomeTaxAmountCents)} IR)</span>
                  )}
                </div>
              </div>

              {/* Grid de Métricas */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 sm:p-3 rounded-xl bg-blue-sky/20 dark:bg-white/5 border border-blue-sky/50 dark:border-white/10 space-y-0.5 text-center min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase text-blue-deep/70 dark:text-cream/70 block truncate">Total Investido</span>
                  <span className="font-sans font-extrabold text-xs sm:text-sm block text-blue-deep dark:text-cream truncate">
                    {formatCentsToBRL(simulation.totalInvestedCents)}
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-green-ok/10 dark:bg-green-ok/20 border border-green-ok/30 space-y-0.5 text-center min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase text-green-ok block truncate">Juros Ganhos</span>
                  <span className="font-sans font-extrabold text-xs sm:text-sm block text-green-ok truncate">
                    +{formatCentsToBRL(simulation.netInterestCents)}
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-sun/20 dark:bg-sun/10 border border-sun/40 space-y-0.5 text-center min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase text-orange dark:text-sun block truncate">Renda Mensal</span>
                  <span className="font-sans font-extrabold text-xs sm:text-sm block text-blue-deep dark:text-cream truncate">
                    {formatCentsToBRL(simulation.finalEstimatedMonthlyPassiveIncomeCents)}
                  </span>
                </div>
              </div>

              {/* Recomendação de Melhor Escolha */}
              <div className="p-4 sm:p-5 rounded-2xl bg-sun/20 dark:bg-[#18254D] border-2 border-orange/50 dark:border-sun/50 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Award size={18} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-orange dark:text-sun px-2 py-0.5 rounded-md bg-white/70 dark:bg-white/10">
                    {bestRecommendation.highlightTag}
                  </span>
                </div>
                <h4 className="font-bold text-base text-blue-deep dark:text-white">{bestRecommendation.title}</h4>
                <p className="text-xs sm:text-sm text-blue-deep/90 dark:text-[#FFFDF5] leading-relaxed">{bestRecommendation.reason}</p>
              </div>
            </div>
          )}

          {/* Card de Progresso do Modo Meta (se ativo) */}
          {activeMode === 'meta' && (
            <div className="bg-white dark:bg-[#152144] p-5 sm:p-6 rounded-card border-2 border-orange/60 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-orange">
                <Target size={18} />
                <span className="text-xs font-extrabold uppercase tracking-wider">Status da Sua Meta</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Alvo: {formatCentsToBRL(goalCents)}</span>
                <span className="text-orange">{goalResult.progressPercent}% concluído</span>
              </div>
              <div className="w-full h-3 rounded-full bg-cream dark:bg-[#0D152D] overflow-hidden border border-blue-sky/50">
                <div
                  className="h-full bg-orange transition-all duration-500 rounded-full"
                  style={{ width: `${goalResult.progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-blue-deep/80 dark:text-cream/80">
                {goalTargetOption === 'months_needed'
                  ? `Com os aportes de ${formatCentsToBRL(monthlyCents)}/mês, você atinge o objetivo em aproximadamente ${goalResult.estimatedMonthsToGoal} meses (${goalResult.estimatedYearsToGoal} anos).`
                  : `Para atingir o objetivo no prazo fixo de ${simulation.totalMonths} meses, guarde aproximadamente ${formatCentsToBRL(goalResult.suggestedMonthlyContributionCents)} todo mês.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. SEÇÃO: Dicas de Ações & FIIs para Investir no Momento (Método B.E.S.T.) */}
      <section className="bg-white dark:bg-[#152144] p-4 sm:p-6 lg:p-7 rounded-card border-2 border-blue-sky/70 dark:border-white/10 shadow-card space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-sky/40 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-blue-royal to-blue-deep text-white flex items-center justify-center shadow-xs shrink-0">
              <Landmark size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="title-section text-blue-royal dark:text-sun truncate">
                Dicas de Ações & FIIs para o Momento
              </h2>
              <p className="text-xs sm:text-sm text-blue-deep/75 dark:text-cream/75 truncate mt-0.5">
                Setores perenes do método de dividendos (B.E.S.T.) com empresas à prova de crises.
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-royal/15 text-blue-royal dark:text-sun border border-blue-royal/30 shrink-0">
            Foco em Renda Passiva
          </span>
        </div>

        {/* Abas dos Setores */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {SECTOR_STOCK_TIPS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSelectedSectorId(sec.id)}
              className={`min-h-[38px] px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSectorId === sec.id
                  ? 'bg-blue-royal text-white shadow-soft scale-105'
                  : 'bg-cream dark:bg-[#0D152D] text-blue-deep dark:text-cream border border-blue-sky/60 hover:bg-blue-sky/30'
              }`}
            >
              {sec.icon === 'zap' && <Zap size={13} className="text-orange" />}
              {sec.icon === 'landmark' && <Landmark size={13} className="text-sun" />}
              {sec.icon === 'shield' && <Shield size={13} className="text-green-ok" />}
              {sec.icon === 'building' && <Building2 size={13} className="text-orange" />}
              {sec.icon === 'droplet' && <Droplets size={13} className="text-blue-sky" />}
              <span>{sec.sectorName.split('(')[0].trim()}</span>
            </button>
          ))}
        </div>

        {/* Card do Setor Selecionado */}
        <div className="p-4 sm:p-5 rounded-2xl bg-cream dark:bg-[#0D152D] border-2 border-blue-royal/20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-orange dark:text-sun block truncate">
                {activeSectorTip.categoryLabel} • Perfil: {activeSectorTip.idealProfile}
              </span>
              <h3 className="font-serif italic text-base sm:text-lg font-bold text-blue-royal dark:text-sun truncate">
                {activeSectorTip.sectorName}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-sky/40 dark:bg-white/10 text-blue-royal-ink dark:text-sun border border-blue-sky/50 shrink-0">
              {activeSectorTip.tag}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-blue-deep/90 dark:text-cream leading-relaxed">
            {activeSectorTip.whyInvestText}
          </p>

          {/* Explicação em Linguagem Fácil (Como uma criança entende) */}
          <div className="p-3 rounded-xl bg-sun/15 border border-sun/40 text-xs text-blue-deep dark:text-cream flex items-start gap-2.5">
            <span className="text-lg shrink-0">👶</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-orange dark:text-sun block truncate">Explicando como se você tivesse 10 anos:</span>
              <p className="leading-relaxed">{activeSectorTip.childLanguageExplanation}</p>
            </div>
          </div>

          {/* Exemplos de Tickers Reais na B3 */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-extrabold uppercase text-blue-royal-ink dark:text-sun block">
              Exemplos de Ativos mais Negociados no Brasil:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
              {activeSectorTip.examples.map((ex) => (
                <div
                  key={ex.ticker}
                  className="p-3 rounded-xl bg-white dark:bg-[#152144] border-2 border-blue-sky/60 dark:border-white/10 space-y-1 shadow-xs min-w-0"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-extrabold text-xs sm:text-sm text-blue-royal dark:text-sun px-2 py-0.5 rounded-md bg-blue-sky/20 dark:bg-white/10">
                      {ex.ticker}
                    </span>
                    <span className="text-[10px] font-bold text-green-ok">Bolsa B3</span>
                  </div>
                  <h4 className="font-bold text-xs text-blue-deep dark:text-cream leading-tight truncate">{ex.companyName}</h4>
                  <p className="text-[11px] text-blue-deep/70 dark:text-cream/70 leading-snug">{ex.highlight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODAL 1: CENÁRIO MUNDIAL & JURUS (FED, BACEN, CICLOS DA ECONOMIA)
         ========================================================================= */}
      <AnimatePresence>
        {isGlobalScenarioOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cenário Mundial de Taxas de Juros"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-cream dark:bg-[#0D152D] rounded-card-lg border-2 border-blue-royal p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3 border-b border-blue-sky/60 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-royal text-white flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif italic text-lg sm:text-xl font-bold text-blue-royal dark:text-sun">
                      Como o Cenário Mundial Afeta o Seu Dinheiro?
                    </h3>
                    <p className="text-xs text-blue-deep/75 dark:text-cream/75">
                      Conexão entre o Banco Central Americano (Fed) e a Selic no Brasil
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGlobalScenarioOpen(false)}
                  className="w-8 h-8 rounded-full bg-white dark:bg-white/10 text-blue-deep dark:text-cream flex items-center justify-center hover:bg-blue-sky/40 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-blue-deep/90 dark:text-cream/90 leading-relaxed">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#152144] border border-blue-sky/50 space-y-2">
                  <h4 className="font-bold text-blue-royal dark:text-sun flex items-center gap-1.5">
                    <span>1. O Chefe Global dos Juros: O FED nos EUA 🇺🇸</span>
                  </h4>
                  <p>
                    O Federal Reserve (FED) é o banco central dos Estados Unidos. Quando os juros americanos sobem, investidores do mundo inteiro preferem tirar dinheiro de países emergentes e aplicar nos títulos do tesouro americano, que são os mais seguros do planeta em dólar.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#152144] border border-blue-sky/50 space-y-2">
                  <h4 className="font-bold text-blue-royal dark:text-sun flex items-center gap-1.5">
                    <span>2. Por que o Brasil mantém a Selic Alta? 🇧🇷</span>
                  </h4>
                  <p>
                    Para evitar que o dólar dispare e cause inflação nas coisas do dia a dia (combustível, trigo, eletrônicos), o Banco Central do Brasil precisa oferecer uma taxa Selic atrativa. Juros de 10% a 11% ao ano pagam um prêmio excelente para quem poupa no Brasil!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#152144] border border-blue-sky/50 space-y-2">
                  <h4 className="font-bold text-blue-royal dark:text-sun flex items-center gap-1.5">
                    <span>3. O Ciclo do Pêndulo Financeiro 🔄</span>
                  </h4>
                  <p>
                    • <strong>Quando os juros sobem:</strong> A Renda Fixa (Tesouro Selic, CDBs, 99Pay) é a rainha do mercado, pagando muito com risco zero.<br />
                    • <strong>Quando os juros começam a cair:</strong> A Renda Fixa passa a render menos e as pessoas migram para a Bolsa e Imóveis. As cotas de FIIs e as Ações valorizam rapidamente. Quem comprou antes da queda ganha em dobro!
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-sun/20 border border-orange/40 text-xs text-blue-deep dark:text-cream flex items-start gap-2">
                  <Sparkles size={16} className="text-orange shrink-0 mt-0.5" />
                  <span>
                    <strong>Estratégia do LibertyBag:</strong> A carteira diversificada mantém você protegido nos dois cenários: se os juros subirem, sua renda fixa rende mais; se os juros caírem, seus FIIs e ações decolam!
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsGlobalScenarioOpen(false)}
                  className="w-full min-h-[44px] rounded-pill bg-blue-royal hover:bg-blue-deep text-white font-bold text-sm shadow-soft transition-all cursor-pointer"
                >
                  Entendi o Cenário Mundial
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL 2: GUIA FÁCIL — APRENDA A INVESTIR (LINGUAGEM PARA QUALQUER UM)
         ========================================================================= */}
      <AnimatePresence>
        {isLearningGuideOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Guia de Investimentos Sem Complicação"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-cream dark:bg-[#0D152D] rounded-card-lg border-2 border-sun p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3 border-b border-blue-sky/60 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sun text-blue-deep flex items-center justify-center">
                    <BookOpen size={20} className="text-orange" />
                  </div>
                  <div>
                    <h3 className="font-serif italic text-lg sm:text-xl font-bold text-blue-royal dark:text-sun">
                      Aprenda a Investir Sem Medo (Linguagem Fácil)
                    </h3>
                    <p className="text-xs text-blue-deep/75 dark:text-cream/75">
                      Explicações simples e divertidas que até uma criança de 10 anos entende!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLearningGuideOpen(false)}
                  className="w-8 h-8 rounded-full bg-white dark:bg-white/10 text-blue-deep dark:text-cream flex items-center justify-center hover:bg-blue-sky/40 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Lista dos Cards Didáticos */}
              <div className="space-y-4">
                {SIMPLE_INVESTMENT_GUIDE.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#152144] border-2 border-blue-sky/50 dark:border-white/10 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{card.emoji}</span>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-orange dark:text-sun block">
                          {card.childAnalogyTitle}
                        </span>
                        <h4 className="font-serif italic text-sm sm:text-base font-bold text-blue-royal dark:text-sun">
                          {card.title}
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-blue-deep/90 dark:text-cream/90 leading-relaxed whitespace-pre-line">
                      {card.simpleExplanation}
                    </p>

                    <div className="pt-1.5 flex items-start gap-2 text-xs font-bold text-green-ok">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      <span>{card.goldenRule}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsLearningGuideOpen(false)}
                  className="w-full min-h-[44px] rounded-pill bg-blue-royal hover:bg-blue-deep text-white font-bold text-sm shadow-soft transition-all cursor-pointer"
                >
                  Fechar Guia e Começar a Simular
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
