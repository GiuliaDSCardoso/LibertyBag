/**
 * Serviço de Simulação de Parcelamento (Pix e Cartão de Crédito) — LibertyBag
 * 
 * Regras financeiras e taxas de referência dos principais bancos brasileiros.
 * Permite calcular juros compostos de parcelamento bancário (Tabela Price),
 * comparar taxas entre bancos, recomendar a melhor opção e cruzar com limites cadastrados.
 */

export type SimulationType = 'credito' | 'pix_parcelado';

export interface BankConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  accentBg: string;
  creditMonthlyRate: number;       // % ao mês de juros no Cartão de Crédito
  creditServiceFeePercent: number; // % tarifa de serviço no Cartão (geralmente 0%)
  pixMonthlyRate: number;          // % ao mês de juros no Pix Parcelado
  pixServiceFeePercent: number;    // % tarifa de transação do Pix no Cartão (ex: 4.99% PicPay, 3.99% Nubank)
  description: string;
  sourceNote?: string;
}

export const POPULAR_BANKS: BankConfig[] = [
  {
    id: 'picpay',
    name: 'PicPay',
    shortName: 'PicPay',
    color: '#11C76F',
    accentBg: '#E8FAF1',
    creditMonthlyRate: 5.49,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 5.493, // Produz exatamente os R$ 210,12 em 6x de R$ 1.000 (dados reais do app PicPay)
    pixServiceFeePercent: 4.99, // Tarifa de 4,99% no Pix com cartão
    description: 'Tarifa de serviço de 4,99% na transação + 5,49% a.m. de parcelamento (dados reais do app)',
    sourceNote: 'Aplicativo Oficial PicPay 2026'
  },
  {
    id: 'nubank',
    name: 'Nubank (Nu)',
    shortName: 'Nubank',
    color: '#8A05BE',
    accentBg: '#F5E8FB',
    creditMonthlyRate: 4.99,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 4.99,
    pixServiceFeePercent: 3.99,
    description: 'Tarifa de 3,99% no Pix no crédito + juros médios de 4,99% a.m. no aplicativo Nu',
    sourceNote: 'Nu Pagamentos'
  },
  {
    id: 'inter',
    name: 'Banco Inter',
    shortName: 'Inter',
    color: '#FF7A00',
    accentBg: '#FFF3E8',
    creditMonthlyRate: 3.89,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 3.89,
    pixServiceFeePercent: 3.49,
    description: 'Menor taxa combinada no Pix no crédito (3,49% taxa + 3,89% a.m. de juros)',
    sourceNote: 'Super App Inter'
  },
  {
    id: 'caixa',
    name: 'Caixa Econômica',
    shortName: 'Caixa',
    color: '#005CA9',
    accentBg: '#E8F3FC',
    creditMonthlyRate: 3.89,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 3.89,
    pixServiceFeePercent: 2.99,
    description: 'Banco tradicional público com menor tarifa de conveniência no crédito',
    sourceNote: 'Tabela de Crédito Caixa'
  },
  {
    id: 'c6',
    name: 'C6 Bank',
    shortName: 'C6 Bank',
    color: '#242424',
    accentBg: '#EAEAEA',
    creditMonthlyRate: 4.79,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 4.79,
    pixServiceFeePercent: 3.89,
    description: 'Pix parcelado no cartão C6 com 3,89% de tarifa e 4,79% a.m.',
    sourceNote: 'C6 Bank'
  },
  {
    id: 'itau',
    name: 'Itaú Unibanco',
    shortName: 'Itaú',
    color: '#EC7000',
    accentBg: '#FFF2E8',
    creditMonthlyRate: 4.89,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 4.89,
    pixServiceFeePercent: 3.99,
    description: 'Parcelamento de Pix e fatura nos cartões Itaú com 3,99% de tarifa e 4,89% a.m.',
    sourceNote: 'Itaú Unibanco'
  },
  {
    id: 'santander',
    name: 'Santander Brasil',
    shortName: 'Santander',
    color: '#CC0000',
    accentBg: '#FCE8E8',
    creditMonthlyRate: 5.19,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 5.19,
    pixServiceFeePercent: 4.19,
    description: 'Linhas de crédito pessoal e cartões Santander SX com 4,19% de tarifa e 5,19% a.m.',
    sourceNote: 'Santander Brasil'
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    shortName: 'Bradesco',
    color: '#CC092F',
    accentBg: '#FCEAEB',
    creditMonthlyRate: 5.29,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 5.29,
    pixServiceFeePercent: 4.29,
    description: 'Parcelamento via app Bradesco com taxa de conveniência de 4,29% e 5,29% a.m.',
    sourceNote: 'Banco Bradesco'
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    shortName: 'Mercado Pago',
    color: '#009EE3',
    accentBg: '#E8F6FC',
    creditMonthlyRate: 5.49,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 5.49,
    pixServiceFeePercent: 4.99,
    description: 'Crédito digital Mercado Pago: 4,99% de tarifa + juros de 5,49% a.m.',
    sourceNote: 'Mercado Pago'
  },
  {
    id: '99pay',
    name: '99Pay',
    shortName: '99Pay',
    color: '#F4B000',
    accentBg: '#FFFBEA',
    creditMonthlyRate: 4.49,
    creditServiceFeePercent: 0,
    pixMonthlyRate: 4.49,
    pixServiceFeePercent: 3.99,
    description: 'Pix parcelado no cartão 99Pay: tarifa de 3,99% + juros de 4,49% a.m.',
    sourceNote: 'App 99Pay Oficial 2026'
  }
];

export interface UserBankLimits {
  creditLimitCents: number;
  pixLimitCents: number;
}

export type StoredLimitsMap = Record<string, UserBankLimits>;

const STORAGE_KEY_PREFIX = 'libertybag:bank_limits:';

/**
 * Recupera os limites cadastrados pelo usuário para cada banco
 */
export function getSavedBankLimits(userId: string, spaceId: string): StoredLimitsMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}_${spaceId}`);
    if (!raw) return {};
    return JSON.parse(raw) as StoredLimitsMap;
  } catch {
    return {};
  }
}

/**
 * Salva os limites cadastrados pelo usuário
 */
export function saveBankLimits(
  userId: string,
  spaceId: string,
  limits: StoredLimitsMap
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${userId}_${spaceId}`,
      JSON.stringify(limits)
    );
  } catch {
    // ignorar falha de storage
  }
}

/**
 * Calcula o Custo Efetivo Total (CET) mensal a partir do fluxo de caixa
 */
export function calculateCETMonthly(
  principalCents: number,
  installmentCents: number,
  installments: number
): number {
  if (installments <= 1) {
    if (principalCents <= 0) return 0;
    return Number(Math.max(0, ((installmentCents - principalCents) / principalCents) * 100).toFixed(2));
  }
  let low = 0.0001, high = 1.0;
  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const factor = Math.pow(1 + mid, installments);
    const pmt = (principalCents * mid * factor) / (factor - 1);
    if (pmt < installmentCents) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Number((((low + high) / 2) * 100).toFixed(2));
}

export interface InstallmentCalculationResult {
  installmentCents: number;
  totalFinalCents: number;
  totalInterestCents: number;
  serviceFeeCents: number;
  iofTotalCents: number;
  financingBaseCents: number;
  cetMonthlyPercent: number;
}

export interface CalculateInstallmentOptions {
  includeIOF?: boolean;
  creditInterestFree?: boolean; // Para compras parceladas sem juros no cartão de crédito
}

/**
 * Cálculo financeiro pela Tabela Price (amortização e juros bancários compostos)
 * integrando a tarifa de serviço/transação do Pix no Cartão, IOF oficial brasileiro e o CET real de mercado.
 */
export function calculateInstallment(
  principalCents: number,
  monthlyRatePercent: number,
  installments: number,
  serviceFeePercent: number = 0,
  options?: CalculateInstallmentOptions
): InstallmentCalculationResult {
  const n = Math.max(1, Math.floor(installments));

  // Opção de parcelamento sem juros (modalidade Lojista no Cartão de Crédito)
  if (options?.creditInterestFree) {
    const installmentCents = Math.round(principalCents / n);
    const totalFinalCents = principalCents;
    return {
      installmentCents,
      totalFinalCents,
      totalInterestCents: 0,
      serviceFeeCents: 0,
      iofTotalCents: 0,
      financingBaseCents: principalCents,
      cetMonthlyPercent: 0
    };
  }

  const serviceFeeCents = Math.round(principalCents * (Math.max(0, serviceFeePercent) / 100));

  let iofTotalCents = 0;
  if (options?.includeIOF) {
    const iofFixed = Math.round(principalCents * 0.0038); // 0,38% fixo sobre o valor financiado
    const iofDaily = Math.min(
      Math.round(principalCents * 0.03), // Teto legal anual de 3%
      Math.round(principalCents * 0.000082 * 30 * n) // 0,0082% ao dia * ~30 dias por parcela
    );
    iofTotalCents = iofFixed + iofDaily;
  }

  const financingBaseCents = principalCents + serviceFeeCents + iofTotalCents;

  if (n <= 1) {
    const installmentCents = financingBaseCents;
    const totalFinalCents = financingBaseCents;
    const totalInterestCents = 0;
    const cetMonthlyPercent = calculateCETMonthly(principalCents, installmentCents, n);
    return {
      installmentCents,
      totalFinalCents,
      totalInterestCents,
      serviceFeeCents,
      iofTotalCents,
      financingBaseCents,
      cetMonthlyPercent
    };
  }

  const i = Math.max(0, monthlyRatePercent) / 100;
  let installmentCents = 0;
  let totalFinalCents = 0;
  let totalInterestCents = 0;

  if (i <= 0) {
    installmentCents = Math.round(financingBaseCents / n);
    totalFinalCents = installmentCents * n;
    totalInterestCents = 0;
  } else {
    // PMT = Base * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
    const factor = Math.pow(1 + i, n);
    const pmt = financingBaseCents * ((i * factor) / (factor - 1));
    installmentCents = Math.round(pmt);
    totalFinalCents = installmentCents * n;
    totalInterestCents = Math.max(0, totalFinalCents - financingBaseCents);
  }

  const cetMonthlyPercent = calculateCETMonthly(principalCents, installmentCents, n);

  return {
    installmentCents,
    totalFinalCents,
    totalInterestCents,
    serviceFeeCents,
    iofTotalCents,
    financingBaseCents,
    cetMonthlyPercent
  };
}

export interface BankSimulationItem {
  bank: BankConfig;
  simulationType: SimulationType;
  installments: number;
  originalAmountCents: number;
  serviceFeePercent: number;
  serviceFeeCents: number;
  iofTotalCents: number;
  financingBaseCents: number;
  monthlyRatePercent: number;
  installmentAmountCents: number;
  finalTotalCents: number;
  totalInterestCents: number;
  totalAdditionalCostCents: number;
  cetMonthlyPercent: number;
  exceedsLimit: boolean;
  registeredLimitCents: number;
  overLimitCents: number;
}

export interface InstallmentScheduleRow {
  installments: number;
  installmentCents: number;
  totalFinalCents: number;
  totalInterestCents: number;
  serviceFeeCents: number;
  iofCents: number;
  additionalCostCents: number;
}

/**
 * Gera a tabela completa de parcelas de 1x até N vezes para um banco específico,
 * permitindo ao usuário comparar cada parcela exatamente como no aplicativo bancário.
 */
export function generateFullInstallmentSchedule(
  principalCents: number,
  monthlyRatePercent: number,
  serviceFeePercent: number,
  options?: CalculateInstallmentOptions,
  maxInstallments = 24
): InstallmentScheduleRow[] {
  const candidateNs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24];
  const list: InstallmentScheduleRow[] = [];

  for (const n of candidateNs) {
    if (n > maxInstallments) continue;
    const calc = calculateInstallment(principalCents, monthlyRatePercent, n, serviceFeePercent, options);
    list.push({
      installments: n,
      installmentCents: calc.installmentCents,
      totalFinalCents: calc.totalFinalCents,
      totalInterestCents: calc.totalInterestCents,
      serviceFeeCents: calc.serviceFeeCents,
      iofCents: calc.iofTotalCents,
      additionalCostCents: Math.max(0, calc.totalFinalCents - principalCents)
    });
  }

  return list;
}

/**
 * Executa simulação para todos os bancos cadastrados,
 * cruzando com os limites do usuário e identificando a melhor recomendação.
 */
export function simulateAllBanks(params: {
  amountCents: number;
  installments: number;
  simulationType: SimulationType;
  limits: StoredLimitsMap;
  customRateMap?: Record<string, number>;
  customFeeMap?: Record<string, number>;
  includeIOF?: boolean;
  creditInterestFree?: boolean;
}): {
  results: BankSimulationItem[];
  bestOption: BankSimulationItem;
  worstOption: BankSimulationItem;
  maxSavingsCents: number;
} {
  const {
    amountCents,
    installments,
    simulationType,
    limits,
    customRateMap = {},
    customFeeMap = {},
    includeIOF = false,
    creditInterestFree = false
  } = params;

  const results: BankSimulationItem[] = POPULAR_BANKS.map((bank) => {
    const defaultRate =
      simulationType === 'credito' ? bank.creditMonthlyRate : bank.pixMonthlyRate;
    const rate = customRateMap[bank.id] ?? defaultRate;

    const defaultFee =
      simulationType === 'credito'
        ? bank.creditServiceFeePercent
        : bank.pixServiceFeePercent;
    const fee = customFeeMap[bank.id] ?? defaultFee;

    const calcOptions: CalculateInstallmentOptions = {
      includeIOF,
      creditInterestFree: simulationType === 'credito' && creditInterestFree
    };

    const {
      installmentCents,
      totalFinalCents,
      totalInterestCents,
      serviceFeeCents,
      iofTotalCents,
      financingBaseCents,
      cetMonthlyPercent
    } = calculateInstallment(amountCents, rate, installments, fee, calcOptions);

    const userBankLimits = limits[bank.id] || { creditLimitCents: 0, pixLimitCents: 0 };
    const registeredLimitCents =
      simulationType === 'credito'
        ? userBankLimits.creditLimitCents
        : userBankLimits.pixLimitCents;

    const exceedsLimit =
      registeredLimitCents > 0 && totalFinalCents > registeredLimitCents;
    const overLimitCents = exceedsLimit
      ? totalFinalCents - registeredLimitCents
      : 0;

    return {
      bank,
      simulationType,
      installments,
      originalAmountCents: amountCents,
      serviceFeePercent: fee,
      serviceFeeCents,
      iofTotalCents,
      financingBaseCents,
      monthlyRatePercent: rate,
      installmentAmountCents: installmentCents,
      finalTotalCents: totalFinalCents,
      totalInterestCents,
      totalAdditionalCostCents: totalFinalCents - amountCents,
      cetMonthlyPercent,
      exceedsLimit,
      registeredLimitCents,
      overLimitCents
    };
  });

  // Ordena por menor valor total final (menor custo real para o usuário)
  results.sort((a, b) => a.finalTotalCents - b.finalTotalCents);

  const bestOption = results[0];
  const worstOption = results[results.length - 1];
  const maxSavingsCents = Math.max(
    0,
    worstOption.finalTotalCents - bestOption.finalTotalCents
  );

  return {
    results,
    bestOption,
    worstOption,
    maxSavingsCents
  };
}
