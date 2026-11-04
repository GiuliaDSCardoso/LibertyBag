/**
 * Utilitários seguros para valores monetários em centavos (inteiros).
 * Regra: nunca armazenar ou somar dinheiro em ponto flutuante.
 */

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * Formata um valor em centavos (inteiro) para string BRL (ex: 1250 -> "R$ 12,50").
 */
export function formatCentsToBRL(cents: number): string {
  const safeCents = Math.round(cents);
  return brlFormatter.format(safeCents / 100);
}

/**
 * Converte uma string de dígitos numéricos (como "1250" digitado no teclado)
 * para centavos inteiros (1250 centavos = R$ 12,50).
 */
export function parseDigitsToCents(digits: string): number {
  const cleaned = digits.replace(/\D/g, '');
  if (!cleaned) return 0;
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Converte um valor em reais (string como "45,90", "1.250,50" ou "10.55") para centavos inteiros (4590).
 */
export function parseReaisStringToCents(input: string): number {
  const trimmed = input.trim().replace(/[R$\s]/g, '');
  if (!trimmed) return 0;

  let normalized = trimmed;
  if (trimmed.includes(',')) {
    // Formato brasileiro com vírgula decimal: remove pontos de milhar e troca vírgula por ponto
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  }

  const num = Number(normalized);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

export interface PeriodTotals {
  entrou: number; // em centavos
  saiu: number; // em centavos
  sobrou: number; // entrou - saiu (em centavos)
}

export interface MinimalTransactionForCalc {
  amountCents: number;
  type: 'entrada' | 'saida';
  deletedAt?: string | null;
}

/**
 * Calcula "Dinheiro que entrou", "Dinheiro que saiu" e "Sobrou" em centavos,
 * ignorando registros apagados logicamente (deletedAt preenchido).
 */
export function calculatePeriodTotals(transactions: MinimalTransactionForCalc[]): PeriodTotals {
  let entrou = 0;
  let saiu = 0;

  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    const cents = Math.round(tx.amountCents);
    if (tx.type === 'entrada') {
      entrou += cents;
    } else if (tx.type === 'saida') {
      saiu += cents;
    }
  }

  return {
    entrou,
    saiu,
    sobrou: entrou - saiu
  };
}

/**
 * Calcula a porcentagem usada do valor planejado para gastar no mês.
 * Retorna inteiro de 0 a 999. Se não houver valor planejado (> 0), retorna null.
 */
export function calculateBudgetUsagePercent(saiuCents: number, plannedCents: number): number | null {
  if (plannedCents <= 0) return null;
  return Math.round((saiuCents / plannedCents) * 100);
}
