import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Check, RefreshCw } from 'lucide-react';
import { db, type PaymentMethod, type TransactionRecord, type TransactionType } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import { formatCentsToBRL, parseReaisStringToCents } from '../../lib/money';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { ModalShell } from '../../components/ui/ModalShell';
import { CustomSelect } from '../../components/ui/CustomSelect';
import {
  softDeleteTransactionWithUndo,
  updateTransactionWithUndo
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
      { updateSeries: seriesCount > 1 ? updateSeries : false }
    );

    if (res.isSeriesUpdate) {
      showUndoToast(`Alteração salva em todos os ${res.updatedCount} meses!`, res.undo);
    } else {
      showUndoToast('Alteração salva!', res.undo);
    }
    onClose();
  };

  const handleConfirmDelete = async () => {
    const { undo } = await softDeleteTransactionWithUndo(transaction.id);
    setConfirmDeleteOpen(false);
    showUndoToast('Lançamento apagado!', undo);
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
          {/* Aviso se o lançamento se repete em outros meses */}
          {seriesCount > 1 && (
            <div className="p-3.5 rounded-2xl bg-sun/20 dark:bg-sun/10 border-2 border-sun/60 flex items-start gap-3">
              <RefreshCw size={20} className="text-orange shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-blue-deep dark:text-cream">
                  <input
                    type="checkbox"
                    checked={updateSeries}
                    onChange={(e) => setUpdateSeries(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-royal focus:ring-blue-royal"
                  />
                  <span>Alterar também em todos os {seriesCount} meses da repetição</span>
                </label>
                <p className="text-xs text-blue-deep/80 dark:text-cream/80 mt-1 leading-relaxed">
                  Ao mudar a data (o dia do mês), valor ou categoria, todos os meses dessa repetição serão atualizados juntos automaticamente.
                </p>
              </div>
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

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Quer mesmo apagar este item?"
        description={`Você está apagando o registro de ${formatCentsToBRL(
          transaction.amountCents
        )}. Se mudar de ideia depois, ainda poderá tocar em "Desfazer".`}
        confirmLabel="Sim, pode apagar"
        cancelLabel="Não, deixar como está"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
};
