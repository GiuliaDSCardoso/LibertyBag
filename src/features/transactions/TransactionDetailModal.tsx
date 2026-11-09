import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Check, RefreshCw, Plus, Minus, Calendar } from 'lucide-react';
import { db, type PaymentMethod, type TransactionRecord, type TransactionType } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import { parseReaisStringToCents } from '../../lib/money';
import { Button } from '../../components/ui/Button';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { ModalShell } from '../../components/ui/ModalShell';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import {
  deleteTransactionWithScope,
  updateTransactionSeriesDurationWithUndo,
  updateTransactionWithUndo,
  type DeleteSeriesScope
} from './transactionService';

interface TransactionDetailModalProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose
}) => {
  const { activeSpaceId, showUndoToast } = useAppStore();

  const [amountInput, setAmountInput] = useState(() =>
    transaction ? (transaction.amountCents / 100).toFixed(2).replace('.', ',') : ''
  );
  const [type, setType] = useState<TransactionType>(() => transaction?.type || 'saida');
  const [categoryId, setCategoryId] = useState<string>(() => transaction?.categoryId || '');
  const [date, setDate] = useState<string>(() => transaction?.date || '');
  const [description, setDescription] = useState<string>(() => transaction?.description || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    () => transaction?.paymentMethod || 'pix'
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [updateSeries, setUpdateSeries] = useState(true);
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [isDurationCustomized, setIsDurationCustomized] = useState(false);
  const [makeRepeating, setMakeRepeating] = useState(false);

  const seriesCount = useLiveQuery(
    async () => {
      if (!transaction) return 0;
      if (transaction.recurrenceId) {
        return db.transactions
          .where('spaceId')
          .equals(transaction.spaceId)
          .and((t) => !t.deletedAt && t.recurrenceId === transaction.recurrenceId)
          .count();
      }
      if (transaction.installment?.groupId) {
        return db.transactions
          .where('spaceId')
          .equals(transaction.spaceId)
          .and((t) => !t.deletedAt && t.installment?.groupId === transaction.installment?.groupId)
          .count();
      }
      return 0;
    },
    [
      transaction?.id,
      transaction?.recurrenceId,
      transaction?.installment?.groupId,
      transaction?.spaceId
    ],
    0
  );

  useEffect(() => {
    if (!isDurationCustomized && seriesCount > 0) {
      setDurationMonths(seriesCount);
    }
  }, [seriesCount, isDurationCustomized]);

  const categories = useLiveQuery(
    async () =>
      db.categories
        .where('spaceId')
        .equals(activeSpaceId)
        .and((c) => !c.deletedAt && c.type === type)
        .sortBy('sortOrder'),
    [activeSpaceId, type],
    []
  );

  if (!transaction) return null;

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newCents = parseReaisStringToCents(amountInput);
    if (newCents <= 0) return;

    const chosenCategory =
      categories.find((c) => c.id === categoryId)?.id || categories[0]?.id || transaction.categoryId;

    let durationUndo: (() => Promise<void>) | null = null;
    let durationChanged = false;

    // Se alterou a quantidade de meses da série ou transformou em repetição
    const targetMonthsToApply = seriesCount > 1 || makeRepeating ? durationMonths : 1;
    if (targetMonthsToApply > 1 && targetMonthsToApply !== (seriesCount || 1)) {
      const durRes = await updateTransactionSeriesDurationWithUndo(transaction.id, targetMonthsToApply);
      if (durRes.addedCount > 0 || durRes.removedCount > 0) {
        durationUndo = durRes.undo;
        durationChanged = true;
      }
    }

    const res = await updateTransactionWithUndo(
      transaction.id,
      {
        amountCents: newCents,
        type,
        categoryId: chosenCategory,
        date,
        description: description.trim(),
        paymentMethod
      },
      { updateSeries: (seriesCount > 1 || targetMonthsToApply > 1) ? updateSeries : false }
    );

    if (durationChanged) {
      showUndoToast(`Duração atualizada para ${targetMonthsToApply} meses!`, async () => {
        await res.undo();
        if (durationUndo) await durationUndo();
      });
    } else if (res.isSeriesUpdate) {
      showUndoToast(`Alteração salva em todos os ${res.updatedCount} meses!`, res.undo);
    } else {
      showUndoToast('Alteração salva!', res.undo);
    }
    onClose();
  };

  const handleConfirmDelete = async (scope: DeleteSeriesScope) => {
    const res = await deleteTransactionWithScope(transaction.id, scope);
    setConfirmDeleteOpen(false);
    if (res.isSeriesDelete && res.scope === 'all') {
      showUndoToast(`Todos os ${res.deletedCount} meses da repetição foram apagados!`, res.undo);
    } else if (res.isSeriesDelete && res.scope === 'this_and_future') {
      showUndoToast(`${res.deletedCount} meses futuros foram apagados!`, res.undo);
    } else {
      showUndoToast('Lançamento deste mês apagado!', res.undo);
    }
    onClose();
  };

  return (
    <>
      <ModalShell
        open={Boolean(transaction)}
        onClose={onClose}
        title="Detalhes do lançamento"
        subtitle="Você pode ajustar qualquer informação abaixo ou apagar este item."
        maxWidthClass="max-w-lg"
        zIndexClass="z-40"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              variant="danger"
              fullWidth
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 size={20} />
              <span>Apagar este item</span>
            </Button>
            <Button type="button" variant="primary" fullWidth onClick={() => handleSaveEdit()}>
              <Check size={20} />
              <span>Salvar alterações</span>
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {/* Se o lançamento se repete em outros meses OU se o usuário quiser transformar em repetição */}
          {seriesCount > 1 ? (
            <div className="p-4 rounded-2xl bg-sun/20 dark:bg-sun/10 border-2 border-sun/60 space-y-3">
              <div className="flex items-start gap-3">
                <RefreshCw size={20} className="text-orange shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-blue-deep dark:text-cream">
                    <input
                      type="checkbox"
                      checked={updateSeries}
                      onChange={(e) => setUpdateSeries(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-royal focus:ring-blue-royal"
                    />
                    <span>Alterar dados em todos os meses da repetição</span>
                  </label>
                  <p className="text-xs text-blue-deep/80 dark:text-cream/80 mt-1 leading-relaxed">
                    Ao mudar valor, categoria ou dia do mês, todos os meses sincronizam automaticamente.
                  </p>
                </div>
              </div>

              {/* Controle interativo da quantidade de meses que percorre */}
              <div className="pt-2 border-t border-orange/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div>
                  <span className="block text-xs font-bold text-blue-deep dark:text-cream">
                    Duração da repetição:
                  </span>
                  <span className="text-[11px] text-blue-deep/75 dark:text-cream/75">
                    {durationMonths > seriesCount ? (
                      <span className="text-green-ok dark:text-[#4ADE80] font-bold">
                        +{durationMonths - seriesCount} meses adicionais serão gerados
                      </span>
                    ) : durationMonths < seriesCount ? (
                      <span className="text-orange font-bold">
                        -{seriesCount - durationMonths} meses futuros serão encerrados
                      </span>
                    ) : (
                      `Atualmente percorre ${seriesCount} meses no calendário`
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDurationCustomized(true);
                      setDurationMonths((prev) => Math.max(1, prev - 1));
                    }}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-[#152144] border border-blue-sky/60 flex items-center justify-center font-bold text-blue-deep dark:text-cream hover:bg-blue-sky/30"
                    aria-label="Diminuir meses"
                  >
                    <Minus size={14} />
                  </button>

                  <div className="flex items-center gap-1 bg-white dark:bg-[#152144] border-2 border-blue-royal/50 px-2.5 py-1 rounded-xl">
                    <span className="font-extrabold text-sm text-blue-royal dark:text-sun">
                      {durationMonths}
                    </span>
                    <span className="text-xs font-bold text-blue-deep/80 dark:text-cream/80">meses</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDurationCustomized(true);
                      setDurationMonths((prev) => Math.min(120, prev + 1));
                    }}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-[#152144] border border-blue-sky/60 flex items-center justify-center font-bold text-blue-deep dark:text-cream hover:bg-blue-sky/30"
                    aria-label="Aumentar meses"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-blue-sky/20 dark:bg-white/5 border border-blue-sky/40 dark:border-white/10">
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs sm:text-sm text-blue-deep dark:text-cream">
                <input
                  type="checkbox"
                  checked={makeRepeating}
                  onChange={(e) => {
                    setMakeRepeating(e.target.checked);
                    if (e.target.checked && durationMonths <= 1) {
                      setDurationMonths(12);
                    }
                  }}
                  className="w-4 h-4 rounded text-blue-royal focus:ring-blue-royal"
                />
                <Calendar size={16} className="text-blue-royal dark:text-sun" />
                <span>Repetir este lançamento nos próximos meses</span>
              </label>

              {makeRepeating && (
                <div className="pt-2.5 mt-2 border-t border-blue-sky/30 flex items-center justify-between gap-2">
                  <span className="text-xs text-blue-deep/80 dark:text-cream/80">
                    Repetir por quantos meses?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationMonths((prev) => Math.max(2, prev - 1))}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#152144] border border-blue-sky flex items-center justify-center font-bold"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-extrabold text-xs text-blue-royal dark:text-sun px-1.5">
                      {durationMonths} meses
                    </span>
                    <button
                      type="button"
                      onClick={() => setDurationMonths((prev) => Math.min(60, prev + 1))}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#152144] border border-blue-sky flex items-center justify-center font-bold"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tipo Entrou / Saiu */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setType('saida')}
              className={`min-h-[48px] rounded-xl font-bold text-sm border-2 ${
                type === 'saida'
                  ? 'bg-red-soft text-white border-red-soft'
                  : 'bg-white dark:bg-[#152144] border-blue-sky'
              }`}
            >
              Dinheiro que saiu
            </button>
            <button
              type="button"
              onClick={() => setType('entrada')}
              className={`min-h-[48px] rounded-xl font-bold text-sm border-2 ${
                type === 'entrada'
                  ? 'bg-green-ok text-white border-green-ok'
                  : 'bg-white dark:bg-[#152144] border-blue-sky'
              }`}
            >
              Dinheiro que entrou
            </button>
          </div>

          {/* Valor */}
          <div>
            <label htmlFor="edit-amount" className="block font-bold text-sm mb-1">
              Valor (em R$)
            </label>
            <input
              id="edit-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-xl bg-white dark:bg-[#152144] border-2 border-blue-sky font-extrabold text-2xl tabular-nums"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block font-bold text-sm mb-1.5">Categoria</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const selected = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`min-h-[64px] p-2 rounded-xl flex flex-col items-center justify-center gap-1 border-2 text-xs font-bold ${
                      selected
                        ? 'border-blue-royal bg-blue-sky/50 dark:bg-blue-royal/50'
                        : 'border-blue-sky/50 bg-white dark:bg-[#152144]'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} size={16} />
                    </div>
                    <span className="truncate max-w-full">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data e Forma de pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-date" className="block font-bold text-sm mb-1">
                Data
              </label>
              <input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#152144] text-blue-deep dark:text-cream border-2 border-blue-sky/70 dark:border-white/20 font-extrabold shadow-sm dark:[color-scheme:dark]"
              />
            </div>

            <div>
              <label htmlFor="edit-payment" className="block font-bold text-sm mb-1">
                Forma de pagamento
              </label>
              <CustomSelect
                id="edit-payment"
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                options={[
                  { value: 'pix', label: 'Pix (À vista)' },
                  { value: 'credito', label: 'Cartão de Crédito' },
                  { value: 'pix_parcelado', label: 'Pix Parcelado' },
                  { value: 'debito', label: 'Cartão de Débito' },
                  { value: 'dinheiro', label: 'Dinheiro' },
                  { value: 'cartao', label: 'Cartão' },
                  { value: 'outro', label: 'Outro' }
                ]}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-desc" className="block font-bold text-sm mb-1">
              Observação (opcional)
            </label>
            <input
              id="edit-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Compra da semana"
              className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky"
            />
          </div>
        </form>
      </ModalShell>

      <DeleteTransactionDialog
        open={confirmDeleteOpen}
        transaction={transaction}
        seriesCount={seriesCount}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
