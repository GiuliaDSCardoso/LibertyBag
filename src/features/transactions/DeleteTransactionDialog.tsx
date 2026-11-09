import React, { useState } from 'react';
import { Calendar, FastForward, Trash2, AlertTriangle } from 'lucide-react';
import { type TransactionRecord } from '../../db/dexie';
import { formatCentsToBRL } from '../../lib/money';
import { Button } from '../../components/ui/Button';
import { ModalShell } from '../../components/ui/ModalShell';
import { type DeleteSeriesScope } from './transactionService';

interface DeleteTransactionDialogProps {
  open: boolean;
  transaction: TransactionRecord | null;
  seriesCount?: number;
  onClose: () => void;
  onConfirm: (scope: DeleteSeriesScope) => void | Promise<void>;
  isDeleting?: boolean;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

function formatFriendlyMonthYear(dateISO: string): string {
  if (!dateISO) return '';
  const parts = dateISO.split('-');
  if (parts.length < 2) return dateISO;
  const monthIdx = Number(parts[1]) - 1;
  const monthName = MONTH_NAMES[monthIdx] || parts[1];
  return `${monthName} de ${parts[0]}`;
}

export const DeleteTransactionDialog: React.FC<DeleteTransactionDialogProps> = ({
  open,
  transaction,
  seriesCount = 1,
  onClose,
  onConfirm,
  isDeleting = false
}) => {
  const [scope, setScope] = useState<DeleteSeriesScope>('only_this');

  if (!transaction) return null;

  const isSeries = seriesCount > 1;
  const monthFormatted = formatFriendlyMonthYear(transaction.date);

  const handleConfirm = () => {
    onConfirm(isSeries ? scope : 'only_this');
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={isSeries ? 'Apagar lançamento com repetição' : 'Quer apagar este lançamento?'}
      subtitle={
        isSeries
          ? `Este lançamento se repete em ${seriesCount} meses. Como você prefere apagar?`
          : 'Você pode apagar este item e restaurá-lo com Desfazer a qualquer momento.'
      }
      maxWidthClass="max-w-lg"
      zIndexClass="z-50"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto shadow-md"
          >
            <Trash2 size={18} />
            <span>
              {isDeleting
                ? 'Apagando...'
                : !isSeries
                  ? 'Sim, pode apagar'
                  : scope === 'only_this'
                    ? 'Apagar apenas este mês'
                    : scope === 'this_and_future'
                      ? 'Apagar deste mês em diante'
                      : `Apagar todos os ${seriesCount} meses`}
            </span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Card Resumo do Lançamento em Foco */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#152144] border-2 border-blue-sky/70 dark:border-white/10 shadow-card flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-deep/75 dark:text-cream/75 block">
              {transaction.type === 'saida' ? 'Dinheiro que saiu' : 'Dinheiro que entrou'} • {monthFormatted}
            </span>
            <h4 className="font-bold text-base truncate text-blue-deep dark:text-cream mt-0.5">
              {transaction.description || 'Lançamento sem descrição'}
            </h4>
            {transaction.installment && (
              <span className="inline-block mt-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-royal/15 text-blue-royal dark:text-sun">
                Parcela {transaction.installment.current} de {transaction.installment.total}
              </span>
            )}
          </div>

          <div className="text-right shrink-0">
            <span
              className={`font-serif italic font-extrabold text-xl sm:text-2xl ${
                transaction.type === 'saida' ? 'text-red-soft' : 'text-green-ok'
              }`}
            >
              {transaction.type === 'saida' ? '-' : '+'}
              {formatCentsToBRL(transaction.amountCents)}
            </span>
          </div>
        </div>

        {/* Se for uma série repetida / parcelada: Escolha do Escopo */}
        {isSeries ? (
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-deep/85 dark:text-cream/85 block px-1">
              Escolha o que deseja apagar:
            </span>

            {/* Opção 1: Apenas este mês */}
            <button
              type="button"
              onClick={() => setScope('only_this')}
              className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                scope === 'only_this'
                  ? 'border-blue-royal bg-blue-sky/30 dark:bg-blue-royal/20 shadow-sm ring-1 ring-blue-royal'
                  : 'border-blue-sky/40 dark:border-white/10 bg-white/70 dark:bg-[#152144]/70 hover:bg-white dark:hover:bg-[#152144]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  scope === 'only_this'
                    ? 'bg-blue-royal text-white'
                    : 'bg-blue-sky/40 dark:bg-white/10 text-blue-deep dark:text-cream'
                }`}
              >
                <Calendar size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-blue-deep dark:text-cream">
                    Apenas este mês ({monthFormatted})
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-royal/15 text-blue-royal dark:text-sun shrink-0">
                    1 mês
                  </span>
                </div>
                <p className="text-xs text-blue-deep/75 dark:text-cream/75 mt-1 leading-relaxed">
                  Apaga somente o lançamento deste mês selecionado. Os outros {seriesCount - 1} meses continuam valendo normalmente.
                </p>
              </div>
            </button>

            {/* Opção 2: Deste mês em diante */}
            <button
              type="button"
              onClick={() => setScope('this_and_future')}
              className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                scope === 'this_and_future'
                  ? 'border-orange bg-orange/15 dark:bg-orange/20 shadow-sm ring-1 ring-orange'
                  : 'border-blue-sky/40 dark:border-white/10 bg-white/70 dark:bg-[#152144]/70 hover:bg-white dark:hover:bg-[#152144]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  scope === 'this_and_future'
                    ? 'bg-orange text-white'
                    : 'bg-blue-sky/40 dark:bg-white/10 text-blue-deep dark:text-cream'
                }`}
              >
                <FastForward size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-blue-deep dark:text-cream">
                    Deste mês em diante ({monthFormatted} até o fim)
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange/20 text-orange dark:text-sun shrink-0">
                    Futuros
                  </span>
                </div>
                <p className="text-xs text-blue-deep/75 dark:text-cream/75 mt-1 leading-relaxed">
                  Apaga este mês e cancela os meses futuros. O histórico dos meses passados continua guardado com segurança.
                </p>
              </div>
            </button>

            {/* Opção 3: Todos os meses */}
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                scope === 'all'
                  ? 'border-red-soft bg-red-soft/15 dark:bg-red-soft/20 shadow-sm ring-1 ring-red-soft'
                  : 'border-blue-sky/40 dark:border-white/10 bg-white/70 dark:bg-[#152144]/70 hover:bg-white dark:hover:bg-[#152144]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  scope === 'all'
                    ? 'bg-red-soft text-white'
                    : 'bg-blue-sky/40 dark:bg-white/10 text-blue-deep dark:text-cream'
                }`}
              >
                <Trash2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-blue-deep dark:text-cream">
                    Em todos os {seriesCount} meses da repetição
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-soft/20 text-red-soft shrink-0">
                    Série completa
                  </span>
                </div>
                <p className="text-xs text-blue-deep/75 dark:text-cream/75 mt-1 leading-relaxed">
                  Apaga todos os meses dessa repetição (passados, atuais e futuros) e encerra a regra no planejamento.
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-sun/15 border border-sun/50 flex items-start gap-3">
            <AlertTriangle size={18} className="text-orange shrink-0 mt-0.5" />
            <p className="text-xs text-blue-deep/85 dark:text-cream/85 leading-relaxed">
              O valor sairá imediatamente dos cálculos do mês. Se você mudar de ideia, poderá restaurar este lançamento tocando em <strong>Desfazer</strong> logo após apagar.
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
