import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  Plus,
  Search,
  Square,
  Table,
  Trash2,
  Upload,
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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CategoryStampBadge } from '../../components/ui/CategoryIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnimatedMoney } from '../../components/ui/AnimatedMoney';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { importTransactionsFromFileWithUndo } from '../settings/importService';
import {
  bulkSoftDeleteTransactionsWithUndo,
  softDeleteTransactionWithUndo
} from './transactionService';
import { TransactionDetailModal } from './TransactionDetailModal';
import { TransactionsTableView } from './TransactionsTableView';

export const TransactionsPage: React.FC = () => {
  const { activeSpaceId, activeUserId, openAddModal, showUndoToast } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Modo de visualização: 'cards' (padrão) ou 'table' (estilo planilha Excel)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('libertybag_tx_view_mode') as 'cards' | 'table') || 'cards';
    }
    return 'cards';
  });

  const handleSetViewMode = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('libertybag_tx_view_mode', mode);
    }
  };

  const [mode, setMode] = useState<PeriodMode>('month');
  const [refDate, setRefDate] = useState<Date>(() => new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  // Modo de remoção com seleção individual ou selecionar tudo
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

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

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const res = await importTransactionsFromFileWithUndo(file, {
        spaceId: activeSpaceId,
        userId: activeUserId
      });

      if (res.importedCount > 0) {
        // Ajusta a visualização para o mês do lançamento mais recente importado
        const latestDate = res.items
          .map((i) => i.date)
          .sort()
          .pop();
        if (latestDate) {
          const [y, m, d] = latestDate.split('-').map(Number);
          if (y && m && d) {
            setRefDate(new Date(y, m - 1, d, 12, 0, 0));
            setMode('month');
          }
        }
        showUndoToast(
          `${res.importedCount} lançamento(s) importado(s) com categoria automática!`,
          res.undo
        );
      } else {
        showUndoToast(
          'Não encontramos lançamentos válidos nesse arquivo. Verifique o formato CSV ou PDF.',
          async () => {}
        );
      }
    } catch {
      showUndoToast('Não foi possível ler este arquivo.', async () => {});
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12" data-tutorial="transactions-view">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.pdf,text/csv,application/pdf"
        onChange={handleImportFileChange}
        className="hidden"
        aria-label="Importar arquivo CSV ou PDF"
      />

      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 pt-1 sm:pt-2">
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="title-page text-blue-royal dark:text-sun">
            Lançamentos
          </h1>
          <p className="text-sm sm:text-base text-blue-deep/85 dark:text-cream/85 mt-1 sm:mt-2">
            Tudo que entrou e saiu, organizado por dia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador de Modo de Visualização: Cartões vs Tabela Excel */}
          <div className="inline-flex items-center p-1 bg-white dark:bg-[#152144] rounded-xl border border-blue-sky/70 shadow-xs">
            <button
              type="button"
              onClick={() => handleSetViewMode('cards')}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-blue-royal text-white shadow-xs'
                  : 'text-blue-deep dark:text-cream hover:bg-cream dark:hover:bg-blue-royal/30'
              }`}
              title="Visualização em cartões dia a dia"
            >
              <LayoutGrid size={15} />
              <span>Cartões</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('table')}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-blue-royal text-white shadow-xs'
                  : 'text-blue-deep dark:text-cream hover:bg-cream dark:hover:bg-blue-royal/30'
              }`}
              title="Visualização em tabela estilo planilha com edição rápida"
            >
              <Table size={15} />
              <span>Tabela</span>
            </button>
          </div>

          {filteredTransactions.length > 0 && (
            <Button
              variant={isSelectMode ? 'sun' : 'danger'}
              size="md"
              title={isSelectMode ? 'Cancelar remoção' : 'Remover lançamentos'}
              aria-label={isSelectMode ? 'Cancelar remoção' : 'Remover lançamentos'}
              className="max-sm:min-h-[42px] max-sm:w-[42px] max-sm:h-[42px] max-sm:p-0 max-sm:rounded-full"
              onClick={() => {
                setIsSelectMode((v) => {
                  const next = !v;
                  if (!next) setSelectedIds(new Set());
                  return next;
                });
              }}
            >
              {isSelectMode ? <X size={18} /> : <Trash2 size={18} />}
              <span className="hidden sm:inline">{isSelectMode ? 'Cancelar' : 'Remover'}</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="md"
            disabled={isImporting}
            title="Importar lançamentos CSV ou PDF"
            aria-label="Importar lançamentos CSV ou PDF"
            className="max-sm:min-h-[42px] max-sm:w-[42px] max-sm:h-[42px] max-sm:p-0 max-sm:rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            <span className="hidden sm:inline">{isImporting ? 'Lendo...' : 'Importar'}</span>
          </Button>

          <HelpButton
            title="Seus Lançamentos"
            explanation="Aqui você vê tudo que anotou por Dia, Semana ou Mês. Toque em 'Remover lançamentos' para selecionar tudo ou escolher só o que deseja apagar de uma vez. Você também pode importar CSV ou PDF com categorias automáticas!"
            example="Quer apagar compras de teste? Clique em 'Remover lançamentos', marque o que quiser (ou 'Selecionar tudo') e confirme."
          />
        </div>
      </header>

      {/* Layout adaptativo: Grade de 2 colunas para Cartões, ou Largura Total para Tabela Excel */}
      <div className={viewMode === 'table' ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}>
        <div className={viewMode === 'table' ? 'grid grid-cols-1 md:grid-cols-2 gap-5 items-start' : 'lg:col-span-5 space-y-5'}>
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
                    ? 'bg-blue-royal text-white shadow-xs'
                    : 'bg-white dark:bg-blue-deep text-blue-deep dark:text-cream border-2 border-blue-royal/20 shadow-xs'
                }`}
              >
                <Filter size={18} />
                <span>{hasActiveFilter ? 'Filtro ativo' : 'Filtrar'}</span>
              </button>
            </div>
          </Card>

          {/* Painel de Busca e Filtro por Categoria */}
          {showFilters && (
            <Card variant="white" className={`space-y-4 ${viewMode === 'table' ? 'md:col-span-2' : ''}`}>
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
                <CustomSelect
                  id="filter-category"
                  value={selectedCategoryId}
                  onChange={(val) => setSelectedCategoryId(val)}
                  options={[
                    { value: 'all', label: 'Todas as categorias' },
                    ...categories.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.type === 'entrada' ? 'Entrou' : 'Saiu'})`,
                      color: c.color
                    }))
                  ]}
                />
              </div>
            </Card>
          )}
        </div>

        {/* Coluna Direita (modo cartões) ou Seção Principal (modo tabela) */}
        <div className={viewMode === 'table' ? 'space-y-5' : 'lg:col-span-7 space-y-5'}>
          {/* Barra de Ações do Modo de Seleção / Remoção em Massa */}
          {isSelectMode && filteredTransactions.length > 0 && (
            <Card variant="sun" className="p-3 sm:p-4 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIds.size === filteredTransactions.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
                    }
                  }}
                  className="min-h-[42px] px-3.5 rounded-xl bg-white dark:bg-[#152144] text-blue-deep dark:text-cream text-xs font-bold border border-blue-sky inline-flex items-center gap-2 hover:bg-cream transition-colors shadow-xs"
                >
                  {selectedIds.size === filteredTransactions.length ? (
                    <>
                      <CheckSquare size={17} className="text-blue-royal dark:text-sun shrink-0" />
                      <span>Desmarcar tudo</span>
                    </>
                  ) : (
                    <>
                      <Square size={17} className="shrink-0" />
                      <span>Selecionar tudo ({filteredTransactions.length})</span>
                    </>
                  )}
                </button>

                <span className="text-xs sm:text-sm font-extrabold text-blue-deep">
                  {selectedIds.size} de {filteredTransactions.length} selecionado(s)
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-orange/40">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedIds(new Set());
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  variant="danger"
                  size="md"
                  disabled={selectedIds.size === 0}
                  onClick={() => setConfirmBulkDeleteOpen(true)}
                >
                  <Trash2 size={17} />
                  <span>Apagar selecionados ({selectedIds.size})</span>
                </Button>
              </div>
            </Card>
          )}

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
          ) : viewMode === 'table' ? (
            <TransactionsTableView
              transactions={filteredTransactions}
              categories={categories}
              isSelectMode={isSelectMode}
              selectedIds={selectedIds}
              onToggleSelect={(id) => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              onOpenDetail={(tx) => setSelectedTx(tx)}
              onDeleteSingle={async (tx) => {
                const { undo } = await softDeleteTransactionWithUndo(tx.id);
                showUndoToast(`Lançamento "${tx.description || 'sem nome'}" apagado!`, undo);
              }}
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
                        const isSelected = selectedIds.has(tx.id);

                        return (
                          <motion.button
                            key={tx.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.18 }}
                            type="button"
                            onClick={() => {
                              if (isSelectMode) {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(tx.id)) {
                                    next.delete(tx.id);
                                  } else {
                                    next.add(tx.id);
                                  }
                                  return next;
                                });
                              } else {
                                setSelectedTx(tx);
                              }
                            }}
                            className={`w-full min-h-[72px] p-4 rounded-card bg-white dark:bg-[#152144] border flex items-center justify-between gap-3 text-left transition-all hover-lift ${
                              isSelected
                                ? 'border-red-soft ring-2 ring-red-soft/40 bg-red-soft/10 dark:bg-red-soft/20 shadow-soft'
                                : 'hover:bg-blue-sky/35 border-blue-sky/60 dark:border-blue-sky/20 shadow-card'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {isSelectMode && (
                                <div
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-red-soft border-red-soft text-white shadow-xs'
                                      : 'border-blue-sky bg-cream dark:bg-blue-deep'
                                  }`}
                                >
                                  {isSelected && <Check size={16} strokeWidth={3} />}
                                </div>
                              )}

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
                              <span
                                className={`text-xs block font-semibold ${
                                  isSelectMode
                                    ? isSelected
                                      ? 'text-red-soft'
                                      : 'text-blue-royal dark:text-sun'
                                    : 'text-blue-deep/80 dark:text-cream/80'
                                }`}
                              >
                                {isSelectMode
                                  ? isSelected
                                    ? 'Marcado p/ remover'
                                    : 'Toque p/ selecionar'
                                  : 'Toque p/ editar'}
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

      {/* Modal de Confirmação de Remoção em Massa */}
      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        title={`Apagar ${selectedIds.size} lançamento(s)?`}
        description={`Tem certeza que deseja apagar ${
          selectedIds.size === 1
            ? 'o lançamento selecionado'
            : `os ${selectedIds.size} lançamentos selecionados`
        }? Você pode desfazer a qualquer momento tocando em Desfazer.`}
        confirmLabel="Sim, apagar"
        cancelLabel="Não, voltar"
        onConfirm={async () => {
          const idsToDelete = Array.from(selectedIds);
          const res = await bulkSoftDeleteTransactionsWithUndo(idsToDelete);
          setConfirmBulkDeleteOpen(false);
          setIsSelectMode(false);
          setSelectedIds(new Set());
          showUndoToast(
            `${res.deletedCount} lançamento(s) apagado(s)!`,
            res.undo
          );
        }}
        onCancel={() => setConfirmBulkDeleteOpen(false)}
      />

      <TransactionDetailModal
        key={selectedTx?.id || 'closed'}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
};
