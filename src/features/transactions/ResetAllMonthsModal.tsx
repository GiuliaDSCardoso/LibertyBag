import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, CalendarX, CheckSquare, Square, ShieldAlert } from 'lucide-react';
import { db } from '../../db/dexie';
import { Button } from '../../components/ui/Button';
import { ModalShell } from '../../components/ui/ModalShell';
import { resetAllMonthsTransactions, type ResetAllMonthsResult } from './transactionService';

interface ResetAllMonthsModalProps {
  open: boolean;
  onClose: () => void;
  onResetComplete: (result: ResetAllMonthsResult) => void;
  spaceId?: string;
}

export const ResetAllMonthsModal: React.FC<ResetAllMonthsModalProps> = ({
  open,
  onClose,
  onResetComplete,
  spaceId
}) => {
  const [includeBudgets, setIncludeBudgets] = useState<boolean>(false);
  const [confirmWord, setConfirmWord] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    txCount: number;
    monthsCount: number;
    budgetsCount: number;
    inflowCents: number;
    outflowCents: number;
  }>({ txCount: 0, monthsCount: 0, budgetsCount: 0, inflowCents: 0, outflowCents: 0 });

  // Carrega contagem real em tempo de abertura
  useEffect(() => {
    if (!open) {
      setConfirmWord('');
      setIncludeBudgets(false);
      return;
    }

    let isMounted = true;
    (async () => {
      let txQuery = db.transactions.toCollection();
      if (spaceId) {
        txQuery = db.transactions.where('spaceId').equals(spaceId);
      }
      const activeTxs = await txQuery.and((t) => !t.deletedAt).toArray();
      const distinctMonths = new Set(activeTxs.map((t) => t.date.slice(0, 7)));

      let inflow = 0;
      let outflow = 0;
      for (const t of activeTxs) {
        if (t.type === 'entrada') inflow += t.amountCents;
        else outflow += t.amountCents;
      }

      let bQuery = db.budgets.toCollection();
      if (spaceId) {
        bQuery = db.budgets.where('spaceId').equals(spaceId);
      }
      const activeBudgets = await bQuery.and((b) => !b.deletedAt).toArray();

      if (isMounted) {
        setStats({
          txCount: activeTxs.length,
          monthsCount: distinctMonths.size,
          budgetsCount: activeBudgets.length,
          inflowCents: inflow,
          outflowCents: outflow
        });
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, spaceId]);

  const canConfirm = confirmWord.trim().toUpperCase() === 'RESETAR' || stats.txCount === 0;

  const handleExecuteReset = async () => {
    if (!canConfirm || isResetting) return;
    setIsResetting(true);
    try {
      const result = await resetAllMonthsTransactions(spaceId, { includeBudgets });
      onResetComplete(result);
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Resetar Todos os Meses"
      subtitle="Recomece seus lançamentos do zero com segurança e opção de Desfazer"
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isResetting}
            className="text-xs sm:text-sm"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="danger"
            disabled={!canConfirm || isResetting}
            onClick={handleExecuteReset}
            className="text-xs sm:text-sm !min-h-[46px] shadow-md flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} className={isResetting ? 'animate-spin' : ''} />
            <span>{isResetting ? 'Resetando...' : 'Confirmar e Resetar Todos os Meses'}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-blue-deep dark:text-cream">
        {/* Banner de Aviso Visual Retrô */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange/15 to-red-soft/20 border-2 border-orange/40 dark:border-orange/30 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-orange text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <AlertTriangle size={20} />
          </div>
          <div className="text-xs sm:text-sm space-y-1">
            <h4 className="font-bold text-orange-dark dark:text-orange text-sm">
              Ação Abrangente em Todos os Períodos
            </h4>
            <p className="leading-relaxed opacity-90">
              Esta ação removerá os lançamentos de <strong>todos os meses registrados</strong> no seu espaço.
              Seus dados não são perdidos para sempre: um botão de <strong>Desfazer</strong> ficará disponível na tela.
            </p>
          </div>
        </div>

        {/* Resumo Estatístico em Tempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
          <div className="p-3.5 rounded-2xl bg-cream dark:bg-[#0D152D] border border-blue-sky/40 dark:border-white/10">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-deep/60 dark:text-cream/60 block mb-1">
              Lançamentos
            </span>
            <span className="font-serif italic text-2xl font-extrabold text-blue-royal dark:text-sun">
              {stats.txCount}
            </span>
            <span className="text-[11px] block text-blue-deep/60 dark:text-cream/60">
              registros ativos
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-cream dark:bg-[#0D152D] border border-blue-sky/40 dark:border-white/10">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-deep/60 dark:text-cream/60 block mb-1">
              Meses Encontrados
            </span>
            <span className="font-serif italic text-2xl font-extrabold text-orange">
              {stats.monthsCount}
            </span>
            <span className="text-[11px] block text-blue-deep/60 dark:text-cream/60">
              períodos com dados
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-cream dark:bg-[#0D152D] border border-blue-sky/40 dark:border-white/10">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-deep/60 dark:text-cream/60 block mb-1">
              Orçamentos
            </span>
            <span className="font-serif italic text-2xl font-extrabold text-blue-deep dark:text-cream">
              {stats.budgetsCount}
            </span>
            <span className="text-[11px] block text-blue-deep/60 dark:text-cream/60">
              metas planejadas
            </span>
          </div>
        </div>

        {/* Opção de incluir Orçamentos Planejados */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-blue-royal-ink dark:text-sun block">
            Opções do Reset
          </label>

          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-blue-sky/40 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarX size={18} className="text-red-soft shrink-0" />
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  Apagar lançamentos de todos os meses
                </span>
                <span className="text-[11px] text-blue-deep/70 dark:text-cream/70">
                  Todas as entradas, saídas e parcelas serão limpas.
                </span>
              </div>
            </div>
            <span className="text-xs font-extrabold text-red-soft px-2 py-0.5 rounded-md bg-red-soft/10">
              Incluso
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIncludeBudgets(!includeBudgets)}
            className="w-full p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-blue-sky/40 dark:border-white/10 flex items-center justify-between gap-3 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {includeBudgets ? (
                <CheckSquare size={18} className="text-orange shrink-0" />
              ) : (
                <Square size={18} className="text-blue-deep/40 dark:text-cream/40 shrink-0" />
              )}
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  Resetar também os orçamentos de todos os meses
                </span>
                <span className="text-[11px] text-blue-deep/70 dark:text-cream/70">
                  Limpa os limites de gastos definidos na aba Planejar.
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                includeBudgets
                  ? 'bg-orange/20 text-orange'
                  : 'bg-blue-sky/20 text-blue-deep/60 dark:text-cream/60'
              }`}
            >
              {includeBudgets ? 'Ativo' : 'Opcional'}
            </span>
          </button>
        </div>

        {/* Desafio de Confirmação Segura */}
        {stats.txCount > 0 && (
          <div className="p-4 rounded-2xl bg-cream dark:bg-[#0D152D] border-2 border-red-soft/30 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-red-soft uppercase tracking-wider">
              <ShieldAlert size={16} />
              <span>Confirmação de Segurança</span>
            </div>
            <p className="text-xs text-blue-deep/80 dark:text-cream/80">
              Para evitar qualquer clique acidental, digite a palavra{' '}
              <strong className="text-red-soft tracking-wider font-extrabold">RESETAR</strong> abaixo para liberar a confirmação:
            </p>
            <input
              type="text"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder="Digite RESETAR para confirmar"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border-2 border-red-soft/40 focus:border-red-soft focus:ring-2 focus:ring-red-soft/20 text-sm font-extrabold text-red-soft placeholder:text-blue-deep/30 dark:placeholder:text-cream/30 uppercase"
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
};
