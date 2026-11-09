import React, { useState } from 'react';
import {
  Pencil,
  RefreshCw,
  Trash2
} from 'lucide-react';
import {
  type CategoryRecord,
  type PaymentMethod,
  type TransactionRecord,
  type TransactionType
} from '../../db/dexie';
import { formatCentsToBRL, parseReaisStringToCents } from '../../lib/money';
import { updateTransactionWithUndo } from './transactionService';
import { useAppStore } from '../../app/store/useAppStore';
import { CustomSelect } from '../../components/ui/CustomSelect';

interface TransactionsTableViewProps {
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  isSelectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (tx: TransactionRecord) => void;
  onDeleteSingle: (tx: TransactionRecord) => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credito: 'Cartão de Crédito',
  pix_parcelado: 'Pix Parcelado',
  debito: 'Cartão de Débito',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  outro: 'Outro'
};

export const TransactionsTableView: React.FC<TransactionsTableViewProps> = ({
  transactions,
  categories,
  isSelectMode,
  selectedIds,
  onToggleSelect,
  onOpenDetail,
  onDeleteSingle
}) => {
  const { showUndoToast } = useAppStore();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [draftDesc, setDraftDesc] = useState<{ [id: string]: string }>({});
  const [draftAmount, setDraftAmount] = useState<{ [id: string]: string }>({});

  const categoriesMap = new Map(categories.map((c) => [c.id, c]));

  const handleCommitDescription = async (tx: TransactionRecord) => {
    const raw = draftDesc[tx.id];
    if (raw === undefined || raw.trim() === tx.description) {
      setEditingCell(null);
      return;
    }
    const clean = raw.trim();
    setEditingCell(null);

    const res = await updateTransactionWithUndo(
      tx.id,
      { description: clean },
      { updateSeries: true }
    );

    if (res.isSeriesUpdate) {
      showUndoToast(`Descrição atualizada em todos os ${res.updatedCount} meses!`, res.undo);
    } else {
      showUndoToast('Descrição salva!', res.undo);
    }
  };

  const handleCommitAmount = async (tx: TransactionRecord) => {
    const raw = draftAmount[tx.id];
    if (raw === undefined) {
      setEditingCell(null);
      return;
    }
    const cents = parseReaisStringToCents(raw);
    if (cents <= 0 || cents === tx.amountCents) {
      setEditingCell(null);
      return;
    }
    setEditingCell(null);

    const res = await updateTransactionWithUndo(
      tx.id,
      { amountCents: cents },
      { updateSeries: true }
    );

    if (res.isSeriesUpdate) {
      showUndoToast(`Valor atualizado em todos os ${res.updatedCount} meses!`, res.undo);
    } else {
      showUndoToast('Valor salvo!', res.undo);
    }
  };

  const handleChangeDate = async (tx: TransactionRecord, newDate: string) => {
    if (!newDate || newDate === tx.date) return;
    const res = await updateTransactionWithUndo(
      tx.id,
      { date: newDate },
      { updateSeries: true }
    );

    if (res.isSeriesUpdate) {
      showUndoToast(`Data atualizada em todos os ${res.updatedCount} meses!`, res.undo);
    } else {
      showUndoToast('Data salva!', res.undo);
    }
  };

  const handleChangeType = async (tx: TransactionRecord) => {
    const nextType: TransactionType = tx.type === 'entrada' ? 'saida' : 'entrada';
    const res = await updateTransactionWithUndo(
      tx.id,
      { type: nextType },
      { updateSeries: true }
    );

    if (res.isSeriesUpdate) {
      showUndoToast(`Tipo alterado em todos os ${res.updatedCount} meses!`, res.undo);
    } else {
      showUndoToast('Tipo alterado!', res.undo);
    }
  };

  const handleChangeCategory = async (tx: TransactionRecord, newCatId: string) => {
    if (!newCatId || newCatId === tx.categoryId) return;
    const res = await updateTransactionWithUndo(
      tx.id,
      { categoryId: newCatId },
      { updateSeries: true }
    );

    const catName = categoriesMap.get(newCatId)?.name || 'Categoria';
    if (res.isSeriesUpdate) {
      showUndoToast(`Categoria "${catName}" salva em todos os ${res.updatedCount} meses!`, res.undo);
    } else {
      showUndoToast(`Categoria "${catName}" salva!`, res.undo);
    }
  };

  const handleChangePaymentMethod = async (tx: TransactionRecord, newPm: PaymentMethod) => {
    if (!newPm || newPm === tx.paymentMethod) return;
    const res = await updateTransactionWithUndo(
      tx.id,
      { paymentMethod: newPm },
      { updateSeries: true }
    );

    if (res.isSeriesUpdate) {
      showUndoToast(`Forma de pagamento atualizada em todos os ${res.updatedCount} meses!`, res.undo);
    } else {
      showUndoToast('Forma de pagamento salva!', res.undo);
    }
  };

  return (
    <div className="bg-white dark:bg-[#152144] rounded-card border-2 border-blue-sky/70 dark:border-blue-sky/30 shadow-card overflow-hidden">
      {/* Barra de ajuda rápida da tabela */}
      <div className="bg-cream dark:bg-blue-deep/60 px-4 py-2.5 border-b border-blue-sky/60 dark:border-blue-sky/20 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-deep/85 dark:text-cream/85">
        <div className="flex items-center gap-2 font-medium">
          <span className="font-bold text-blue-royal dark:text-sun">Modo Tabela (Estilo Excel):</span>
          <span>Clique em qualquer campo para editar na hora. Lançamentos que repetem atualizam todos os meses juntos!</span>
        </div>
        <span className="font-bold text-blue-royal dark:text-sun">
          {transactions.length} linha(s) no período
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-cream/60 dark:bg-blue-deep/80 border-b border-blue-sky/60 dark:border-blue-sky/30 text-xs font-bold text-blue-deep dark:text-cream select-none uppercase tracking-wider">
              {isSelectMode && (
                <th className="py-3 px-3 w-12 text-center">
                  <span className="sr-only">Selecionar</span>
                </th>
              )}
              <th className="py-3 px-4 w-44 min-w-[160px]">Data</th>
              <th className="py-3 px-3.5 w-32 min-w-[120px] text-center">Tipo</th>
              <th className="py-3 px-4 min-w-[240px]">Descrição / Detalhe</th>
              <th className="py-3 px-4 w-52 min-w-[190px]">Categoria</th>
              <th className="py-3 px-4 w-48 min-w-[180px]">Pagamento</th>
              <th className="py-3 px-4 w-40 min-w-[140px] text-right">Valor</th>
              <th className="py-3 px-3.5 w-28 min-w-[100px] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-sky/40 dark:divide-blue-sky/15 text-sm">
            {transactions.map((tx, idx) => {
              const isSelected = selectedIds.has(tx.id);
              const isRepeating = Boolean(tx.recurrenceId || tx.installment?.groupId);

              return (
                <tr
                  key={tx.id}
                  className={`transition-colors group ${
                    isSelected
                      ? 'bg-red-soft/10 dark:bg-red-soft/20'
                      : idx % 2 === 0
                        ? 'bg-white dark:bg-[#152144]'
                        : 'bg-cream/35 dark:bg-[#16277B]/40'
                  } hover:bg-blue-sky/20 dark:hover:bg-blue-royal/20`}
                >
                  {/* Checkbox de seleção */}
                  {isSelectMode && (
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(tx.id)}
                        className="w-4 h-4 rounded text-red-soft focus:ring-red-soft cursor-pointer"
                        aria-label={`Selecionar ${tx.description || 'lançamento'}`}
                      />
                    </td>
                  )}

                  {/* 1. Data */}
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={tx.date}
                        onChange={(e) => handleChangeDate(tx, e.target.value)}
                        className="bg-white dark:bg-[#152144] px-2.5 py-1 rounded-lg border border-blue-sky/70 dark:border-white/20 focus:border-blue-royal font-extrabold text-xs sm:text-sm text-blue-deep dark:text-cream cursor-pointer transition-all shadow-xs dark:[color-scheme:dark]"
                        title={isRepeating ? 'Lançamento repetido: mudar o dia altera em todos os meses!' : 'Mudar data'}
                      />
                      {isRepeating && (
                        <span
                          className="shrink-0 text-orange dark:text-sun p-0.5"
                          title="Repete nos outros meses. Alterações atualizam todos os meses juntos!"
                        >
                          <RefreshCw size={13} />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 2. Tipo (Entrada / Saída) */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleChangeType(tx)}
                      className={`px-2.5 py-1 rounded-pill text-xs font-extrabold inline-flex items-center gap-1 transition-transform active:scale-95 ${
                        tx.type === 'entrada'
                          ? 'bg-green-ok/15 text-green-ok border border-green-ok/30 hover:bg-green-ok/25'
                          : 'bg-red-soft/15 text-red-soft border border-red-soft/30 hover:bg-red-soft/25'
                      }`}
                      title="Clique para alternar entre Entrada e Saída"
                    >
                      <span>{tx.type === 'entrada' ? '+ Entrou' : '- Saiu'}</span>
                    </button>
                  </td>

                  {/* 3. Descrição (Edição inline como Excel) */}
                  <td className="py-2.5 px-3.5">
                    {editingCell?.id === tx.id && editingCell?.field === 'desc' ? (
                      <input
                        type="text"
                        autoFocus
                        value={draftDesc[tx.id] ?? tx.description}
                        onChange={(e) =>
                          setDraftDesc((prev) => ({ ...prev, [tx.id]: e.target.value }))
                        }
                        onBlur={() => handleCommitDescription(tx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommitDescription(tx);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-blue-deep border-2 border-blue-royal font-bold text-sm text-blue-deep dark:text-cream shadow-xs"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setDraftDesc((prev) => ({ ...prev, [tx.id]: tx.description }));
                          setEditingCell({ id: tx.id, field: 'desc' });
                        }}
                        className="px-2 py-1 rounded-lg border border-transparent hover:border-blue-sky hover:bg-white/80 dark:hover:bg-blue-deep/70 cursor-text font-bold text-sm truncate flex items-center gap-1.5"
                        title="Clique duas vezes para editar a descrição"
                      >
                        <span className="truncate">{tx.description || <span className="opacity-40 italic">Sem descrição</span>}</span>
                        {tx.description?.includes('Esse mês pago') && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-green-ok/15 text-green-ok dark:text-[#4ADE80] border border-green-ok/30 shrink-0">
                            Esse mês pago
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 4. Categoria */}
                  <td className="py-2 px-3.5 min-w-[190px]">
                    <CustomSelect
                      value={tx.categoryId}
                      onChange={(newCatId) => handleChangeCategory(tx, newCatId)}
                      size="sm"
                      options={categories
                        .filter((c) => c.type === tx.type)
                        .map((c) => ({
                          value: c.id,
                          label: c.name,
                          color: c.color
                        }))}
                    />
                  </td>

                  {/* 5. Forma de Pagamento */}
                  <td className="py-2 px-3.5 min-w-[180px]">
                    <CustomSelect
                      value={tx.paymentMethod || 'pix'}
                      onChange={(newPm) => handleChangePaymentMethod(tx, newPm as PaymentMethod)}
                      size="sm"
                      options={Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => ({
                        value: k,
                        label
                      }))}
                    />
                  </td>

                  {/* 6. Valor (R$) (Edição inline como Excel) */}
                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    {editingCell?.id === tx.id && editingCell?.field === 'amount' ? (
                      <input
                        type="text"
                        autoFocus
                        value={
                          draftAmount[tx.id] ??
                          (tx.amountCents / 100).toFixed(2).replace('.', ',')
                        }
                        onChange={(e) =>
                          setDraftAmount((prev) => ({ ...prev, [tx.id]: e.target.value }))
                        }
                        onBlur={() => handleCommitAmount(tx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommitAmount(tx);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        className="w-28 px-2 py-1 rounded-lg bg-white dark:bg-blue-deep border-2 border-blue-royal font-extrabold text-sm text-right tabular-nums shadow-xs"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setDraftAmount((prev) => ({
                            ...prev,
                            [tx.id]: (tx.amountCents / 100).toFixed(2).replace('.', ',')
                          }));
                          setEditingCell({ id: tx.id, field: 'amount' });
                        }}
                        className={`px-2 py-1 rounded-lg border border-transparent hover:border-blue-sky hover:bg-white/80 dark:hover:bg-blue-deep/70 cursor-text font-extrabold text-sm tabular-nums inline-block ${
                          tx.type === 'entrada' ? 'text-green-ok' : 'text-blue-deep dark:text-cream'
                        }`}
                        title="Clique para editar o valor"
                      >
                        {tx.type === 'entrada' ? '+' : '-'} {formatCentsToBRL(tx.amountCents)}
                      </div>
                    )}
                  </td>

                  {/* 7. Ações */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(tx)}
                        className="w-7 h-7 rounded-lg text-blue-royal dark:text-sun hover:bg-blue-sky/40 flex items-center justify-center transition-colors"
                        title="Ver detalhes completos ou editar parcelas"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSingle(tx)}
                        className="w-7 h-7 rounded-lg text-red-soft hover:bg-red-soft/15 flex items-center justify-center transition-colors"
                        title="Apagar este lançamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
