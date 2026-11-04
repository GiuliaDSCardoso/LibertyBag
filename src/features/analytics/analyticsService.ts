import { type CategoryRecord, type TransactionRecord } from '../../db/dexie';
import { formatCentsToBRL } from '../../lib/money';

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amountCents: number;
  percentage: number;
}

export interface FriendlySuggestion {
  id: string;
  type: 'positive' | 'gentle_tip' | 'growth';
  title: string;
  message: string;
  whyExplanation: string; // Explicação opcional "Por que estou vendo isso?"
}

/**
 * Calcula para onde foi o dinheiro no período (agrupado por categoria de saída),
 * ordenado da maior para a menor categoria.
 */
export function buildCategoryBreakdown(
  transactions: TransactionRecord[],
  categoriesMap: Map<string, CategoryRecord>
): CategoryBreakdownItem[] {
  const activeSaidas = transactions.filter((t) => !t.deletedAt && t.type === 'saida');
  const totalSaiu = activeSaidas.reduce((acc, t) => acc + Math.round(t.amountCents), 0);

  if (totalSaiu <= 0) return [];

  const sums = new Map<string, number>();
  for (const tx of activeSaidas) {
    sums.set(tx.categoryId, (sums.get(tx.categoryId) || 0) + Math.round(tx.amountCents));
  }

  const items: CategoryBreakdownItem[] = [];
  for (const [catId, cents] of sums.entries()) {
    const cat = categoriesMap.get(catId);
    items.push({
      categoryId: catId,
      name: cat?.name || 'Outros',
      color: cat?.color || '#2346C8',
      icon: cat?.icon || 'MoreHorizontal',
      amountCents: cents,
      percentage: Math.max(1, Math.round((cents / totalSaiu) * 100))
    });
  }

  return items.sort((a, b) => b.amountCents - a.amountCents);
}

/**
 * Gera frases de comparação com o mês anterior e sugestões automáticas por regras
 * em tom gentil (nunca culpando) e com explicação "Por que estou vendo isso?".
 */
export function generateFriendlyAnalyticsSuggestions(
  currentMonthTxs: TransactionRecord[],
  prevMonthTxs: TransactionRecord[],
  categoriesMap: Map<string, CategoryRecord>
): FriendlySuggestion[] {
  const suggestions: FriendlySuggestion[] = [];

  const currentSaidas = currentMonthTxs.filter((t) => !t.deletedAt && t.type === 'saida');
  const prevSaidas = prevMonthTxs.filter((t) => !t.deletedAt && t.type === 'saida');

  const currentEntradas = currentMonthTxs.filter((t) => !t.deletedAt && t.type === 'entrada');

  const totalCurrentSaiu = currentSaidas.reduce((a, b) => a + b.amountCents, 0);
  const totalPrevSaiu = prevSaidas.reduce((a, b) => a + b.amountCents, 0);
  const totalCurrentEntrou = currentEntradas.reduce((a, b) => a + b.amountCents, 0);

  // 1. Elogio se está sobrando dinheiro neste mês
  if (totalCurrentEntrou > 0 && totalCurrentEntrou > totalCurrentSaiu) {
    const sobrou = totalCurrentEntrou - totalCurrentSaiu;
    suggestions.push({
      id: 'sug-positive-balance',
      type: 'positive',
      title: 'Seu mês está no azul!',
      message: `Até agora sobraram ${formatCentsToBRL(sobrou)} do dinheiro que entrou. Se puder, que tal guardar um pouquinho em um Cofrinho?`,
      whyExplanation: `Somamos tudo que entrou neste mês (${formatCentsToBRL(
        totalCurrentEntrou
      )}) e subtraímos tudo que saiu (${formatCentsToBRL(totalCurrentSaiu)}).`
    });
  }

  // 2. Comparação por categoria com o mês anterior
  const currByCat = new Map<string, number>();
  const prevByCat = new Map<string, number>();

  for (const t of currentSaidas) {
    currByCat.set(t.categoryId, (currByCat.get(t.categoryId) || 0) + t.amountCents);
  }
  for (const t of prevSaidas) {
    prevByCat.set(t.categoryId, (prevByCat.get(t.categoryId) || 0) + t.amountCents);
  }

  // Categoria que mais cresceu em relação ao mês passado
  let biggestIncreaseCatId: string | null = null;
  let biggestIncreaseDiff = 0;

  // Categoria onde a pessoa economizou em relação ao mês passado
  let biggestSavingsCatId: string | null = null;
  let biggestSavingsDiff = 0;

  const allCatIds = new Set([...currByCat.keys(), ...prevByCat.keys()]);
  for (const catId of allCatIds) {
    const currVal = currByCat.get(catId) || 0;
    const prevVal = prevByCat.get(catId) || 0;
    const diff = currVal - prevVal;

    if (prevVal > 0 && diff > biggestIncreaseDiff) {
      biggestIncreaseDiff = diff;
      biggestIncreaseCatId = catId;
    }
    if (prevVal > 0 && -diff > biggestSavingsDiff) {
      biggestSavingsDiff = -diff;
      biggestSavingsCatId = catId;
    }
  }

  if (biggestIncreaseCatId && biggestIncreaseDiff >= 2000) {
    const catName = categoriesMap.get(biggestIncreaseCatId)?.name || 'uma categoria';
    const currVal = currByCat.get(biggestIncreaseCatId) || 0;
    const prevVal = prevByCat.get(biggestIncreaseCatId) || 0;
    suggestions.push({
      id: `sug-increase-${biggestIncreaseCatId}`,
      type: 'growth',
      title: `Atenção carinhosa com ${catName}`,
      message: `Você gastou ${formatCentsToBRL(
        biggestIncreaseDiff
      )} a mais com ${catName} em comparação ao mês passado. Vale dar uma olhadinha se algum gasto pode esperar.`,
      whyExplanation: `No mês passado você anotou ${formatCentsToBRL(
        prevVal
      )} em ${catName}, e neste mês o valor está em ${formatCentsToBRL(currVal)}.`
    });
  }

  if (biggestSavingsCatId && biggestSavingsDiff >= 1500) {
    const catName = categoriesMap.get(biggestSavingsCatId)?.name || 'uma categoria';
    const currVal = currByCat.get(biggestSavingsCatId) || 0;
    const prevVal = prevByCat.get(biggestSavingsCatId) || 0;
    suggestions.push({
      id: `sug-saved-${biggestSavingsCatId}`,
      type: 'positive',
      title: `Muito bem em ${catName}!`,
      message: `Você gastou ${formatCentsToBRL(
        biggestSavingsDiff
      )} a menos com ${catName} do que no mês passado. Continue assim!`,
      whyExplanation: `No mês passado foram ${formatCentsToBRL(
        prevVal
      )} em ${catName}, e neste mês foram ${formatCentsToBRL(currVal)}.`
    });
  }

  // 3. Caso ainda não tenha dados do mês anterior, destaca a maior categoria do mês atual com gentileza
  if (totalPrevSaiu === 0 && totalCurrentSaiu > 0) {
    const breakdown = buildCategoryBreakdown(currentMonthTxs, categoriesMap);
    if (breakdown.length > 0) {
      const top = breakdown[0];
      suggestions.push({
        id: 'sug-top-category',
        type: 'gentle_tip',
        title: `${top.name} foi onde mais saiu dinheiro`,
        message: `Neste mês, ${top.percentage}% dos seus gastos foram em ${top.name} (${formatCentsToBRL(
          top.amountCents
        )}). Definir um valor em "Planejar" ajuda a acompanhar tranquilo.`,
        whyExplanation: `De um total de ${formatCentsToBRL(
          totalCurrentSaiu
        )} que saíram neste mês, ${formatCentsToBRL(top.amountCents)} foram anotados em ${top.name}.`
      });
    }
  }

  return suggestions;
}
