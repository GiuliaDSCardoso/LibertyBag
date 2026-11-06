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
  creditMonthlyRate: number; // % ao mês no Cartão de Crédito
  pixMonthlyRate: number;    // % ao mês no Pix Parcelado
  description: string;
}

export const POPULAR_BANKS: BankConfig[] = [
  {
    id: 'inter',
    name: 'Banco Inter',
    shortName: 'Inter',
    color: '#FF7A00',
    accentBg: '#FFF3E8',
    creditMonthlyRate: 2.89,
    pixMonthlyRate: 3.49,
    description: 'Taxa competitiva no crédito à vista ou parcelado'
  },
  {
    id: 'caixa',
    name: 'Caixa Econômica',
    shortName: 'Caixa',
    color: '#005CA9',
    accentBg: '#E8F3FC',
    creditMonthlyRate: 2.99,
    pixMonthlyRate: 3.69,
    description: 'Tradicional com taxas acessíveis no parcelamento'
  },
  {
    id: 'c6',
    name: 'C6 Bank',
    shortName: 'C6 Bank',
    color: '#242424',
    accentBg: '#EAEAEA',
    creditMonthlyRate: 3.19,
    pixMonthlyRate: 3.89,
    description: 'Opção flexível com programa Átomos'
  },
  {
    id: 'picpay',
    name: 'PicPay',
    shortName: 'PicPay',
    color: '#11C76F',
    accentBg: '#E8FAF1',
    creditMonthlyRate: 3.29,
    pixMonthlyRate: 3.89,
    description: 'Muito popular no Pix Parcelado, boletos e compras no app PicPay'
  },
  {
    id: 'nubank',
    name: 'Nubank (Nu)',
    shortName: 'Nubank',
    color: '#8A05BE',
    accentBg: '#F5E8FB',
    creditMonthlyRate: 3.29,
    pixMonthlyRate: 3.99,
    description: 'Praticidade no app com Pix no cartão e parcelamento rápido'
  },
  {
    id: 'itau',
    name: 'Itaú Unibanco',
    shortName: 'Itaú',
    color: '#EC7000',
    accentBg: '#FFF2E8',
    creditMonthlyRate: 3.49,
    pixMonthlyRate: 4.19,
    description: 'Maior banco privado com opção Pix Parcelado'
  },
  {
    id: 'santander',
    name: 'Santander Brasil',
    shortName: 'Santander',
    color: '#CC0000',
    accentBg: '#FCE8E8',
    creditMonthlyRate: 3.59,
    pixMonthlyRate: 4.29,
    description: 'Parcelamento com cartões SX e Van Gogh'
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    shortName: 'Bradesco',
    color: '#CC092F',
    accentBg: '#FCEAEB',
    creditMonthlyRate: 3.69,
    pixMonthlyRate: 4.39,
    description: 'Linha de crédito pessoal e parcelamento de faturas'
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    shortName: 'Mercado Pago',
    color: '#009EE3',
    accentBg: '#E8F6FC',
    creditMonthlyRate: 3.79,
    pixMonthlyRate: 4.49,
    description: 'Crédito digital sem burocracia na conta Mercado Pago'
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
 * Cálculo financeiro pela Tabela Price (amortização e juros bancários compostos)
 */
export function calculateInstallment(
  principalCents: number,
  monthlyRatePercent: number,
  installments: number
): { installmentCents: number; totalFinalCents: number; totalInterestCents: number } {
  const n = Math.max(1, Math.floor(installments));
  if (n <= 1 || monthlyRatePercent <= 0) {
    const inst = Math.round(principalCents / n);
    return {
      installmentCents: inst,
      totalFinalCents: principalCents,
      totalInterestCents: 0
    };
  }

  const i = monthlyRatePercent / 100;
  // PMT = P * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
  const factor = Math.pow(1 + i, n);
  const pmt = principalCents * ((i * factor) / (factor - 1));
  const installmentCents = Math.round(pmt);
  const totalFinalCents = installmentCents * n;
  const totalInterestCents = Math.max(0, totalFinalCents - principalCents);

  return { installmentCents, totalFinalCents, totalInterestCents };
}

export interface BankSimulationItem {
  bank: BankConfig;
  simulationType: SimulationType;
  installments: number;
  originalAmountCents: number;
  monthlyRatePercent: number;
  installmentAmountCents: number;
  finalTotalCents: number;
  totalInterestCents: number;
  exceedsLimit: boolean;
  registeredLimitCents: number;
  overLimitCents: number;
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
}): {
  results: BankSimulationItem[];
  bestOption: BankSimulationItem;
  worstOption: BankSimulationItem;
  maxSavingsCents: number;
} {
  const { amountCents, installments, simulationType, limits, customRateMap = {} } = params;

  const results: BankSimulationItem[] = POPULAR_BANKS.map((bank) => {
    const defaultRate =
      simulationType === 'credito' ? bank.creditMonthlyRate : bank.pixMonthlyRate;
    const rate = customRateMap[bank.id] ?? defaultRate;

    const { installmentCents, totalFinalCents, totalInterestCents } =
      calculateInstallment(amountCents, rate, installments);

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
      monthlyRatePercent: rate,
      installmentAmountCents: installmentCents,
      finalTotalCents: totalFinalCents,
      totalInterestCents,
      exceedsLimit,
      registeredLimitCents,
      overLimitCents
    };
  });

  // Ordena por menor valor total final
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
