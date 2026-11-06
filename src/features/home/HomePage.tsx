import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Sparkles,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { db, type TransactionRecord } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import {
  calculateBudgetUsagePercent,
  calculatePeriodTotals,
  formatCentsToBRL,
  parseReaisStringToCents
} from '../../lib/money';
import { formatFriendlyDayHeader, getMonthKey, getPeriodRange } from '../../lib/dates';
import { getTipOfTheDay } from '../../lib/tips';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpButton } from '../../components/ui/HelpButton';
import { CategoryStampBadge } from '../../components/ui/CategoryIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnimatedMoney } from '../../components/ui/AnimatedMoney';
import { TransactionDetailModal } from '../transactions/TransactionDetailModal';

export const HomePage: React.FC = () => {
  const { userName, activeSpaceId, activeUserId, openAddModal, showUndoToast } = useAppStore();
  const shouldReduceMotion = useReducedMotion();
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const now = new Date();
  const monthRange = getPeriodRange('month', now);
  const currentMonthKey = getMonthKey(now);
  const tip = getTipOfTheDay(now);

  // Busca lançamentos do mês atual no espaço ativo
  const monthTransactions = useLiveQuery(
    async () => {
      const list = await db.transactions
        .where('spaceId')
        .equals(activeSpaceId)
        .and(
          (tx) =>
            !tx.deletedAt &&
            tx.date >= monthRange.startISO &&
            tx.date <= monthRange.endISO
        )
        .toArray();
      return list.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });
    },
    [activeSpaceId, monthRange.startISO, monthRange.endISO],
    []
  );

  // Busca categorias para exibir nomes e ícones nos últimos lançamentos
  const categoriesMap = useLiveQuery(
    async () => {
      const cats = await db.categories.where('spaceId').equals(activeSpaceId).toArray();
      return new Map(cats.map((c) => [c.id, c]));
    },
    [activeSpaceId],
    new Map()
  );

  // Busca o "Quanto posso gastar" total do mês atual (categoryId === null)
  const monthlyBudget = useLiveQuery(
    async () => {
      const items = await db.budgets
        .where('spaceId')
        .equals(activeSpaceId)
        .and((b) => !b.deletedAt && b.month === currentMonthKey && b.categoryId === null)
        .toArray();
      return items[0] || null;
    },
    [activeSpaceId, currentMonthKey],
    null
  );

  const totals = calculatePeriodTotals(monthTransactions);
  const plannedCents = monthlyBudget?.plannedCents || 0;
  const usagePercent = calculateBudgetUsagePercent(totals.saiu, plannedCents);
  const latestTransactions = monthTransactions.slice(0, 5);

  const handleSaveQuickBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseReaisStringToCents(budgetInput);
    if (cents <= 0) return;

    const timestamp = new Date().toISOString();
    const id = monthlyBudget?.id || `budget-total-${currentMonthKey}`;
    await db.budgets.put({
      id,
      userId: activeUserId,
      spaceId: activeSpaceId,
      month: currentMonthKey,
      categoryId: null,
      plannedCents: cents,
      createdAt: monthlyBudget?.createdAt || timestamp,
      updatedAt: timestamp,
      deletedAt: null
    });

    setEditingBudget(false);
    showUndoToast('Planejamento do mês salvo!', async () => {
      if (monthlyBudget) {
        await db.budgets.put(monthlyBudget);
      } else {
        await db.budgets.update(id, { deletedAt: new Date().toISOString() });
      }
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Cabeçalho com Saudação e Botão de Ajuda "?" */}
      <header className="flex items-start justify-between gap-4 pt-2">
        <div className="min-w-0 flex-1 pr-2">
          <span className="inline-block px-3 py-0.5 rounded-pill bg-sun/90 text-blue-deep text-xs font-bold mb-2 shadow-xs">
            {monthRange.label}
          </span>
          <h1 className="title-page text-blue-royal dark:text-sun">
            Olá{userName ? `, ${userName}` : ''}!
          </h1>
          <p className="text-sm sm:text-base text-blue-deep/85 dark:text-cream/85 mt-1 sm:mt-2">
            Aqui está o resumo calmo do seu mês.
          </p>
        </div>

        <HelpButton
          title="Resumo do Início"
          explanation="Esta tela mostra três números principais do mês: tudo que entrou, tudo que saiu e quanto sobrou até agora. Para anotar um novo gasto ou entrada, basta tocar no botão azul Adicionar."
          example="Se você recebeu R$ 2.000 e gastou R$ 600 no mercado e contas, o quadro 'Sobrou' mostrará R$ 1.400."
        />
      </header>

      {/* Grid de 2 colunas com respiro generoso e Soft UI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Principal (7 colunas no desktop): Ação Principal + 3 Números + Barra de Orçamento */}
        <div className="lg:col-span-7 space-y-7">
          {/* Ação Principal destacada em azul */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={openAddModal}
            className="py-3 sm:py-4 text-base sm:text-lg shadow-soft"
          >
            <Plus size={24} strokeWidth={2.75} />
            <span className="hidden sm:inline">Adicionar gasto ou entrada</span>
            <span className="sm:hidden">Novo lançamento</span>
          </Button>

          {/* Os 3 Grandes Números do Mês */}
          <section
            aria-label="Resumo do dinheiro no mês"
            data-tutorial="dashboard-summary"
            className="space-y-5"
          >
            {/* Card principal: Sobrou este mês */}
            <Card variant="framed" withFlowerWatermark staggerIndex={0}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="title-section text-blue-royal dark:text-sun">
                  Sobrou este mês
                </span>
                <Wallet size={24} className="text-blue-royal dark:text-sun shrink-0" aria-hidden="true" />
              </div>
              <p
                className={`font-sans font-extrabold text-3xl sm:text-4xl my-2 ${
                  totals.sobrou >= 0
                    ? 'text-blue-deep dark:text-white'
                    : 'text-red-soft'
                }`}
              >
                <AnimatedMoney cents={totals.sobrou} />
              </p>
              <p className="text-sm text-blue-deep/85 dark:text-cream/85">
                É o dinheiro que entrou menos o dinheiro que saiu neste mês.
              </p>
            </Card>

            {/* Entrou este mês + Saiu este mês (mesma altura h-full na linha) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
              <Card variant="white" staggerIndex={1} className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-ok/15 text-green-ok flex items-center justify-center shrink-0">
                      <ArrowUpCircle size={20} aria-hidden="true" />
                    </div>
                    <span className="font-bold text-sm sm:text-base text-blue-deep dark:text-cream">Dinheiro que entrou</span>
                  </div>
                  <p className="font-sans font-extrabold text-2xl sm:text-3xl text-green-ok my-2">
                    <AnimatedMoney cents={totals.entrou} />
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-blue-deep/80 dark:text-cream/80 mt-1.5">
                  Tudo que você recebeu neste mês (salário, extra, presente).
                </p>
              </Card>

              <Card variant="white" staggerIndex={2} className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-red-soft/15 text-red-soft flex items-center justify-center shrink-0">
                      <ArrowDownCircle size={20} aria-hidden="true" />
                    </div>
                    <span className="font-bold text-sm sm:text-base text-blue-deep dark:text-cream">Dinheiro que saiu</span>
                  </div>
                  <p className="font-sans font-extrabold text-2xl sm:text-3xl text-red-soft my-2">
                    <AnimatedMoney cents={totals.saiu} />
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-blue-deep/80 dark:text-cream/80 mt-1.5">
                  Tudo que você pagou ou comprou neste mês.
                </p>
              </Card>
            </div>
          </section>

          {/* Barra Simples: "Quanto posso gastar no mês" */}
          <Card variant="sky" staggerIndex={3}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <h2 className="title-section text-blue-deep dark:text-white">
                  Quanto posso gastar no mês
                </h2>
                {usagePercent !== null ? (
                  <p className="text-sm font-medium mt-1.5">
                    Você já usou <strong>{usagePercent}%</strong> do que planejou gastar (
                    {formatCentsToBRL(totals.saiu)} de {formatCentsToBRL(plannedCents)}).
                  </p>
                ) : (
                  <p className="text-sm mt-1.5 text-blue-deep/90 dark:text-cream/90">
                    Quer definir um valor máximo para gastar tranquilo este mês?
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setBudgetInput(plannedCents > 0 ? String(plannedCents / 100) : '2000');
                  setEditingBudget((v) => !v);
                }}
                className="min-h-[46px] px-4 rounded-pill bg-white dark:bg-[#152144] border-2 border-blue-royal/20 text-blue-royal dark:text-sun text-sm font-bold whitespace-nowrap shrink-0 shadow-xs hover:bg-cream dark:hover:bg-blue-royal/20 transition-all hover-lift"
              >
                {plannedCents > 0 ? 'Ajustar valor' : 'Definir valor'}
              </button>
            </div>

            {usagePercent !== null && (
              <div className="mt-4">
                <div
                  className="w-full h-4 bg-white dark:bg-blue-deep rounded-pill overflow-hidden p-0.5 border border-blue-royal/20"
                  role="progressbar"
                  aria-valuenow={Math.min(100, usagePercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(4, usagePercent))}%` }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: 'easeOut' }}
                    className={`h-full rounded-pill ${
                      usagePercent > 100
                        ? 'bg-red-soft'
                        : usagePercent >= 80
                          ? 'bg-orange'
                          : 'bg-blue-royal dark:bg-sun'
                    }`}
                  />
                </div>
                <p className="text-sm mt-2 text-blue-deep/90 dark:text-cream/90">
                  {plannedCents - totals.saiu >= 0
                    ? `Ainda pode gastar ${formatCentsToBRL(plannedCents - totals.saiu)} dentro do planejado.`
                    : `Você passou ${formatCentsToBRL(totals.saiu - plannedCents)} do valor planejado.`}
                </p>
              </div>
            )}

            {editingBudget && (
              <form
                onSubmit={handleSaveQuickBudget}
                className="mt-4 pt-4 border-t border-blue-royal/20 flex flex-wrap gap-3"
              >
                <input
                  type="text"
                  inputMode="decimal"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="Ex.: 2500"
                  aria-label="Valor que planeja gastar no mês em reais"
                  className="flex-1 min-w-[160px] min-h-[52px] px-4 rounded-2xl bg-white dark:bg-blue-deep text-blue-deep dark:text-white font-bold border-2 border-blue-royal"
                />
                <Button type="submit" size="md">
                  Salvar valor
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* Coluna Direita (5 colunas no desktop): Últimos lançamentos + Dica do dia */}
        <div className="lg:col-span-5 space-y-7">
          <section aria-label="Últimos lançamentos">
            <div className="flex items-center justify-between gap-2 mb-3 px-1">
              <h2 className="title-section text-blue-royal dark:text-sun">
                Últimos lançamentos
              </h2>
              <Link
                to="/lancamentos"
                className="min-h-[48px] px-4 rounded-pill inline-flex items-center gap-1.5 text-sm font-bold text-blue-royal dark:text-sun hover:bg-blue-sky/40 whitespace-nowrap shrink-0 transition-colors"
              >
                <span>Ver mais</span>
                <ChevronRight size={18} className="shrink-0" />
              </Link>
            </div>

            {latestTransactions.length === 0 ? (
              <EmptyState
                illustration="sun"
                title="Ainda não há nada anotado neste mês"
                description="Toque no botão abaixo para registrar seu primeiro gasto ou entrada em apenas 3 toques."
                actionLabel="Anote seu primeiro item"
                onAction={openAddModal}
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {latestTransactions.map((tx) => {
                    const cat = categoriesMap.get(tx.categoryId);
                    const isEntrada = tx.type === 'entrada';
                    return (
                      <motion.button
                        key={tx.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.18 }}
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="w-full min-h-[72px] p-4 rounded-card bg-white dark:bg-[#152144] hover:bg-blue-sky/35 border border-blue-sky/60 dark:border-white/10 shadow-card flex items-center justify-between gap-3 text-left transition-all hover-lift"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <CategoryStampBadge
                            name={cat?.icon || 'MoreHorizontal'}
                            color={cat?.color || '#2346C8'}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-base truncate">
                              {cat?.name || 'Categoria'}
                              {tx.installment
                                ? tx.installment.current === 0
                                  ? ` (Entrada + ${tx.installment.total}x)`
                                  : ` (${tx.installment.current}/${tx.installment.total})`
                                : ''}
                            </p>
                            <p className="text-sm text-blue-deep/80 dark:text-cream/80 truncate">
                              {tx.description ? `${tx.description} • ` : ''}
                              {formatFriendlyDayHeader(tx.date, now)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-sans font-extrabold text-base sm:text-lg tabular-nums whitespace-nowrap block ${
                              isEntrada ? 'text-green-ok' : 'text-red-soft'
                            }`}
                          >
                            {isEntrada ? '+' : '-'} {formatCentsToBRL(tx.amountCents)}
                          </span>
                          <span className="text-xs text-blue-deep/80 dark:text-cream/80 block">
                            {isEntrada ? 'Entrou' : 'Saiu'}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Cartão "Dica do dia" */}
          <Card variant="sun" withFlowerWatermark staggerIndex={4}>
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-royal text-white flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={22} />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-royal dark:text-sun block mb-1">
                  Dica do dia
                </span>
                <h3 className="font-serif italic text-xl font-bold text-blue-deep dark:text-white mb-1.5">
                  {tip.title}
                </h3>
                <p className="text-sm text-blue-deep/95 dark:text-cream leading-relaxed">{tip.text}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Detalhe / Editar / Apagar quando toca em um item */}
      <TransactionDetailModal
        key={selectedTx?.id || 'closed'}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
};
