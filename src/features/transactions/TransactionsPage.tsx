import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  RotateCcw,
  Search,
  ShieldCheck,
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
  deleteTransactionWithScope,
  deduplicateTransactions,
  type DeleteSeriesScope
} from './transactionService';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { ResetAllMonthsModal } from './ResetAllMonthsModal';
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

  // Exclusão individual inteligente com opções de série/repetição
  const [deletingTx, setDeletingTx] = useState<TransactionRecord | null>(null);
  const [deletingSeriesCount, setDeletingSeriesCount] = useState<number>(1);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [resetAllMonthsModalOpen, setResetAllMonthsModalOpen] = useState(false);

  const handleRequestDeleteSingle = async (tx: TransactionRecord) => {
    let count = 1;
    if (tx.recurrenceId) {
      count = await db.transactions
        .where('spaceId')
        .equals(tx.spaceId)
        .and((t) => !t.deletedAt && t.recurrenceId === tx.recurrenceId)
        .count();
    } else if (tx.installment?.groupId) {
      count = await db.transactions
        .where('spaceId')
        .equals(tx.spaceId)
        .and((t) => !t.deletedAt && t.installment?.groupId === tx.installment?.groupId)
        .count();
    }
    setDeletingSeriesCount(count);
    setDeletingTx(tx);
  };

  const handleConfirmDeleteScoped = async (scope: DeleteSeriesScope) => {
    if (!deletingTx) return;
    const res = await deleteTransactionWithScope(deletingTx.id, scope);
    setDeletingTx(null);
    if (res.isSeriesDelete && res.scope === 'all') {
      showUndoToast(`Todos os ${res.deletedCount} meses da repetição foram apagados!`, res.undo);
    } else if (res.isSeriesDelete && res.scope === 'this_and_future') {
      showUndoToast(`${res.deletedCount} meses futuros foram apagados!`, res.undo);
    } else {
      showUndoToast('Lançamento apagado!', res.undo);
    }
  };

  const handleRunDeduplication = async () => {
    if (isDeduplicating) return;
    setIsDeduplicating(true);
    try {
      const res = await deduplicateTransactions(activeSpaceId);
      if (res.duplicatesRemoved > 0) {
        showUndoToast(
          `${res.duplicatesRemoved} lançamento(s) duplicado(s) removido(s) com sucesso!`,
          res.undo
        );
      } else {
        showUndoToast('Tudo limpo! Nenhum lançamento duplicado encontrado no seu espaço.', async () => {});
      }
    } finally {
      setIsDeduplicating(false);
    }
  };

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
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-1 sm:pt-2">
        <div className="w-full sm:w-auto min-w-0">
          <h1 className="title-page text-blue-royal dark:text-sun">
            Lançamentos
          </h1>
          <p className="text-sm sm:text-base text-blue-deep/85 dark:text-cream/85 mt-0.5 sm:mt-1">
            Tudo que entrou e saiu, organizado por dia.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* Alternador de Modo de Visualização: Cartões vs Tabela Excel */}
          <div className="inline-flex items-center p-1 bg-white/90 dark:bg-[#152144]/90 backdrop-blur-md rounded-2xl border-2 border-blue-sky/70 dark:border-white/10 shadow-sm">
            <button
              type="button"
              onClick={() => handleSetViewMode('cards')}
              className={`min-h-[38px] px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
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
              className={`min-h-[38px] px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
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
            <button
              type="button"
              title={isSelectMode ? 'Cancelar remoção' : 'Remover lançamentos'}
              aria-label={isSelectMode ? 'Cancelar remoção' : 'Remover lançamentos'}
              onClick={() => {
                setIsSelectMode((v) => {
                  const next = !v;
                  if (!next) setSelectedIds(new Set());
                  return next;
                });
              }}
              className={`h-[42px] px-3.5 max-sm:px-0 max-sm:w-[42px] rounded-full font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 border-2 ${
                isSelectMode
                  ? 'bg-gradient-to-br from-sun to-[#F59E0B] text-blue-deep border-white/60 dark:border-white/20 shadow-sm hover:scale-105'
                  : 'bg-gradient-to-br from-red-soft to-[#C93B3B] text-white border-white/60 dark:border-white/20 shadow-[0_3px_10px_rgba(217,83,79,0.3)] hover:scale-105'
              }`}
            >
              {isSelectMode ? <X size={18} /> : <Trash2 size={18} />}
              <span className="hidden sm:inline">{isSelectMode ? 'Cancelar' : 'Remover'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={isImporting}
            title="Importar lançamentos CSV ou PDF"
            aria-label="Importar lançamentos CSV ou PDF"
            onClick={() => fileInputRef.current?.click()}
            className="h-[42px] px-3.5 max-sm:px-0 max-sm:w-[42px] rounded-full font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 bg-gradient-to-br from-white via-blue-sky/35 to-blue-sky/70 dark:from-[#1E2E5D] dark:via-[#162348] dark:to-[#0D152D] text-blue-royal dark:text-sun border-2 border-blue-royal/40 dark:border-sun/40 shadow-[0_3px_10px_rgba(35,70,200,0.18)] hover:shadow-[0_5px_14px_rgba(35,70,200,0.28)] hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <Upload size={18} />
            <span className="hidden sm:inline">{isImporting ? 'Lendo...' : 'Importar'}</span>
          </button>

          <button
            type="button"
            disabled={isDeduplicating}
            title="Verificar e limpar lançamentos duplicados"
            aria-label="Verificar e limpar lançamentos duplicados"
            onClick={handleRunDeduplication}
            className="h-[42px] px-3.5 max-sm:px-0 max-sm:w-[42px] rounded-full font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 bg-gradient-to-br from-white via-[#E8FAF1] to-[#C9F3DE] dark:from-[#143425] dark:via-[#0F281D] dark:to-[#0A1A13] text-green-ok dark:text-[#4ADE80] border-2 border-green-ok/40 dark:border-[#4ADE80]/40 shadow-[0_3px_10px_rgba(46,158,107,0.18)] hover:shadow-[0_5px_14px_rgba(46,158,107,0.28)] hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck size={18} />
            <span className="hidden sm:inline">
              {isDeduplicating ? 'Verificando...' : 'Sem duplicatas'}
            </span>
          </button>

          <button
            type="button"
            title="Resetar lançamentos de todos os meses"
            aria-label="Resetar lançamentos de todos os meses"
            onClick={() => setResetAllMonthsModalOpen(true)}
            className="h-[42px] px-3.5 max-sm:px-0 max-sm:w-[42px] rounded-full font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 bg-gradient-to-br from-white via-orange/15 to-orange/30 dark:from-[#331C0E] dark:via-[#26150B] dark:to-[#170C06] text-orange dark:text-sun border-2 border-orange/40 dark:border-sun/40 shadow-[0_3px_10px_rgba(255,117,24,0.18)] hover:shadow-[0_5px_14px_rgba(255,117,24,0.28)] hover:scale-105 cursor-pointer"
          >
            <RotateCcw size={18} />
            <span className="hidden sm:inline">Resetar meses</span>
          </button>

          <HelpButton
            title="Seus Lançamentos"
            explanation="Aqui você vê tudo que anotou por Dia, Semana ou Mês. Toque em 'Remover lançamentos' para selecionar tudo ou escolher só o que deseja apagar de uma vez. Você também pode importar CSV ou PDF com categorias automáticas!"
            example="Quer apagar compras de teste? Clique em 'Remover lançamentos', marque o que quiser (ou 'Selecionar tudo') e confirme."
          />
        </div>
      </header>

      {/* Layout adaptativo: Grade de 2 colunas para Cartões, ou Largura Total para Tabela Excel */}
      <div className={viewMode === 'table' ? 'space-y-6 w-full max-w-full min-w-0' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-full min-w-0'}>
        <div className={viewMode === 'table' ? 'grid grid-cols-1 md:grid-cols-2 gap-5 items-start w-full max-w-full min-w-0' : 'lg:col-span-5 space-y-5 w-full max-w-full min-w-0'}>
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
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85 truncate">
                  Entrou no período
                </span>
                <strong className="text-green-ok font-extrabold text-lg sm:text-xl block mt-0.5 truncate">
                  <AnimatedMoney cents={totals.entrou} />
                </strong>
              </div>
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85 truncate">
                  Saiu no período
                </span>
                <strong className="text-red-soft font-extrabold text-lg sm:text-xl block mt-0.5 truncate">
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
              onDeleteSingle={(tx) => void handleRequestDeleteSingle(tx)}
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
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="font-bold text-base truncate">
                                    {cat?.name || 'Categoria'}
                                    {tx.installment
                                      ? tx.installment.current === 0
                                        ? ` (Entrada + ${tx.installment.total}x)`
                                        : ` (${tx.installment.current}/${tx.installment.total})`
                                      : ''}
                                  </p>
                                  {Boolean(tx.description?.includes('Esse mês pago')) && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-green-ok/15 text-green-ok dark:text-[#4ADE80] border border-green-ok/30 shrink-0">
                                      Esse mês pago
                                    </span>
                                  )}
                                </div>
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

      {/* Barra Flutuante de Ação no Rodapé para Remoção em Massa (Portal no body para nunca cortar nem vazar a tela) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isSelectMode && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="fixed bottom-[74px] md:bottom-8 inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 w-auto sm:w-[94%] sm:max-w-xl bg-white/95 dark:bg-[#152144]/95 backdrop-blur-md rounded-2xl border-2 border-red-soft/80 shadow-[0_8px_30px_rgba(217,83,79,0.4)] p-2.5 sm:p-3 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIds.size === filteredTransactions.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
                      }
                    }}
                    className="h-10 px-2.5 sm:px-3 rounded-xl bg-cream dark:bg-white/10 text-blue-deep dark:text-cream text-xs font-bold border border-blue-sky/70 dark:border-white/20 shrink-0 hover:bg-blue-sky/30 transition-colors"
                  >
                    {selectedIds.size === filteredTransactions.length ? 'Desmarcar' : 'Todos'}
                  </button>
                  <span className="text-xs sm:text-sm font-extrabold text-blue-deep dark:text-cream truncate flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded-full bg-red-soft/20 text-red-soft font-black text-xs">
                      {selectedIds.size}
                    </span>
                    <span className="hidden sm:inline">selecionado(s)</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedIds(new Set());
                    }}
                    className="h-10 px-2.5 text-xs font-bold text-blue-deep/75 dark:text-cream/75 hover:text-blue-deep dark:hover:text-white transition-colors"
                    title="Cancelar seleção"
                  >
                    Cancelar
                  </button>
                  <Button
                    variant="danger"
                    disabled={selectedIds.size === 0}
                    onClick={() => setConfirmBulkDeleteOpen(true)}
                    className="shadow-lg h-10 !min-h-0 text-xs sm:text-sm font-extrabold px-3.5 sm:px-4 shrink-0 bg-red-soft hover:bg-red-600 text-white flex items-center gap-1.5"
                  >
                    <Trash2 size={16} />
                    <span>Apagar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

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

      <DeleteTransactionDialog
        open={Boolean(deletingTx)}
        transaction={deletingTx}
        seriesCount={deletingSeriesCount}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleConfirmDeleteScoped}
      />

      <ResetAllMonthsModal
        open={resetAllMonthsModalOpen}
        onClose={() => setResetAllMonthsModalOpen(false)}
        spaceId={activeSpaceId}
        onResetComplete={(res) => {
          showUndoToast(
            `Todos os meses foram resetados com sucesso! (${res.transactionsCount} lançamentos apagados)`,
            res.undo
          );
        }}
      />
    </div>
  );
};
