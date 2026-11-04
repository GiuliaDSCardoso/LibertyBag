import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  X
} from 'lucide-react';
import { db, type TransactionRecord } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import {
  formatFriendlyDayHeader,
  getPeriodRange,
  shiftPeriodDate,
  type PeriodMode
} from '../../lib/dates';
import { calculatePeriodTotals, formatCentsToBRL } from '../../lib/money';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpButton } from '../../components/ui/HelpButton';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnimatedMoney } from '../../components/ui/AnimatedMoney';
import { TransactionDetailModal } from './TransactionDetailModal';

export const TransactionsPage: React.FC = () => {
  const { activeSpaceId, openAddModal } = useAppStore();

  const [mode, setMode] = useState<PeriodMode>('month');
  const [refDate, setRefDate] = useState<Date>(() => new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  const period = useMemo(() => getPeriodRange(mode, refDate), [mode, refDate]);

  const categories = useLiveQuery(
    async () =>
      db.categories
        .where('spaceId')
        .equals(activeSpaceId)
        .and((c) => !c.deletedAt)
        .sortBy('sortOrder'),
    [activeSpaceId],
    []
  );

  const categoriesMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const rawTransactions = useLiveQuery(
    async () => {
      const items = await db.transactions
        .where('spaceId')
        .equals(activeSpaceId)
        .and(
          (tx) =>
            !tx.deletedAt &&
            tx.date >= period.startISO &&
            tx.date <= period.endISO
        )
        .toArray();

      return items.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });
    },
    [activeSpaceId, period.startISO, period.endISO],
    []
  );

  // Aplica busca por texto e filtro por categoria
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawTransactions.filter((tx) => {
      if (selectedCategoryId !== 'all' && tx.categoryId !== selectedCategoryId) {
        return false;
      }
      if (!q) return true;
      const catName = categoriesMap.get(tx.categoryId)?.name.toLowerCase() || '';
      const desc = (tx.description || '').toLowerCase();
      return catName.includes(q) || desc.includes(q);
    });
  }, [rawTransactions, selectedCategoryId, searchQuery, categoriesMap]);

  const totals = useMemo(
    () => calculatePeriodTotals(filteredTransactions),
    [filteredTransactions]
  );

  // Agrupa por dia (YYYY-MM-DD)
  const groupedByDay = useMemo(() => {
    const groups: { dateISO: string; items: TransactionRecord[] }[] = [];
    const map = new Map<string, TransactionRecord[]>();
    for (const tx of filteredTransactions) {
      const existing = map.get(tx.date);
      if (existing) {
        existing.push(tx);
      } else {
        const arr = [tx];
        map.set(tx.date, arr);
        groups.push({ dateISO: tx.date, items: arr });
      }
    }
    return groups;
  }, [filteredTransactions]);

  const hasActiveFilter = searchQuery.trim() !== '' || selectedCategoryId !== 'all';

  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-4 pt-2">
        <div>
          <h1 className="title-page text-blue-royal dark:text-sun">
            Lançamentos
          </h1>
          <p className="text-base text-blue-deep/85 dark:text-cream/85 mt-2">
            Tudo que entrou e saiu, organizado por dia.
          </p>
        </div>

        <HelpButton
          title="Seus Lançamentos"
          explanation="Aqui você vê tudo que anotou por Dia, Semana ou Mês. Use as setinhas para ver meses anteriores e toque em qualquer item da lista se quiser mudar o valor ou apagar."
          example="Esqueceu se anotou a conta de luz? Toque em 'Filtrar' e escolha a categoria 'Contas'."
        />
      </header>

      {/* Layout em 2 colunas em telas >= 1024px: Controles/Resumo à esquerda, Lista à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-5">
          {/* Alternador Dia | Semana | Mês + Setas de período com maior espaçamento vertical */}
          <Card variant="white" staggerIndex={0} className="space-y-6">
            <div
              className="grid grid-cols-3 gap-1.5 bg-cream dark:bg-blue-deep p-1.5 rounded-pill"
              role="tablist"
              aria-label="Escolher período de visualização"
            >
              {(
                [
                  { id: 'day', label: 'Dia' },
                  { id: 'week', label: 'Semana' },
                  { id: 'month', label: 'Mês' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`min-h-[48px] rounded-pill font-bold text-sm transition-colors ${
                    mode === tab.id
                      ? 'bg-blue-royal text-white shadow-xs'
                      : 'text-blue-deep dark:text-cream hover:bg-blue-sky/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex pt-3 pb-1 items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setRefDate((d) => shiftPeriodDate(mode, d, -1))}
                aria-label="Período anterior"
                className="min-w-[52px] min-h-[52px] rounded-full bg-blue-sky/55 dark:bg-blue-royal/50 flex items-center justify-center hover:bg-blue-sky shrink-0 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="text-center min-w-0 px-2">
                <span className="title-section block">
                  {period.label}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setRefDate((d) => shiftPeriodDate(mode, d, 1))}
                aria-label="Próximo período"
                className="min-w-[52px] min-h-[52px] rounded-full bg-blue-sky/55 dark:bg-blue-royal/50 flex items-center justify-center hover:bg-blue-sky shrink-0 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </Card>

          {/* Resumo curto do período selecionado + Botão "Filtrar" */}
          <Card variant="sky" staggerIndex={1} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-sm text-blue-deep/85 dark:text-cream/85">
                  Entrou no período
                </span>
                <strong className="text-green-ok font-extrabold text-xl block mt-0.5">
                  <AnimatedMoney cents={totals.entrou} />
                </strong>
              </div>
              <div>
                <span className="block text-sm text-blue-deep/85 dark:text-cream/85">
                  Saiu no período
                </span>
                <strong className="text-red-soft font-extrabold text-xl block mt-0.5">
                  <AnimatedMoney cents={totals.saiu} />
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-royal/15 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">
                {filteredTransactions.length} registro(s)
              </span>

              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className={`min-h-[48px] px-5 rounded-pill font-bold text-sm inline-flex items-center gap-2.5 whitespace-nowrap transition-colors ${
                  hasActiveFilter || showFilters
                    ? 'bg-blue-royal text-white'
                    : 'bg-white dark:bg-blue-deep text-blue-deep dark:text-cream'
                }`}
              >
                <Filter size={18} />
                <span>{hasActiveFilter ? 'Filtro ativo' : 'Filtrar'}</span>
              </button>
            </div>
          </Card>

          {/* Painel de Busca e Filtro por Categoria */}
          {showFilters && (
            <Card variant="white" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base">Procurar nos lançamentos</h2>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryId('all');
                    }}
                    className="text-sm font-bold text-red-soft inline-flex items-center gap-1.5 min-h-[44px] px-3 whitespace-nowrap"
                  >
                    <X size={16} />
                    <span>Limpar filtros</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-deep/60 dark:text-cream/60"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Procurar por nome ou observação..."
                  className="w-full min-h-[50px] pl-10 pr-4 rounded-xl bg-cream dark:bg-blue-deep border border-blue-sky text-base"
                />
              </div>

              <div>
                <label htmlFor="filter-category" className="block text-sm font-bold mb-1.5">
                  Filtrar por categoria:
                </label>
                <select
                  id="filter-category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full min-h-[50px] px-3.5 rounded-xl bg-cream dark:bg-blue-deep border border-blue-sky font-bold text-sm"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'entrada' ? 'Entrou' : 'Saiu'})
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          )}
        </div>

        {/* Coluna Direita: Lista agrupada por dia ou Estado Vazio */}
        <div className="lg:col-span-7 space-y-5">
          {groupedByDay.length === 0 ? (
            <EmptyState
              illustration="wave"
              title="Nenhum lançamento neste período"
              description={
                hasActiveFilter
                  ? 'Não encontramos nada com esse filtro. Que tal limpar o filtro ou procurar outra palavra?'
                  : 'Você ainda não anotou gastos ou entradas neste período.'
              }
              actionLabel={hasActiveFilter ? 'Limpar filtro' : 'Adicionar lançamento'}
              onAction={
                hasActiveFilter
                  ? () => {
                      setSearchQuery('');
                      setSelectedCategoryId('all');
                    }
                  : openAddModal
              }
            />
          ) : (
            <div className="space-y-6">
              {groupedByDay.map((group) => (
                <section key={group.dateISO} aria-label={group.dateISO} className="space-y-3">
                  <h2 className="title-section text-blue-royal dark:text-sun px-1">
                    {formatFriendlyDayHeader(group.dateISO)}
                  </h2>

                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {group.items.map((tx) => {
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
                            className="w-full min-h-[72px] p-4 rounded-card bg-white dark:bg-[#192B85] hover:bg-blue-sky/35 border border-blue-sky/60 dark:border-blue-sky/20 shadow-card flex items-center justify-between gap-3 text-left transition-all hover-lift"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: cat?.color || '#2346C8' }}
                              >
                                <CategoryIcon name={cat?.icon || 'MoreHorizontal'} size={22} />
                              </div>
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
                                  {tx.description ||
                                    (isEntrada ? 'Dinheiro que entrou' : 'Dinheiro que saiu')}
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
                                Toque p/ editar
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </section>
              ))}

              <div className="pt-2">
                <Button fullWidth size="lg" onClick={openAddModal}>
                  <Plus size={22} />
                  <span>Adicionar lançamento</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <TransactionDetailModal
        key={selectedTx?.id || 'closed'}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
};
