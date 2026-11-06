/**
 * Serviço de Simulação de Investimentos — LibertyBag (Fase 4)
 * 
 * Regras financeiras e cálculos precisos de juros compostos, Imposto de Renda regressivo,
 * ativos brasileiros (Tesouro Direto, CDB, LCI/LCA, FIIs, Ações e Poupança),
 * modo meta financeira invertida, diversificação recomendada e gráficos de evolução.
 */

export type InvestmentCategory =
  | 'tesouro'
  | 'cdb'
  | 'lci_lca'
  | 'fii'
  | 'acoes'
  | 'poupanca';

export type PeriodUnit = 'days' | 'months' | 'years';

export interface InvestmentAsset {
  id: string;
  name: string;
  category: InvestmentCategory;
  categoryLabel: string;
  defaultAnnualRatePercent: number; // Taxa de rentabilidade estimada anual (% a.a.)
  isTaxFree: boolean; // Isento de Imposto de Renda (ex: LCI, LCA, proventos FIIs, Poupança)
  riskLevel: 'baixo' | 'medio' | 'moderado' | 'alto';
  liquidity: string;
  description: string;
}

export interface InvestmentInstitution {
  id: string;
  name: string;
  shortName: string;
  color: string;
  accentBg: string;
  categoryAssets: Record<string, number>; // assetId -> taxa anual oferecida (% a.a.)
  description: string;
  badge?: string;
}

// Taxas de referência do mercado brasileiro (Benchmark)
export const MARKET_BENCHMARKS = {
  selicAnnualPercent: 10.75,
  cdiAnnualPercent: 10.65,
  ipcaAnnualPercent: 4.0,
  poupancaAnnualPercent: 6.5
};

// Catálogo de Ativos Disponíveis para Simulação
export const INVESTMENT_ASSETS: InvestmentAsset[] = [
  {
    id: 'tesouro_selic',
    name: 'Tesouro Selic (100% Selic)',
    category: 'tesouro',
    categoryLabel: 'Tesouro Direto',
    defaultAnnualRatePercent: 10.75,
    isTaxFree: false,
    riskLevel: 'baixo',
    liquidity: 'Diária (D+1)',
    description: 'Título público soberano com liquidez diária, ideal para reserva de emergência e curto prazo.'
  },
  {
    id: 'tesouro_ipca',
    name: 'Tesouro IPCA+ (IPCA + 6.45%)',
    category: 'tesouro',
    categoryLabel: 'Tesouro Direto',
    defaultAnnualRatePercent: 10.45,
    isTaxFree: false,
    riskLevel: 'baixo',
    liquidity: 'No vencimento',
    description: 'Garante rendimento sempre acima da inflação, preservando o poder de compra no médio e longo prazo.'
  },
  {
    id: 'tesouro_prefixado',
    name: 'Tesouro Prefixado',
    category: 'tesouro',
    categoryLabel: 'Tesouro Direto',
    defaultAnnualRatePercent: 11.85,
    isTaxFree: false,
    riskLevel: 'baixo',
    liquidity: 'No vencimento',
    description: 'Taxa fixa pré-determinada, você sabe exatamente quanto vai receber se mantiver até o vencimento.'
  },
  {
    id: 'cdb_100',
    name: 'CDB 100% do CDI',
    category: 'cdb',
    categoryLabel: 'CDB',
    defaultAnnualRatePercent: 10.65,
    isTaxFree: false,
    riskLevel: 'baixo',
    liquidity: 'Diária',
    description: 'Protegido pelo FGC até R$ 250 mil por CPF. Paga exatamente 100% do CDI com resgate rápido.'
  },
  {
    id: 'cdb_115',
    name: 'CDB 115% do CDI',
    category: 'cdb',
    categoryLabel: 'CDB',
    defaultAnnualRatePercent: 12.25,
    isTaxFree: false,
    riskLevel: 'baixo',
    liquidity: '1 a 2 anos',
    description: 'Rentabilidade turbinada para quem pode deixar o dinheiro investido por 1 a 2 anos com FGC.'
  },
  {
    id: 'cdb_120',
    name: 'CDB 120% do CDI',
    category: 'cdb',
    categoryLabel: 'CDB',
    defaultAnnualRatePercent: 12.78,
    isTaxFree: false,
    riskLevel: 'baixo',
    liquidity: '2 a 3 anos',
    description: 'Alta taxa de renda fixa com garantia FGC para metas e projetos com prazo estipulado de 2 a 3 anos.'
  },
  {
    id: 'lci_lca_90',
    name: 'LCI / LCA 90% do CDI (Isento de IR)',
    category: 'lci_lca',
    categoryLabel: 'LCI & LCA',
    defaultAnnualRatePercent: 9.58,
    isTaxFree: true,
    riskLevel: 'baixo',
    liquidity: '9 meses a 2 anos',
    description: 'Isento de Imposto de Renda! Equivale a um CDB tradicional de aproximadamente 11.6% ao ano.'
  },
  {
    id: 'lci_lca_95',
    name: 'LCI / LCA 95% do CDI (Isento de IR)',
    category: 'lci_lca',
    categoryLabel: 'LCI & LCA',
    defaultAnnualRatePercent: 10.12,
    isTaxFree: true,
    riskLevel: 'baixo',
    liquidity: '1 a 3 anos',
    description: 'Sem nenhum desconto de IR e com proteção do FGC. Equivale a um CDB de ~12.2% a.a.'
  },
  {
    id: 'fii_dividendos',
    name: 'Fundos Imobiliários (FIIs)',
    category: 'fii',
    categoryLabel: 'Fundos Imobiliários',
    defaultAnnualRatePercent: 9.80,
    isTaxFree: true,
    riskLevel: 'moderado',
    liquidity: 'Cotas em Bolsa (D+2)',
    description: 'Renda passiva mensal de aluguéis isenta de IR na sua conta, com diversificação em galpões, shoppings e lajes corporativas.'
  },
  {
    id: 'acoes_dividendos',
    name: 'Ações de Dividendos & Valorização',
    category: 'acoes',
    categoryLabel: 'Ações',
    defaultAnnualRatePercent: 11.50,
    isTaxFree: false,
    riskLevel: 'alto',
    liquidity: 'Mercado à vista (D+2)',
    description: 'Participação nos lucros das maiores empresas brasileiras (bancos, saneamento, energia e commodities).'
  },
  {
    id: '99pay_saldo',
    name: 'Saldo 99Pay (110% do CDI)',
    category: 'cdb',
    categoryLabel: 'Conta Remunerada',
    defaultAnnualRatePercent: 11.72,
    isTaxFree: false,
    riskLevel: 'baixo',
    liquidity: 'Imediata 24/7 (Pix)',
    description: 'Rendimento automático de 110% do CDI no saldo com saque instantâneo via Pix a qualquer hora sem carência.'
  },
  {
    id: 'poupanca',
    name: 'Poupança Tradicional',
    category: 'poupanca',
    categoryLabel: 'Poupança',
    defaultAnnualRatePercent: 6.50,
    isTaxFree: true,
    riskLevel: 'baixo',
    liquidity: 'Aniversário da conta',
    description: 'Aplicações antigas com rendimento muito inferior à inflação e à Selic. Ideal para comparar perdas.'
  }
];

// Instituições Financeiras e Corretoras Brasileiras
export const INVESTMENT_INSTITUTIONS: InvestmentInstitution[] = [
  {
    id: '99pay',
    name: '99Pay',
    shortName: '99Pay',
    color: '#FFCC00',
    accentBg: '#FFFDF0',
    description: 'Rendimento automático de 110% do CDI no saldo da carteira digital com liquidez imediata 24h via Pix.',
    badge: '110% CDI Imediato',
    categoryAssets: {
      '99pay_saldo': 11.72,
      cdb_100: 11.72,
      tesouro_selic: 10.75,
      fii_dividendos: 9.70,
      acoes_dividendos: 11.30
    }
  },
  {
    id: 'inter',
    name: 'Banco Inter',
    shortName: 'Inter',
    color: '#FF7A00',
    accentBg: '#FFF2E8',
    description: 'Plataforma completa de investimentos sem corretagem, com LCI isenta e Tesouro Direto.',
    badge: 'Destaque LCI Isenta',
    categoryAssets: {
      lci_lca_90: 9.65,
      lci_lca_95: 10.18,
      cdb_100: 10.65,
      cdb_115: 12.15,
      tesouro_selic: 10.75,
      tesouro_ipca: 10.45,
      fii_dividendos: 9.90,
      acoes_dividendos: 11.60
    }
  },
  {
    id: 'xp',
    name: 'XP Investimentos',
    shortName: 'XP',
    color: '#000000',
    accentBg: '#F2F2F2',
    description: 'Maior corretora do país com o maior leque de CDBs de bancos médios de até 120% CDI.',
    badge: 'CDBs até 120% CDI',
    categoryAssets: {
      cdb_100: 10.65,
      cdb_115: 12.35,
      cdb_120: 12.85,
      lci_lca_90: 9.60,
      tesouro_selic: 10.75,
      tesouro_ipca: 10.45,
      tesouro_prefixado: 11.90,
      fii_dividendos: 9.85,
      acoes_dividendos: 11.55
    }
  },
  {
    id: 'nubank',
    name: 'Nubank (Nu / NuInvest)',
    shortName: 'Nubank',
    color: '#8A05BE',
    accentBg: '#F5E8FB',
    description: 'Caixinhas com rendimento automático de 100% do CDI e CDBs de liquidez diária.',
    badge: 'Facilidade no App',
    categoryAssets: {
      cdb_100: 10.65,
      cdb_115: 12.05,
      tesouro_selic: 10.75,
      tesouro_ipca: 10.45,
      fii_dividendos: 9.75,
      acoes_dividendos: 11.40
    }
  },
  {
    id: 'btg',
    name: 'BTG Pactual',
    shortName: 'BTG',
    color: '#0A2540',
    accentBg: '#EAF0F6',
    description: 'Maior banco de investimentos da América Latina, com assessoria e títulos de renda fixa de ponta.',
    badge: 'Grau Institucional',
    categoryAssets: {
      cdb_100: 10.65,
      cdb_115: 12.30,
      cdb_120: 12.80,
      lci_lca_90: 9.62,
      tesouro_selic: 10.75,
      tesouro_ipca: 10.50,
      fii_dividendos: 9.95,
      acoes_dividendos: 11.70
    }
  },
  {
    id: 'picpay',
    name: 'PicPay',
    shortName: 'PicPay',
    color: '#11C76F',
    accentBg: '#E8FAF1',
    description: 'Cofrinhos digitais com rendimento de 102% do CDI garantidos pelo FGC e resgate rápido.',
    badge: '102% CDI Diário',
    categoryAssets: {
      cdb_100: 10.86, // 102% do CDI
      cdb_115: 12.10,
      tesouro_selic: 10.75
    }
  },
  {
    id: 'tesouro_oficial',
    name: 'Tesouro Direto (B3 Oficial)',
    shortName: 'Tesouro',
    color: '#2346C8',
    accentBg: '#E9EFFC',
    description: 'Programa oficial do Tesouro Nacional e B3 com taxa zero de custódia até R$ 10.000.',
    badge: 'Risco Soberano',
    categoryAssets: {
      tesouro_selic: 10.75,
      tesouro_ipca: 10.45,
      tesouro_prefixado: 11.85
    }
  },
  {
    id: 'itau',
    name: 'Itaú Unibanco (Íon)',
    shortName: 'Itaú',
    color: '#EC7000',
    accentBg: '#FFF2E8',
    description: 'Segurança do maior banco tradicional do Brasil com app Íon para renda fixa e ações.',
    badge: 'Solidez Tradicional',
    categoryAssets: {
      cdb_100: 10.65,
      cdb_115: 11.90,
      tesouro_selic: 10.75,
      tesouro_ipca: 10.45,
      poupanca: 6.50
    }
  }
];

export interface SimulationParams {
  initialAmountCents: number;
  monthlyContributionCents: number;
  periodValue: number;
  periodUnit: PeriodUnit;
  reinvestDividends: boolean;
  assetId: string;
  institutionId: string;
  customAnnualRatePercent?: number;
}

export interface MonthSimulationPoint {
  month: number;
  investedTotalCents: number;
  interestGrossTotalCents: number;
  grossBalanceCents: number;
  monthlyInterestEarnedCents: number;
}

export interface SimulationResult {
  params: SimulationParams;
  asset: InvestmentAsset;
  institution: InvestmentInstitution;
  effectiveAnnualRatePercent: number;
  effectiveMonthlyRatePercent: number;
  totalMonths: number;
  totalDays: number;
  totalInvestedCents: number;
  grossInterestCents: number;
  grossTotalCents: number;
  incomeTaxRatePercent: number;
  incomeTaxAmountCents: number;
  netInterestCents: number;
  netTotalCents: number;
  finalEstimatedMonthlyPassiveIncomeCents: number;
  savingsVsPoupancaCents: number;
  timeline: MonthSimulationPoint[];
}

export interface GoalModeParams {
  targetGoalCents: number;
  initialAmountCents: number;
  monthlyContributionCents: number;
  targetMonths?: number;
  effectiveAnnualRatePercent: number;
}

export interface GoalModeResult {
  targetGoalCents: number;
  initialAmountCents: number;
  // Opção A: Tempo necessário com o aporte mensal atual
  estimatedMonthsToGoal: number;
  estimatedYearsToGoal: number;
  // Opção B: Aporte mensal necessário para bater a meta no tempo estipulado
  suggestedMonthlyContributionCents: number;
  progressPercent: number;
}

export type RiskProfile = 'leve' | 'moderado' | 'alto';
export type LiquidityPreference = 'qualquer_momento' | 'prazo_fixo';

export interface PortfolioAllocationItem {
  id?: string;
  category: string;
  percentage: number;
  color: string;
  description: string;
  expectedAnnualRate?: number;
  liquidity?: string;
  isTaxFree?: boolean;
  highlightAsset?: string;
}

export interface DiversifiedPortfolioParams {
  initialAmountCents: number;
  monthlyContributionCents: number;
  periodMonths: number;
  riskProfile: RiskProfile;
  liquidityPreference: LiquidityPreference;
  reinvestDividends?: boolean;
}

export interface DiversifiedPortfolioResult {
  allocations: PortfolioAllocationItem[];
  blendedAnnualRatePercent: number;
  totalInvestedCents: number;
  grossFinalCents: number;
  netFinalCents: number;
  totalInterestGrossCents: number;
  totalInterestNetCents: number;
  totalIncomeTaxCents: number;
  monthlyPassiveIncomeCents: number;
  poupancaFinalCents: number;
  poupancaExtraGainCents: number;
  timeline: MonthSimulationPoint[];
  riskLabel: string;
  riskDescription: string;
  liquidityDescription: string;
  diagnosis: {
    title: string;
    headline: string;
    explanation: string;
    highlightTip: string;
  };
}

/**
 * Converte qualquer período em dias e meses inteiros
 */
export function convertPeriodToTimeUnits(value: number, unit: PeriodUnit): { months: number; days: number } {
  const safeVal = Math.max(1, Math.round(value));
  switch (unit) {
    case 'days':
      return {
        months: Math.max(1, Math.round(safeVal / 30)),
        days: safeVal
      };
    case 'months':
      return {
        months: safeVal,
        days: safeVal * 30
      };
    case 'years':
      return {
        months: safeVal * 12,
        days: safeVal * 365
      };
  }
}

/**
 * Alíquota regressiva do Imposto de Renda brasileiro para Renda Fixa
 */
export function getIncomeTaxRatePercent(days: number, isTaxFree: boolean): number {
  if (isTaxFree) return 0;
  if (days <= 180) return 22.5;
  if (days <= 360) return 20.0;
  if (days <= 720) return 17.5;
  return 15.0;
}

/**
 * Retorna a alíquota de IR decimal (ex: 0.15 para 15%)
 */
export function getIncomeTaxRate(days: number): number {
  return getIncomeTaxRatePercent(days, false) / 100;
}

/**
 * Converte taxa anual em taxa mensal composta
 * i_m = (1 + i_a)^(1/12) - 1
 */
export function annualRateToMonthlyRate(annualRatePercent: number): number {
  const iAnnual = annualRatePercent / 100;
  return Math.pow(1 + iAnnual, 1 / 12) - 1;
}

/**
 * Motor Principal de Simulação de Investimento
 */
export function calculateInvestmentSimulation(params: SimulationParams): SimulationResult {
  const asset =
    INVESTMENT_ASSETS.find((a) => a.id === params.assetId) || INVESTMENT_ASSETS[0];
  const institution =
    INVESTMENT_INSTITUTIONS.find((i) => i.id === params.institutionId) ||
    INVESTMENT_INSTITUTIONS[0];

  const { months: totalMonths, days: totalDays } = convertPeriodToTimeUnits(
    params.periodValue,
    params.periodUnit
  );

  // Obtém a taxa anual efetiva (customizada ou ofertada pela instituição ou padrão do ativo)
  const annualRate =
    params.customAnnualRatePercent !== undefined && params.customAnnualRatePercent > 0
      ? params.customAnnualRatePercent
      : institution.categoryAssets[asset.id] ?? asset.defaultAnnualRatePercent;

  const monthlyRate = annualRateToMonthlyRate(annualRate);
  const initial = Math.max(0, params.initialAmountCents);
  const monthlyAporte = Math.max(0, params.monthlyContributionCents);

  let currentBalance = initial;
  let totalInvested = initial;
  let totalGrossInterest = 0;

  const timeline: MonthSimulationPoint[] = [];

  // Ponto inicial (Mês 0)
  timeline.push({
    month: 0,
    investedTotalCents: initial,
    interestGrossTotalCents: 0,
    grossBalanceCents: initial,
    monthlyInterestEarnedCents: 0
  });

  for (let m = 1; m <= totalMonths; m++) {
    // Rendimento do mês sobre o saldo anterior
    const interestEarned = Math.round(currentBalance * monthlyRate);
    totalGrossInterest += interestEarned;

    if (params.reinvestDividends) {
      // Juros compostos com reinversão de rendimentos
      currentBalance += interestEarned + monthlyAporte;
    } else {
      // Rendimentos sacados mensalmente (crescimento apenas dos aportes)
      currentBalance += monthlyAporte;
    }

    totalInvested += monthlyAporte;

    timeline.push({
      month: m,
      investedTotalCents: totalInvested,
      interestGrossTotalCents: totalGrossInterest,
      grossBalanceCents: params.reinvestDividends ? currentBalance : totalInvested + totalGrossInterest,
      monthlyInterestEarnedCents: interestEarned
    });
  }

  const grossTotal = params.reinvestDividends ? currentBalance : totalInvested + totalGrossInterest;
  const taxRate = getIncomeTaxRatePercent(totalDays, asset.isTaxFree);
  const taxAmount = Math.round((totalGrossInterest * taxRate) / 100);
  const netInterest = Math.max(0, totalGrossInterest - taxAmount);
  const netTotal = totalInvested + netInterest;

  // Renda passiva mensal estimada gerada ao final sobre o montante líquido
  const finalEstimatedMonthlyPassiveIncome = Math.round(netTotal * monthlyRate);

  // Cálculo comparativo com a Poupança Tradicional (6.5% a.a.)
  const poupancaMonthlyRate = annualRateToMonthlyRate(MARKET_BENCHMARKS.poupancaAnnualPercent);
  let poupancaBalance = initial;
  for (let m = 1; m <= totalMonths; m++) {
    const pInterest = Math.round(poupancaBalance * poupancaMonthlyRate);
    poupancaBalance += pInterest + monthlyAporte;
  }
  const savingsVsPoupanca = Math.max(0, netTotal - poupancaBalance);

  return {
    params,
    asset,
    institution,
    effectiveAnnualRatePercent: annualRate,
    effectiveMonthlyRatePercent: monthlyRate * 100,
    totalMonths,
    totalDays,
    totalInvestedCents: totalInvested,
    grossInterestCents: totalGrossInterest,
    grossTotalCents: grossTotal,
    incomeTaxRatePercent: taxRate,
    incomeTaxAmountCents: taxAmount,
    netInterestCents: netInterest,
    netTotalCents: netTotal,
    finalEstimatedMonthlyPassiveIncomeCents: finalEstimatedMonthlyPassiveIncome,
    savingsVsPoupancaCents: savingsVsPoupanca,
    timeline
  };
}

/**
 * Cálculo Invertido do Modo Meta Financeira
 */
export function calculateGoalMode(params: GoalModeParams): GoalModeResult {
  const target = Math.max(1, params.targetGoalCents);
  const initial = Math.max(0, params.initialAmountCents);
  const aporte = Math.max(0, params.monthlyContributionCents);
  const iMonthly = annualRateToMonthlyRate(params.effectiveAnnualRatePercent);

  const progressPercent = Math.min(100, Math.round((initial / target) * 100));

  // Opção A: Quantos meses para bater a meta com o aporte atual
  let estimatedMonths = 0;
  if (initial >= target) {
    estimatedMonths = 0;
  } else if (iMonthly <= 0 && aporte <= 0) {
    estimatedMonths = 999;
  } else if (aporte === 0) {
    // Apenas rendimento do valor inicial: target = initial * (1 + i)^n
    estimatedMonths = Math.ceil(Math.log(target / Math.max(1, initial)) / Math.log(1 + iMonthly));
  } else {
    // Anuidade composta: target = initial*(1+i)^n + aporte * [((1+i)^n - 1) / i]
    // (target * i + aporte) = (initial * i + aporte) * (1+i)^n
    const numerator = target * iMonthly + aporte;
    const denominator = initial * iMonthly + aporte;
    if (denominator > 0 && numerator > denominator) {
      estimatedMonths = Math.ceil(Math.log(numerator / denominator) / Math.log(1 + iMonthly));
    } else {
      estimatedMonths = Math.ceil((target - initial) / Math.max(1, aporte));
    }
  }

  // Opção B: Aporte mensal necessário para o prazo alvo estipulado
  const targetMonths = params.targetMonths && params.targetMonths > 0 ? params.targetMonths : 12;
  let suggestedAporte = 0;
  if (initial >= target) {
    suggestedAporte = 0;
  } else {
    const futureValueOfInitial = initial * Math.pow(1 + iMonthly, targetMonths);
    const remainingToFund = Math.max(0, target - futureValueOfInitial);
    if (iMonthly <= 0) {
      suggestedAporte = Math.round(remainingToFund / targetMonths);
    } else {
      const annuityFactor = (Math.pow(1 + iMonthly, targetMonths) - 1) / iMonthly;
      suggestedAporte = Math.round(remainingToFund / annuityFactor);
    }
  }

  return {
    targetGoalCents: target,
    initialAmountCents: initial,
    estimatedMonthsToGoal: Math.max(0, estimatedMonths),
    estimatedYearsToGoal: Number((estimatedMonths / 12).toFixed(1)),
    suggestedMonthlyContributionCents: Math.max(0, suggestedAporte),
    progressPercent
  };
}

/**
 * Recomendação Inteligente de Melhor Ativo / Instituição
 */
export function getBestInvestmentRecommendation(
  periodMonths: number,
  isGoalMode = false
): {
  recommendedAsset: InvestmentAsset;
  recommendedInstitution: InvestmentInstitution;
  title: string;
  reason: string;
  highlightTag: string;
} {
  const goalPrefix = isGoalMode ? 'Estratégia para sua meta: ' : '';
  if (periodMonths <= 12) {
    // Curto Prazo (até 1 ano): Foco em Liquidez e Isenção de IR de curto prazo
    const lciAsset = INVESTMENT_ASSETS.find((a) => a.id === 'lci_lca_90')!;
    const interInst = INVESTMENT_INSTITUTIONS.find((i) => i.id === 'inter')!;
    return {
      recommendedAsset: lciAsset,
      recommendedInstitution: interInst,
      title: `${goalPrefix}LCI 90% do CDI do Banco Inter (Isenta de IR)`,
      reason:
        'Para prazos curtos (até 12 meses), o Imposto de Renda da renda fixa tradicional cobra alíquota pesada de 20% a 22.5%. A LCI é 100% isenta e entrega rentabilidade líquida superior ao CDB!',
      highlightTag: 'Melhor Escolha para Curto Prazo'
    };
  } else if (periodMonths <= 36) {
    // Médio Prazo (1 a 3 anos): CDB 120% do CDI da XP ou FIIs
    const cdbAsset = INVESTMENT_ASSETS.find((a) => a.id === 'cdb_120')!;
    const xpInst = INVESTMENT_INSTITUTIONS.find((i) => i.id === 'xp')!;
    return {
      recommendedAsset: cdbAsset,
      recommendedInstitution: xpInst,
      title: `${goalPrefix}CDB 120% do CDI da XP Investimentos`,
      reason:
        'Com prazo de 2 a 3 anos, o Imposto de Renda cai para a alíquota mínima de 15%. A taxa robusta de 120% do CDI (~12.8% a.a.) com garantia FGC supera com folga os concorrentes.',
      highlightTag: 'Máxima Rentabilidade Segura'
    };
  } else {
    // Longo Prazo (> 3 anos): Tesouro IPCA+ ou Fundos Imobiliários
    const ipcaAsset = INVESTMENT_ASSETS.find((a) => a.id === 'tesouro_ipca')!;
    const tesouroInst = INVESTMENT_INSTITUTIONS.find((i) => i.id === 'tesouro_oficial')!;
    return {
      recommendedAsset: ipcaAsset,
      recommendedInstitution: tesouroInst,
      title: `${goalPrefix}Tesouro IPCA+ (Proteção Real contra Inflação)`,
      reason:
        'Para metas de longo prazo (acima de 3 anos), a maior ameaça é a perda do poder de compra. O Tesouro IPCA+ garante que seu dinheiro cresça sempre acima da inflação.',
      highlightTag: 'Imbatível no Longo Prazo'
    };
  }
}

/**
 * Alocação e Diversificação de Carteira recomendada por prazo, perfil de risco e necessidade de liquidez
 */
export function getRecommendedPortfolioAllocation(
  periodMonths: number,
  riskProfile: RiskProfile = 'moderado',
  liquidityPreference: LiquidityPreference = 'prazo_fixo'
): PortfolioAllocationItem[] {
  // Se precisa de liquidez a qualquer momento, foca em liquidez diária e imediata
  if (liquidityPreference === 'qualquer_momento') {
    if (riskProfile === 'leve') {
      return [
        {
          id: 'selic',
          category: 'Tesouro Selic (Reserva Soberana)',
          percentage: 50,
          color: '#2346C8',
          expectedAnnualRate: 10.75,
          liquidity: 'Diária (D+1)',
          isTaxFree: false,
          highlightAsset: 'Tesouro Selic',
          description: 'Segurança máxima garantida pelo Governo Federal com liquidez diária.'
        },
        {
          id: '99pay',
          category: '99Pay / Saldo 110% CDI (Imediato)',
          percentage: 35,
          color: '#FFCC00',
          expectedAnnualRate: 11.72,
          liquidity: 'Imediata 24/7 (Pix)',
          isTaxFree: false,
          highlightAsset: 'Saldo 99Pay 110% CDI',
          description: 'Rendimento automático no saldo com saque instantâneo via Pix a qualquer hora.'
        },
        {
          id: 'cdb_diario',
          category: 'CDB 100% CDI com FGC',
          percentage: 15,
          color: '#2E9E6B',
          expectedAnnualRate: 10.65,
          liquidity: 'Diária',
          isTaxFree: false,
          highlightAsset: 'CDB Inter ou Nubank',
          description: 'Proteção do Fundo Garantidor de Créditos com resgate rápido em dias úteis.'
        }
      ];
    } else if (riskProfile === 'moderado') {
      return [
        {
          id: 'selic_base',
          category: 'Tesouro Selic & 99Pay (Base Líquida)',
          percentage: 65,
          color: '#2346C8',
          expectedAnnualRate: 11.0,
          liquidity: 'Diária / Imediata',
          isTaxFree: false,
          highlightAsset: 'Tesouro Selic + 99Pay',
          description: 'Garante tranquilidade e resgate rápido para imprevistos e emergências.'
        },
        {
          id: 'fiis',
          category: 'Fundos Imobiliários (Aluguel na Conta)',
          percentage: 20,
          color: '#F89C3D',
          expectedAnnualRate: 9.8,
          liquidity: 'Cotas em Bolsa (D+2)',
          isTaxFree: true,
          highlightAsset: 'FIIs de Galpões e Shoppings',
          description: 'Pingam rendimentos mensais isentos de IR que você pode sacar ou reinvestir.'
        },
        {
          id: 'acoes',
          category: 'Ações de Dividendos Defensivas',
          percentage: 15,
          color: '#8A05BE',
          expectedAnnualRate: 11.5,
          liquidity: 'Mercado à vista (D+2)',
          isTaxFree: false,
          highlightAsset: 'Elétricas e Bancos',
          description: 'Setores perenes com geração de lucros altos e previsíveis.'
        }
      ];
    } else {
      // Alto Risco + Qualquer momento
      return [
        {
          id: 'caixa_remunerado',
          category: 'Reserva Diária & Oportunidades',
          percentage: 40,
          color: '#2346C8',
          expectedAnnualRate: 11.0,
          liquidity: 'Diária (D+0/D+1)',
          isTaxFree: false,
          highlightAsset: 'Tesouro Selic e 99Pay',
          description: 'Caixa remunerado para aproveitar quedas no mercado e manter liquidez.'
        },
        {
          id: 'fiis',
          category: 'Fundos Imobiliários (FIIs)',
          percentage: 30,
          color: '#F89C3D',
          expectedAnnualRate: 9.8,
          liquidity: 'Bolsa (D+2)',
          isTaxFree: true,
          highlightAsset: 'FIIs de Tijolo e Papel',
          description: 'Renda mensal robusta com isenção total de Imposto de Renda.'
        },
        {
          id: 'acoes',
          category: 'Ações de Crescimento e Dividendos',
          percentage: 30,
          color: '#2E9E6B',
          expectedAnnualRate: 12.0,
          liquidity: 'Bolsa (D+2)',
          isTaxFree: false,
          highlightAsset: 'Empresas Líderes da B3',
          description: 'Potencial de alta rentabilidade com liquidez para vendas quando quiser.'
        }
      ];
    }
  }

  // Se tem prazo fixo (pode deixar rendendo no tempo para ganhar taxas melhores)
  if (riskProfile === 'leve') {
    if (periodMonths <= 12) {
      return [
        {
          id: 'lci',
          category: 'LCI / LCA 90% a 95% do CDI',
          percentage: 60,
          color: '#2E9E6B',
          expectedAnnualRate: 9.85,
          liquidity: 'No vencimento',
          isTaxFree: true,
          highlightAsset: 'LCI Banco Inter',
          description: '100% Isenta de IR com FGC, bate o rendimento líquido de quase todo CDB curto.'
        },
        {
          id: 'selic',
          category: 'Tesouro Selic',
          percentage: 40,
          color: '#2346C8',
          expectedAnnualRate: 10.75,
          liquidity: 'Diária',
          isTaxFree: false,
          highlightAsset: 'Tesouro Selic',
          description: 'Liquidez para rebalanceamento e segurança soberana do governo.'
        }
      ];
    } else {
      return [
        {
          id: 'cdb_turbinado',
          category: 'CDB 120% do CDI (com FGC)',
          percentage: 45,
          color: '#2346C8',
          expectedAnnualRate: 12.78,
          liquidity: '2 a 3 anos',
          isTaxFree: false,
          highlightAsset: 'CDB 120% XP / BTG',
          description: 'Rentabilidade líquida elevada com a menor alíquota de IR (15%).'
        },
        {
          id: 'ipca',
          category: 'Tesouro IPCA+ (Juro Real)',
          percentage: 35,
          color: '#0A2540',
          expectedAnnualRate: 10.45,
          liquidity: 'No vencimento',
          isTaxFree: false,
          highlightAsset: 'Tesouro IPCA+',
          description: 'Proteção blindada que rende sempre acima da inflação até o resgate.'
        },
        {
          id: 'lci',
          category: 'LCI / LCA Isentas',
          percentage: 20,
          color: '#2E9E6B',
          expectedAnnualRate: 10.12,
          liquidity: '1 a 3 anos',
          isTaxFree: true,
          highlightAsset: 'LCA / LCI Banco Inter',
          description: 'Rentabilidade limpa sem recolhimento fiscal.'
        }
      ];
    }
  } else if (riskProfile === 'moderado') {
    return [
      {
        id: 'renda_fixa',
        category: 'Renda Fixa & Tesouro IPCA+',
        percentage: 50,
        color: '#2346C8',
        expectedAnnualRate: 11.2,
        liquidity: 'Prazo médio',
        isTaxFree: false,
        highlightAsset: 'Tesouro IPCA+ & CDB 115%',
        description: 'Pilar de estabilidade que protege o poder de compra e traz segurança.'
      },
      {
        id: 'fiis',
        category: 'Fundos Imobiliários (FIIs)',
        percentage: 30,
        color: '#F89C3D',
        expectedAnnualRate: 9.8,
        liquidity: 'Cotas em Bolsa (D+2)',
        isTaxFree: true,
        highlightAsset: 'Galpões (HGLG11) e Papel (MXRF11)',
        description: 'Aluguel todo mês isento de imposto que acelera o reinvestimento.'
      },
      {
        id: 'acoes',
        category: 'Ações de Dividendos (B.E.S.T.)',
        percentage: 20,
        color: '#8A05BE',
        expectedAnnualRate: 11.5,
        liquidity: 'Bolsa (D+2)',
        isTaxFree: false,
        highlightAsset: 'Elétricas e Grandes Bancos',
        description: 'Sócios de empresas que lucram e distribuem dividendos generosos.'
      }
    ];
  } else {
    // Alto Risco + Prazo fixo
    return [
      {
        id: 'ipca',
        category: 'Tesouro IPCA+ & Renda Fixa Longa',
        percentage: 30,
        color: '#2346C8',
        expectedAnnualRate: 10.8,
        liquidity: 'Longo prazo',
        isTaxFree: false,
        highlightAsset: 'Tesouro IPCA+ 2035/2045',
        description: 'Juros reais altos travados para ancorar a carteira.'
      },
      {
        id: 'fiis',
        category: 'Fundos Imobiliários (FIIs)',
        percentage: 35,
        color: '#F89C3D',
        expectedAnnualRate: 10.2,
        liquidity: 'Cotas em Bolsa (D+2)',
        isTaxFree: true,
        highlightAsset: 'Diversificação Tijolo + Papel',
        description: 'Renda passiva contínua reaplicada no efeito bola de neve.'
      },
      {
        id: 'acoes',
        category: 'Ações de Valor e Dividendos',
        percentage: 35,
        color: '#2E9E6B',
        expectedAnnualRate: 12.5,
        liquidity: 'Bolsa (D+2)',
        isTaxFree: false,
        highlightAsset: 'Setor Elétrico, Bancos e Saneamento',
        description: 'Máximo potencial de multiplicação de patrimônio no longo prazo.'
      }
    ];
  }
}

/**
 * Diagnóstico inteligente do melhor cenário para o momento do usuário
 */
export function getBestScenarioDiagnosis(params: DiversifiedPortfolioParams): {
  title: string;
  headline: string;
  explanation: string;
  highlightTip: string;
} {
  const { riskProfile, liquidityPreference, periodMonths } = params;

  if (liquidityPreference === 'qualquer_momento') {
    if (riskProfile === 'leve') {
      return {
        title: 'Cenário: Reserva Imediata & Blindagem Total',
        headline: 'Segurança absoluta com liquidez 24/7 sem risco de oscilação',
        explanation:
          'Com a taxa Selic em dois dígitos, você não precisa correr riscos. Sua melhor escolha é combinar o Tesouro Selic com o saldo 99Pay (110% do CDI) e CDBs diários com garantia do FGC. Seu dinheiro rende todo dia útil e você pode resgatar a qualquer minuto via Pix.',
        highlightTip:
          'Dica do Solzinho: Mantenha de 3 a 6 meses do seu custo de vida nesta estrutura antes de travar dinheiro em prazos mais longos.'
      };
    } else if (riskProfile === 'moderado') {
      return {
        title: 'Cenário: Renda Passiva com Saque Ágil',
        headline: 'Base de alta liquidez com aluguéis mensais pingando na conta',
        explanation:
          'Você mantém a maior parte do patrimônio em Tesouro Selic e 99Pay para emergências, mas destina uma fatia estratégica para Fundos Imobiliários e ações elétricas. Você recebe dividendos todo mês isentos de IR com a liberdade de vender as cotas na Bolsa em 2 dias úteis se precisar.',
        highlightTip:
          'Dica de ouro: Os aluguéis dos FIIs caem na sua conta automaticamente e podem pagar suas contas do mês ou ser reinvestidos.'
      };
    } else {
      return {
        title: 'Cenário: Caixa Estratégico & Caçador de Oportunidades',
        headline: 'Rendimento diário elevado pronto para aproveitar quedas na Bolsa',
        explanation:
          'Você mantém uma parcela de caixa em liquidez imediata com 110% do CDI e posiciona a maior parte em cotas de FIIs e ações sólidas com liquidez D+2 em bolsa, com liberdade total para rebalancear a qualquer momento.',
        highlightTip:
          'Dica: Mesmo com alta liquidez, evite vender ações no susto de quedas passageiras do mercado.'
      };
    }
  }

  // Prazo Fixo
  if (riskProfile === 'leve') {
    if (periodMonths <= 12) {
      return {
        title: 'Cenário: Tiro Curto com Isenção Fiscal (LCI/LCA)',
        headline: 'Fuga da alíquota pesada de 22,5% do Imposto de Renda',
        explanation:
          'Para prazos curtos (até 1 ano), o Imposto de Renda do CDB cobra 20% a 22,5% do seu lucro. Ao escolher LCIs ou LCAs do Banco Inter protegidas pelo FGC, seu ganho é 100% líquido e supera com folga o Tesouro e a Poupança.',
        highlightTip:
          'Atenção: LCIs possuem carência mínima legal de 9 meses estabelecida pelo CMN, então só aplique o dinheiro que não vai precisar antes disso!'
      };
    } else {
      return {
        title: 'Cenário: Travamento de Taxas Altas (CDB 120% & Tesouro IPCA+)',
        headline: 'Garantindo rentabilidade de 2 dígitos por anos mesmo se a Selic cair',
        explanation:
          'Com prazo acima de 1 ano, seu Imposto de Renda cai para a alíquota mínima de 15%. É o momento perfeito para travar CDBs de 120% do CDI na XP/BTG e títulos Tesouro IPCA+ que asseguram rendimento acima da inflação para sempre.',
        highlightTip:
          'Dica: Títulos prefixados ou IPCA+ sofrem oscilação se vendidos antes do prazo (marcação a mercado). Espere o vencimento para receber 100% da taxa contratada.'
      };
    }
  } else if (riskProfile === 'moderado') {
    return {
      title: 'Cenário: Carteira Balanceada Clássica (Equilíbrio 70/30)',
      headline: 'A fórmula dos maiores investidores: solidez na base e motor de dividendos',
      explanation:
        'Você combina 50% em Renda Fixa e Tesouro IPCA+ com 30% em Fundos Imobiliários e 20% em ações do setor elétrico e bancário. Você tem proteção real contra inflação, aluguéis mensais pingando e dividendos regulares.',
      highlightTip:
        'Dica do Solzinho: O segredo dos milionários é reinvestir 100% dos proventos dos FIIs todo mês, criando a bola de neve exponencial!'
    };
  } else {
    return {
      title: 'Cenário: Máxima Multiplicação & Liberdade Financeira',
      headline: 'Construção acelerada de patrimônio com foco no método B.E.S.T.',
      explanation:
        'No longo prazo, as ações das empresas mais lucrativas do país superam qualquer outro investimento. Com 35% em Ações perenes, 35% em FIIs e 30% em Tesouro IPCA+, você vira sócio dos motores da economia e acumula renda passiva perpétua.',
      highlightTip:
        'Regra de ouro: Foque em empresas do acrônimo B.E.S.T. (Bancos, Energia, Saneamento, Telecom/Seguros) para dividendos garantidos.'
    };
  }
}

/**
 * Motor de Cálculo dos Ganhos e Resultados da Carteira Diversificada
 */
export function calculateDiversifiedPortfolio(
  params: DiversifiedPortfolioParams
): DiversifiedPortfolioResult {
  const {
    initialAmountCents,
    monthlyContributionCents,
    periodMonths,
    riskProfile,
    liquidityPreference,
    reinvestDividends = true
  } = params;

  const allocations = getRecommendedPortfolioAllocation(periodMonths, riskProfile, liquidityPreference);

  // Calcula a taxa anual ponderada
  const blendedAnnualRatePercent = Number(
    allocations
      .reduce((sum, item) => sum + (item.percentage / 100) * (item.expectedAnnualRate ?? 10.5), 0)
      .toFixed(2)
  );

  const safeMonths = Math.max(1, periodMonths);
  const monthlyRateDecimal = Math.pow(1 + blendedAnnualRatePercent / 100, 1 / 12) - 1;

  let currentGross = initialAmountCents;
  let runningInvested = initialAmountCents;
  let cumulativeInterestGross = 0;
  const timeline: MonthSimulationPoint[] = [];

  for (let m = 1; m <= safeMonths; m++) {
    const startBalance = currentGross;
    const monthlyGrossGain = Math.round(startBalance * monthlyRateDecimal);

    if (reinvestDividends) {
      currentGross += monthlyGrossGain;
      cumulativeInterestGross += monthlyGrossGain;
    } else {
      cumulativeInterestGross += monthlyGrossGain;
    }

    if (m < safeMonths || monthlyContributionCents > 0) {
      currentGross += monthlyContributionCents;
      runningInvested += monthlyContributionCents;
    }

    timeline.push({
      month: m,
      investedTotalCents: runningInvested,
      grossBalanceCents: currentGross,
      interestGrossTotalCents: cumulativeInterestGross,
      monthlyInterestEarnedCents: monthlyGrossGain
    });
  }

  // Dedução de Imposto de Renda ponderado:
  // Itens isentos de IR (LCI, FIIs) têm alíquota 0%
  const totalTaxableRatio = allocations
    .filter((a) => !a.isTaxFree)
    .reduce((sum, a) => sum + a.percentage / 100, 0);

  const irRate = getIncomeTaxRatePercent(safeMonths * 30, false) / 100;
  const totalIncomeTaxCents = Math.round(cumulativeInterestGross * totalTaxableRatio * irRate);
  const netFinalCents = Math.max(runningInvested, currentGross - totalIncomeTaxCents);
  const totalInterestNetCents = netFinalCents - runningInvested;

  // Renda Passiva Mensal gerada no final
  const monthlyPassiveIncomeCents = Math.round(netFinalCents * monthlyRateDecimal);

  // Comparativo com Poupança (6.5% a.a.)
  const poupancaMonthlyRate = Math.pow(1 + MARKET_BENCHMARKS.poupancaAnnualPercent / 100, 1 / 12) - 1;
  let poupancaBal = initialAmountCents;
  for (let m = 1; m <= safeMonths; m++) {
    poupancaBal = Math.round(poupancaBal * (1 + poupancaMonthlyRate)) + monthlyContributionCents;
  }
  const poupancaFinalCents = poupancaBal;
  const poupancaExtraGainCents = Math.max(0, netFinalCents - poupancaFinalCents);

  const riskLabel =
    riskProfile === 'leve'
      ? 'Leve (Conservador)'
      : riskProfile === 'moderado'
      ? 'Moderado (Equilibrado)'
      : 'Alto Risco (Arrojado)';

  const riskDescription =
    riskProfile === 'leve'
      ? '100% focado em segurança, previsibilidade e proteção do capital.'
      : riskProfile === 'moderado'
      ? 'Equilíbrio ideal entre solidez da renda fixa e renda passiva de dividendos.'
      : 'Estratégia arrojada para maximizar multiplicação no médio e longo prazo.';

  const liquidityDescription =
    liquidityPreference === 'qualquer_momento'
      ? 'Liquidez Imediata ou Diária (Reserva de Emergência garantida)'
      : 'Prazo Fixo (Travamento de taxas superiores até o vencimento)';

  const diagnosis = getBestScenarioDiagnosis(params);

  return {
    allocations,
    blendedAnnualRatePercent,
    totalInvestedCents: runningInvested,
    grossFinalCents: currentGross,
    netFinalCents,
    totalInterestGrossCents: cumulativeInterestGross,
    totalInterestNetCents,
    totalIncomeTaxCents,
    monthlyPassiveIncomeCents,
    poupancaFinalCents,
    poupancaExtraGainCents,
    timeline,
    riskLabel,
    riskDescription,
    liquidityDescription,
    diagnosis
  };
}

/**
 * Catálogo Educativo de Dicas de Ações e FIIs por Setor
 */
export interface SectorStockTip {
  id: string;
  sectorName: string;
  categoryLabel: 'Ações de Dividendos' | 'Fundos Imobiliários';
  icon: 'zap' | 'landmark' | 'shield' | 'building' | 'droplet';
  tag: string;
  whyInvestText: string;
  childLanguageExplanation: string;
  examples: {
    ticker: string;
    companyName: string;
    highlight: string;
  }[];
  idealProfile: 'Todos' | 'Leve a Moderado' | 'Moderado a Alto';
}

export const SECTOR_STOCK_TIPS: SectorStockTip[] = [
  {
    id: 'eletricas',
    sectorName: 'Setor Elétrico (Energia & Transmissão)',
    categoryLabel: 'Ações de Dividendos',
    icon: 'zap',
    tag: 'Setor Mais Seguro da Bolsa',
    whyInvestText:
      'As empresas de transmissão de energia possuem contratos de 30 anos com receita garantida pela disponibilidade das linhas, independentemente de haver crise ou não. Além disso, as tarifas são corrigidas pela inflação anualmente.',
    childLanguageExplanation:
      'Pense como a conta de luz da sua casa: ninguém fica sem ligar a geladeira e acender as lâmpadas. As empresas de energia recebem todo mês como um "pedágio da eletricidade" e dividem esse dinheirinho com você.',
    examples: [
      {
        ticker: 'TAEE11',
        companyName: 'Taesa (Transmissora Aliança de Energia Elétrica)',
        highlight: 'Referência em dividendos consistentes e contratos de transmissão de longo prazo.'
      },
      {
        ticker: 'EGIE3',
        companyName: 'Engie Brasil',
        highlight: 'Líder privada em geração de energia renovável com governança de ponta.'
      },
      {
        ticker: 'CPFE3',
        companyName: 'CPFL Energia',
        highlight: 'Geração e distribuição sólida com payout elevado e histórico centenário.'
      }
    ],
    idealProfile: 'Todos'
  },
  {
    id: 'bancos',
    sectorName: 'Grandes Bancos Brasileiros',
    categoryLabel: 'Ações de Dividendos',
    icon: 'landmark',
    tag: 'Alta Rentabilidade Histórica',
    whyInvestText:
      'O sistema bancário do Brasil é um dos mais lucrativos, tecnológicos e seguros do mundo. Grandes bancos possuem milhões de clientes, operam com spread eficiente e distribuem bilhões de lucros trimestralmente.',
    childLanguageExplanation:
      'Todo mundo usa banco para guardar dinheiro, passar cartão e pagar compras. Em vez de só pagar tarifas para o banco, você compra um pedacinho dele e vira o dono que recebe parte dos lucros!',
    examples: [
      {
        ticker: 'ITUB4',
        companyName: 'Itaú Unibanco',
        highlight: 'Maior banco privado da América Latina, sinônimo de rentabilidade (ROE > 20%) e resiliência.'
      },
      {
        ticker: 'BBAS3',
        companyName: 'Banco do Brasil',
        highlight: 'Líder absoluto no agronegócio com lucros recordes e múltiplos de valuation com desconto.'
      }
    ],
    idealProfile: 'Moderado a Alto'
  },
  {
    id: 'saneamento_seguros',
    sectorName: 'Saneamento & Seguradoras',
    categoryLabel: 'Ações de Dividendos',
    icon: 'shield',
    tag: 'Monopólios Perenes & Defensivos',
    whyInvestText:
      'Seguradoras não precisam de grandes fábricas ou máquinas caras: investem os prêmios recebidos no mercado financeiro e faturam alto. E empresas de saneamento possuem monopólio regional no fornecimento de água.',
    childLanguageExplanation:
      'Todo mundo precisa beber água limpa e tomar banho todo dia. E quem tem carro ou casa paga seguro para dormir tranquilo. É um serviço que nunca para de funcionar!',
    examples: [
      {
        ticker: 'BBSE3',
        companyName: 'BB Seguridade',
        highlight: 'Modelo de negócio leve, sem risco de crédito, repassando quase 90% dos lucros em dividendos.'
      },
      {
        ticker: 'SAPR11',
        companyName: 'Sanepar (Saneamento do Paraná)',
        highlight: 'Monopólio essencial de água tratada com fluxo de caixa estável e previsível.'
      }
    ],
    idealProfile: 'Leve a Moderado'
  },
  {
    id: 'fiis_tijolo',
    sectorName: 'FIIs de Galpões Logísticos & Shoppings',
    categoryLabel: 'Fundos Imobiliários',
    icon: 'building',
    tag: 'Aluguel Isento de IR Todo Mês',
    whyInvestText:
      'Galpões logísticos de alto padrão alugados para gigantes do e-commerce (Mercado Livre, Amazon, Magalu) e grandes shoppings centers. Você recebe aluguéis mensais isentos de Imposto de Renda na sua conta.',
    childLanguageExplanation:
      'Imagine que você e milhares de amigos compraram um shopping gigante e galpões cheios de encomendas da internet. Todo mês, as lojas pagam aluguel e o LibertyBag mostra esse aluguel caindo na sua conta!',
    examples: [
      {
        ticker: 'HGLG11',
        companyName: 'CSHG Logística',
        highlight: 'Maior fundo imobiliário de galpões logísticos do país, com imóveis em localizações estratégicas.'
      },
      {
        ticker: 'XPML11',
        companyName: 'XP Malls',
        highlight: 'Portfólio diversificado em dezenas dos melhores shoppings centers de capitais brasileiras.'
      }
    ],
    idealProfile: 'Todos'
  },
  {
    id: 'fiis_papel',
    sectorName: 'FIIs de Papel (Crédito Imobiliário CRI)',
    categoryLabel: 'Fundos Imobiliários',
    icon: 'droplet',
    tag: 'Rendimento Atrelado ao CDI/IPCA',
    whyInvestText:
      'Fundos que compram dívidas imobiliárias de alta qualidade (Certificados de Recebíveis Imobiliários). Pagam juros mensais elevados que acompanham diretamente a taxa CDI ou a inflação (IPCA).',
    childLanguageExplanation:
      'É como emprestar dinheiro para construtoras erguerem prédios novos. Elas pagam juros bem gordinhos todo mês e esse juro é distribuído para quem tem as cotas.',
    examples: [
      {
        ticker: 'MXRF11',
        companyName: 'Maxi Renda FII',
        highlight: 'O fundo imobiliário mais popular do Brasil, com cotas acessíveis (~R$ 10) e dividendos frequentes.'
      },
      {
        ticker: 'KNIP11',
        companyName: 'Kinea Rendimentos Imobiliários',
        highlight: 'Gestão de ponta do Itaú focada em CRIs de grau de investimento indexados ao IPCA.'
      }
    ],
    idealProfile: 'Moderado a Alto'
  }
];

/**
 * Guia Educativo com Linguagem Fácil (para qualquer um entender, até uma criança)
 */
export interface SimpleLearningCard {
  id: string;
  title: string;
  childAnalogyTitle: string;
  emoji: string;
  simpleExplanation: string;
  whyItMatters: string;
  goldenRule: string;
}

export const SIMPLE_INVESTMENT_GUIDE: SimpleLearningCard[] = [
  {
    id: 'why_invest',
    title: 'Por Que Investir? (O Monstrinho da Inflação)',
    childAnalogyTitle: 'O picolé que ficou mais caro',
    emoji: '🍦',
    simpleExplanation:
      'Se você guardar uma nota de R$ 100 debaixo do colchão hoje, ela continuará sendo R$ 100 daqui a 5 anos. Mas as coisas no mercado aumentam de preço! Há 10 anos, um picolé custava R$ 2, hoje custa R$ 8. Isso se chama INFLAÇÃO: um monstrinho invisível que come o valor do dinheiro parado. Quando você investe, seu dinheiro tem "filhotinhos" (os juros) todo mês e cresce mais rápido do que as coisas aumentam de preço!',
    whyItMatters:
      'Investir não é para ficar rico da noite para o dia, é para nunca ficar pobre e conquistar sua liberdade.',
    goldenRule: 'Dinheiro parado perde valor todo dia. Dinheiro investido trabalha por você enquanto você dorme.'
  },
  {
    id: 'selic_cdi',
    title: 'O que é a Taxa Selic e o CDI?',
    childAnalogyTitle: 'O Capitão do Time e seu Irmão Gêmeo',
    emoji: '⭐',
    simpleExplanation:
      'A Taxa Selic é a taxa básica de juros de todo o Brasil, definida pelo Banco Central. Pense nela como o Capitão de um time: quando a Selic sobe, todos os investimentos seguros (como o Tesouro Direto e o CDB) passam a render mais! E o CDI é o irmão gêmeo da Selic: é a taxa que os bancos usam para emprestar dinheiro uns aos outros quando o dia acaba. Se um CDB rende 100% do CDI, significa que ele paga a nota máxima dessa taxa!',
    whyItMatters:
      'Com a Selic em dois dígitos (acima de 10% ao ano), o Brasil é um dos países mais fáceis para fazer seu dinheiro render com segurança.',
    goldenRule: 'Sempre compare seus investimentos com a Selic e o CDI. Menos que 100% do CDI não vale a pena!'
  },
  {
    id: 'ipca',
    title: 'O que é o IPCA?',
    childAnalogyTitle: 'O Termômetro do Carrinho de Compras',
    emoji: '🛒',
    simpleExplanation:
      'O IPCA é o medidor oficial da inflação no Brasil. Ele mede se a média de preços da comida, da escola, da gasolina e do remédio subiu ou desceu no mês. Se o IPCA foi de 4% no ano e seu investimento rendeu 10%, significa que você teve um GANHO REAL de 6%! O seu dinheiro comprou mais coisas de verdade.',
    whyItMatters:
      'O Tesouro IPCA+ é o queridinho do longo prazo porque ele promete: "te devolvo a inflação inteira e mais um bônus por cima!". Você nunca perde o poder de compra.',
    goldenRule: 'Não olhe apenas para o rendimento bruto: o que importa é quanto sobra acima do IPCA.'
  },
  {
    id: 'ir_regressivo',
    title: 'Imposto de Renda: A Mordidinha do Leão',
    childAnalogyTitle: 'A fatia de bolo que encolhe com a paciência',
    emoji: '🦁',
    simpleExplanation:
      'Quando seu dinheiro rende em CDBs ou Tesouro, o governo pede uma pequena fatia do LUCRO (nunca do valor que você guardou). E tem uma regra mágica: quanto MAIS TEMPO você deixa o dinheiro quietinho rendendo, MENOR é a mordida! Começa em 22,5% (se tirar em até 6 meses) e vai caindo até a menor alíquota de 15% (após 2 anos). E em LCIs, LCAs e aluguéis de FIIs, a mordida é ZERO!',
    whyItMatters:
      'Ter paciência recompensa você duas vezes: com mais juros compostos e com menos imposto a pagar.',
    goldenRule: 'Para metas curtas (até 1 ano), procure LCIs ou LCAs porque você economiza 20% a 22,5% de imposto.'
  },
  {
    id: 'profiles',
    title: 'Qual é o seu Estilo de Investidor?',
    childAnalogyTitle: 'A Tartaruga, o Cavalo e a Águia',
    emoji: '🐢',
    simpleExplanation:
      '• 🐢 LEVE (Tartaruga Esperta): Adora andar no chão seguro. Não quer ver seu saldo diminuir nem por um segundo. Prefere Tesouro Selic, 99Pay e CDBs com garantia do FGC.\n\n• 🐎 MODERADO (Cavalo Veloz): Anda no asfalto seguro, mas dá uma galopada no campo para ir mais rápido. Junta renda fixa com Fundos Imobiliários para receber aluguel todo mês.\n\n• 🦅 ALTO RISCO (Águia das Alturas): Não tem medo de tempestade passageira porque sabe voar acima das nuvens. Mantém a cabeça fria e foca em 5 a 10 anos comprando ações das melhores empresas.',
    whyItMatters:
      'Não existe perfil certo ou errado: o melhor perfil é aquele que deixa você dormir com a cabeça tranquila no travesseiro!',
    goldenRule: 'Descubra seu perfil respeitando seu tempo e nunca invista em algo que você não compreenda.'
  }
];

/**
 * Consulta em tempo real a taxa Selic oficial do Banco Central do Brasil (SGS 432)
 * com fallback seguro para a taxa de referência estável.
 */
export interface LiveMarketRates {
  selicAnnualPercent: number;
  cdiAnnualPercent: number;
  ipcaAnnualPercent: number;
  poupancaAnnualPercent: number;
  lastUpdated: string;
  isLive: boolean;
}

export async function fetchLiveBacenRates(): Promise<LiveMarketRates> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('BACEN response not ok');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].valor) {
      const selicValue = parseFloat(data[0].valor);
      if (!isNaN(selicValue) && selicValue > 0) {
        return {
          selicAnnualPercent: selicValue,
          cdiAnnualPercent: Number((selicValue - 0.10).toFixed(2)),
          ipcaAnnualPercent: 4.10,
          poupancaAnnualPercent: selicValue > 8.5 ? 6.50 : Number((selicValue * 0.7).toFixed(2)),
          lastUpdated: data[0].data || new Date().toLocaleDateString('pt-BR'),
          isLive: true
        };
      }
    }
  } catch {
    // Graceful offline fallback
  }
  return {
    selicAnnualPercent: MARKET_BENCHMARKS.selicAnnualPercent,
    cdiAnnualPercent: MARKET_BENCHMARKS.cdiAnnualPercent,
    ipcaAnnualPercent: MARKET_BENCHMARKS.ipcaAnnualPercent,
    poupancaAnnualPercent: MARKET_BENCHMARKS.poupancaAnnualPercent,
    lastUpdated: 'Referência BCB (Estável)',
    isLive: false
  };
}
