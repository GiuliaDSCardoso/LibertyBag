import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import {
  PiggyBank,
  Plane,
  CalendarCheck,
  Wallet,
  Plus,
  Copy,
  Check,
  CheckCircle2,
  Repeat,
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
  Trash2,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { db, type RecurrenceRecord, type SavingsGoalRecord, type TripItemRecord } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import {
  calculateBudgetUsagePercent,
  formatCentsToBRL,
  parseReaisStringToCents
} from '../../lib/money';
import { getMonthKey, getPeriodRange, getTodayISO } from '../../lib/dates';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpButton } from '../../components/ui/HelpButton';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ModalShell } from '../../components/ui/ModalShell';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { MatisseFlower } from '../../components/illustrations/BeachIllustrations';
import { InstallmentSimulator } from '../simulation/InstallmentSimulator';
import { InvestmentSimulator } from '../investments/InvestmentSimulator';
import {
  TRIP_PARTS,
  calculateGoalMonthlyRecommendation,
  copyPreviousMonthBudgetsWithUndo,
  createRecurringBillWithUndo,
  createSavingsGoalWithUndo,
  createTripWithUndo,
  deleteGoalWithUndo,
  deleteRecurringBillWithUndo,
  markRecurringBillPaidWithUndo,
  moveGoalMoneyWithUndo,
  saveBudgetWithUndo,
  updateTripItemWithUndo
} from './planningService';

type PlanningTab = 'cofrinhos' | 'orcamento' | 'viagens' | 'contas' | 'simulador' | 'investimentos';

export const PlanningPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as PlanningTab | null;

  const { activeSpaceId, activeUserId, showUndoToast, openAddModal } = useAppStore();
  const [activeTab, setActiveTabState] = useState<PlanningTab>(() => {
    if (urlTab && ['cofrinhos', 'orcamento', 'viagens', 'contas', 'simulador', 'investimentos'].includes(urlTab)) {
      return urlTab;
    }
    return 'cofrinhos';
  });

  const setActiveTab = (tab: PlanningTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  React.useEffect(() => {
    if (urlTab && ['cofrinhos', 'orcamento', 'viagens', 'contas', 'simulador', 'investimentos'].includes(urlTab)) {
      setActiveTabState(urlTab);
    }
  }, [urlTab]);

  const now = useMemo(() => new Date(), []);
  const currentMonthKey = getMonthKey(now);
  const monthRange = getPeriodRange('month', now);

  // ---------------------------------------------------------------------------
  // DADOS REATIVOS DO DEXIE
  // ---------------------------------------------------------------------------
  const categories = useLiveQuery(
    async () =>
      db.categories
        .where('spaceId')
        .equals(activeSpaceId)
        .and((c) => !c.deletedAt && c.type === 'saida')
        .sortBy('sortOrder'),
    [activeSpaceId],
    []
  );

  const monthTransactions = useLiveQuery(
    async () =>
      db.transactions
        .where('spaceId')
        .equals(activeSpaceId)
        .and(
          (tx) =>
            !tx.deletedAt &&
            tx.type === 'saida' &&
            tx.date >= monthRange.startISO &&
            tx.date <= monthRange.endISO
        )
        .toArray(),
    [activeSpaceId, monthRange.startISO, monthRange.endISO],
    []
  );

  const monthIncomeTransactions = useLiveQuery(
    async () =>
      db.transactions
        .where('spaceId')
        .equals(activeSpaceId)
        .and(
          (tx) =>
            !tx.deletedAt &&
            tx.type === 'entrada' &&
            tx.date >= monthRange.startISO &&
            tx.date <= monthRange.endISO
        )
        .toArray(),
    [activeSpaceId, monthRange.startISO, monthRange.endISO],
    []
  );

  const monthBudgets = useLiveQuery(
    async () =>
      db.budgets
        .where('spaceId')
        .equals(activeSpaceId)
        .and((b) => !b.deletedAt && b.month === currentMonthKey)
        .toArray(),
    [activeSpaceId, currentMonthKey],
    []
  );

  const goals = useLiveQuery(
    async () =>
      db.savings_goals
        .where('spaceId')
        .equals(activeSpaceId)
        .and((g) => !g.deletedAt)
        .toArray(),
    [activeSpaceId],
    []
  );

  const trips = useLiveQuery(
    async () =>
      db.trips
        .where('spaceId')
        .equals(activeSpaceId)
        .and((t) => !t.deletedAt)
        .toArray(),
    [activeSpaceId],
    []
  );

  const tripItems = useLiveQuery(
    async () =>
      db.trip_items
        .where('spaceId')
        .equals(activeSpaceId)
        .and((i) => !i.deletedAt)
        .toArray(),
    [activeSpaceId],
    []
  );

  const recurrences = useLiveQuery(
    async () =>
      db.recurrences
        .where('spaceId')
        .equals(activeSpaceId)
        .and((r) => !r.deletedAt && r.active && r.type === 'saida')
        .toArray(),
    [activeSpaceId],
    []
  );

  // ---------------------------------------------------------------------------
  // ESTADOS DE MODAIS (TODOS ENQUADRADOS COM MODALSHELL)
  // ---------------------------------------------------------------------------
  // Modal Criar Cofrinho
  const [newGoalModalOpen, setNewGoalModalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalInitialInput, setGoalInitialInput] = useState('');

  // Modal Guardar / Retirar do Cofrinho
  const [movementGoal, setMovementGoal] = useState<SavingsGoalRecord | null>(null);
  const [movementMode, setMovementMode] = useState<'guardar' | 'retirar'>('guardar');
  const [movementAmountInput, setMovementAmountInput] = useState('');
  const [celebratingGoalName, setCelebratingGoalName] = useState<string | null>(null);

  // Modal Definir Orçamento por Categoria
  const [budgetModalCatId, setBudgetModalCatId] = useState<string | 'total' | null>(null);
  const [budgetModalTitle, setBudgetModalTitle] = useState('');
  const [budgetModalValue, setBudgetModalValue] = useState('');

  // Modal Criar Viagem
  const [newTripModalOpen, setNewTripModalOpen] = useState(false);
  const [tripName, setTripName] = useState('');
  const [tripDest, setTripDest] = useState('');
  const [tripStart, setTripStart] = useState(() => getTodayISO());
  const [tripEnd, setTripEnd] = useState(() => getTodayISO());
  const [tripGoalId, setTripGoalId] = useState<string>('');
  const [tripPartsInput, setTripPartsInput] = useState<Record<TripItemRecord['part'], string>>({
    passagem: '',
    hospedagem: '',
    comida: '',
    passeios: '',
    extras: ''
  });

  // Modal Editar Item da Viagem (Planejado / Gasto)
  const [editingTripItem, setEditingTripItem] = useState<TripItemRecord | null>(null);
  const [tripItemPlannedInput, setTripItemPlannedInput] = useState('');
  const [tripItemSpentInput, setTripItemSpentInput] = useState('');

  // Modal Nova Conta a Pagar
  const [newBillModalOpen, setNewBillModalOpen] = useState(false);
  const [billTitle, setBillTitle] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [billAmountInput, setBillAmountInput] = useState('');
  const [billDate, setBillDate] = useState(() => getTodayISO());
  const [billCategoryId, setBillCategoryId] = useState('cat-contas');
  const [billDurationType, setBillDurationType] = useState<'continua' | 'parcelada'>('continua');
  const [billTotalMonthsInput, setBillTotalMonthsInput] = useState('12');
  const [billPaidCountInput, setBillPaidCountInput] = useState('0');
  const [billToDelete, setBillToDelete] = useState<RecurrenceRecord | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleCreateGoal = async () => {
    setModalError(null);
    const trimmedName = goalName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setModalError('Digite um nome para o seu cofrinho (pelo menos 2 letras).');
      return;
    }

    const dupGoal = goals.find(
      (g) => g.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (dupGoal) {
      setModalError(`Já existe um cofrinho chamado "${dupGoal.name}".`);
      return;
    }

    const targetCents = parseReaisStringToCents(goalTargetInput);
    if (targetCents <= 0) {
      setModalError('Digite um valor de meta maior que zero (ex.: 1200).');
      return;
    }

    const initialCents = parseReaisStringToCents(goalInitialInput);
    const { goal, undo } = await createSavingsGoalWithUndo({
      userId: activeUserId,
      spaceId: activeSpaceId,
      name: trimmedName,
      targetCents,
      deadline: goalDeadline || null,
      initialSavedCents: initialCents
    });

    setNewGoalModalOpen(false);
    setGoalName('');
    setGoalTargetInput('');
    setGoalDeadline('');
    setGoalInitialInput('');
    setModalError(null);
    showUndoToast(`Cofrinho "${goal.name}" criado!`, undo);
  };

  const handleConfirmGoalMovement = async () => {
    setModalError(null);
    if (!movementGoal) return;
    const cents = parseReaisStringToCents(movementAmountInput);
    if (cents <= 0) {
      setModalError('Digite um valor maior que zero para confirmar.');
      return;
    }

    if (movementMode === 'retirar' && cents > movementGoal.savedCents) {
      setModalError(
        `Você tem ${formatCentsToBRL(movementGoal.savedCents)} guardado neste cofrinho.`
      );
      return;
    }

    const delta = movementMode === 'guardar' ? cents : -cents;
    const targetGoal = movementGoal;
    const { completedNow, undo } = await moveGoalMoneyWithUndo(targetGoal.id, delta);

    setMovementGoal(null);
    setMovementAmountInput('');
    setModalError(null);

    if (completedNow) {
      setCelebratingGoalName(targetGoal.name);
    }

    showUndoToast(
      movementMode === 'guardar'
        ? `Guardado ${formatCentsToBRL(cents)} em "${targetGoal.name}"!`
        : `Retirado ${formatCentsToBRL(cents)} de "${targetGoal.name}"!`,
      undo
    );
  };

  const handleSaveBudgetModal = async () => {
    setModalError(null);
    if (!budgetModalCatId) return;
    const cents = parseReaisStringToCents(budgetModalValue);
    if (cents <= 0) {
      setModalError('Digite um valor planejado maior que zero.');
      return;
    }

    const { undo } = await saveBudgetWithUndo({
      userId: activeUserId,
      spaceId: activeSpaceId,
      month: currentMonthKey,
      categoryId: budgetModalCatId === 'total' ? null : budgetModalCatId,
      plannedCents: cents
    });

    setBudgetModalCatId(null);
    setModalError(null);
    showUndoToast(`Planejamento de ${budgetModalTitle} salvo!`, undo);
  };

  const handleCopyPreviousMonth = async () => {
    const { copiedCount, undo } = await copyPreviousMonthBudgetsWithUndo(
      currentMonthKey,
      activeSpaceId,
      activeUserId
    );
    if (copiedCount === 0) {
      showUndoToast('Não encontramos valores planejados no mês passado.', async () => {});
    } else {
      showUndoToast(`${copiedCount} valor(es) copiados do mês passado!`, undo);
    }
  };

  const handleCreateTrip = async () => {
    setModalError(null);
    const trimmedName = tripName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setModalError('Digite o nome da viagem (pelo menos 2 letras).');
      return;
    }

    const dupTrip = trips.find(
      (t) => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (dupTrip) {
      setModalError(`Já existe uma viagem chamada "${dupTrip.name}".`);
      return;
    }

    if (tripEnd < tripStart) {
      setModalError('A data de volta não pode ser anterior à data de ida.');
      return;
    }

    const partsPlanned: Record<TripItemRecord['part'], number> = {
      passagem: parseReaisStringToCents(tripPartsInput.passagem),
      hospedagem: parseReaisStringToCents(tripPartsInput.hospedagem),
      comida: parseReaisStringToCents(tripPartsInput.comida),
      passeios: parseReaisStringToCents(tripPartsInput.passeios),
      extras: parseReaisStringToCents(tripPartsInput.extras)
    };

    const { trip, undo } = await createTripWithUndo({
      userId: activeUserId,
      spaceId: activeSpaceId,
      name: trimmedName,
      destination: tripDest.trim() || trimmedName,
      startDate: tripStart,
      endDate: tripEnd,
      goalId: tripGoalId || null,
      partsPlanned
    });

    setNewTripModalOpen(false);
    setTripName('');
    setTripDest('');
    setModalError(null);
    showUndoToast(`Viagem "${trip.name}" criada!`, undo);
  };

  const handleSaveTripItemEdit = async () => {
    if (!editingTripItem) return;
    const plannedCents = parseReaisStringToCents(tripItemPlannedInput);
    const spentCents = parseReaisStringToCents(tripItemSpentInput);
    const { undo } = await updateTripItemWithUndo(editingTripItem.id, {
      plannedCents,
      spentCents
    });
    setEditingTripItem(null);
    showUndoToast('Parte da viagem atualizada!', undo);
  };

  const handleCreateBill = async () => {
    setModalError(null);
    const trimmedTitle = billTitle.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      setModalError('Digite o nome da conta (ex.: Conta de Luz, Internet).');
      return;
    }

    const dupBill = recurrences.find(
      (r) => r.templateTitle.trim().toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (dupBill) {
      setModalError(`A conta "${dupBill.templateTitle}" já está cadastrada.`);
      return;
    }

    const cents = parseReaisStringToCents(billAmountInput);
    if (cents <= 0) {
      setModalError('Digite um valor aproximado maior que zero.');
      return;
    }

    const totalMonths =
      billDurationType === 'parcelada'
        ? Math.max(1, parseInt(billTotalMonthsInput, 10) || 12)
        : null;
    const initialPaid =
      billDurationType === 'parcelada'
        ? Math.max(0, parseInt(billPaidCountInput, 10) || 0)
        : 0;

    const { recurrence, undo } = await createRecurringBillWithUndo({
      userId: activeUserId,
      spaceId: activeSpaceId,
      title: trimmedTitle,
      description: billDescription.trim() || undefined,
      amountCents: cents,
      categoryId: billCategoryId,
      nextDate: billDate,
      totalMonths,
      paidCount: initialPaid
    });

    setNewBillModalOpen(false);
    setBillTitle('');
    setBillDescription('');
    setBillAmountInput('');
    setBillDurationType('continua');
    setBillTotalMonthsInput('12');
    setBillPaidCountInput('0');
    setModalError(null);
    showUndoToast(`Conta "${recurrence.templateTitle}" adicionada!`, undo);
  };

  const handleDeleteBill = async () => {
    if (!billToDelete) return;
    const target = billToDelete;
    const { undo } = await deleteRecurringBillWithUndo(target.id);
    setBillToDelete(null);
    showUndoToast(`Conta "${target.templateTitle}" apagada!`, undo);
  };

  const handleMarkBillPaid = async (recId: string, title: string) => {
    const { undo } = await markRecurringBillPaidWithUndo(recId);
    showUndoToast(`Conta "${title}" marcada como paga!`, undo);
  };

  // Cálculo ao vivo para a prévia no modal de Criar Cofrinho
  const livePreviewCalc = calculateGoalMonthlyRecommendation(
    parseReaisStringToCents(goalTargetInput),
    parseReaisStringToCents(goalInitialInput),
    goalDeadline || null,
    now
  );

  // Soma gasta por categoria no mês atual
  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const tx of monthTransactions) {
      map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amountCents);
      total += tx.amountCents;
    }
    return { map, total };
  }, [monthTransactions]);

  const budgetByCategory = useMemo(() => {
    const map = new Map<string | null, number>();
    for (const b of monthBudgets) {
      map.set(b.categoryId, b.plannedCents);
    }
    return map;
  }, [monthBudgets]);

  // Total de receitas/ganhos recebidos no mês
  const totalIncomeCents = useMemo(() => {
    return (monthIncomeTransactions || []).reduce((acc, tx) => acc + (tx.amountCents || 0), 0);
  }, [monthIncomeTransactions]);

  // Métricas financeiras de contas a pagar e quitação do mês
  const billsMetrics = useMemo(() => {
    let totalBillsMonthCents = 0;
    let paidBillsMonthCents = 0;
    let paidBillsCount = 0;
    let totalActiveBillsCount = 0;
    let totalLongTermDebtCents = 0;

    for (const rec of recurrences) {
      const isPaid = Boolean(
        (rec.lastPaidMonth && rec.lastPaidMonth === currentMonthKey) ||
        monthTransactions.some((t) => t.recurrenceId === rec.id && !t.deletedAt)
      );

      const isFullyPaidPast = Boolean(
        rec.totalMonths &&
        (rec.paidCount || 0) >= rec.totalMonths &&
        !isPaid
      );

      // Se já foi totalmente quitada em meses anteriores, não entra como dívida do mês atual
      if (isFullyPaidPast) {
        continue;
      }

      totalActiveBillsCount += 1;
      totalBillsMonthCents += rec.amountCents;

      if (isPaid) {
        paidBillsMonthCents += rec.amountCents;
        paidBillsCount += 1;
      }

      // Dívida total consolidada (se for parcelada, soma todas as parcelas restantes)
      if (rec.totalMonths) {
        const remainingInstallments = Math.max(0, rec.totalMonths - (rec.paidCount || 0));
        totalLongTermDebtCents += remainingInstallments * rec.amountCents;
      } else {
        // Se for conta contínua, soma o valor da conta deste mês se ainda não paga
        if (!isPaid) {
          totalLongTermDebtCents += rec.amountCents;
        }
      }
    }

    const remainingBillsMonthCents = Math.max(0, totalBillsMonthCents - paidBillsMonthCents);
    const freeBalanceCents = totalIncomeCents - remainingBillsMonthCents;
    const progressPercent = totalActiveBillsCount > 0
      ? Math.min(100, Math.round((paidBillsCount / totalActiveBillsCount) * 100))
      : 0;

    return {
      totalBillsMonthCents,
      paidBillsMonthCents,
      paidBillsCount,
      totalActiveBillsCount,
      remainingBillsMonthCents,
      totalLongTermDebtCents,
      freeBalanceCents,
      progressPercent
    };
  }, [recurrences, monthTransactions, currentMonthKey, totalIncomeCents]);

  return (
    <div className="space-y-8 pb-12" data-tutorial="planning-view">
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-3 sm:gap-4 pt-1 sm:pt-2">
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="title-page text-blue-royal dark:text-sun">
            Planejar
          </h1>
          <p className="text-sm sm:text-base text-blue-deep/85 dark:text-cream/85 mt-1 sm:mt-2">
            Seus cofrinhos, quanto pode gastar, viagens e contas de todo mês.
          </p>
        </div>

        <HelpButton
          title="Como funciona o Planejar"
          explanation="Aqui você cuida do futuro de forma simples: cria Cofrinhos (e o app calcula sozinho quanto guardar por mês), define Quanto pode gastar em cada categoria, planeja Viagens por partes e marca 'Paguei' nas contas do mês."
          example="Crie um cofrinho de R$ 1.200 para daqui a 6 meses e veja na hora a mensagem: 'Para chegar lá, guarde R$ 200,00 por mês'."
        />
      </header>

      {/* Navegação das 6 seções do Planejar */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-white dark:bg-[#152144] p-2 rounded-card border-2 border-blue-sky/70 dark:border-white/10 shadow-card"
        role="tablist"
        aria-label="Seções de planejamento"
      >
        {(
          [
            { id: 'cofrinhos', label: 'Cofrinhos', icon: PiggyBank },
            { id: 'orcamento', label: 'Quanto gastar', icon: Wallet },
            { id: 'viagens', label: 'Viagens', icon: Plane },
            { id: 'contas', label: 'Contas a pagar', icon: CalendarCheck },
            { id: 'simulador', label: 'Simular Parcelas', icon: Calculator },
            { id: 'investimentos', label: 'Investimentos', icon: TrendingUp }
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`min-h-[48px] sm:min-h-[50px] px-2 sm:px-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 transition-all ${
              activeTab === id
                ? 'bg-blue-royal text-white shadow-soft'
                : 'text-blue-deep dark:text-cream hover:bg-blue-sky/40 dark:hover:bg-blue-royal/30'
            }`}
          >
            <Icon size={17} className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Celebração leve ao completar um Cofrinho */}
      {celebratingGoalName && (
        <Card variant="sun" withFlowerWatermark className="border-2 border-orange">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <MatisseFlower size={56} />
              <div>
                <span className="text-xs font-extrabold uppercase text-blue-royal block">
                  Conquista especial!
                </span>
                <h2 className="title-section text-blue-deep">
                  Parabéns! Você completou o cofrinho &ldquo;{celebratingGoalName}&rdquo;! 🎉
                </h2>
              </div>
            </div>
            <Button variant="primary" onClick={() => setCelebratingGoalName(null)}>
              Que alegria!
            </Button>
          </div>
        </Card>
      )}

      {/* =====================================================================
          ABA 1: COFRINHOS
         ===================================================================== */}
      {activeTab === 'cofrinhos' && (
        <section className="space-y-5" aria-label="Meus Cofrinhos">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="title-section text-blue-royal dark:text-sun">
                Meus Cofrinhos
              </h2>
              <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-1">
                Separe dinheiro para seus objetivos sabendo quanto guardar por mês.
              </p>
            </div>
            <Button variant="primary" onClick={() => setNewGoalModalOpen(true)}>
              <Plus size={18} />
              <span>Novo cofrinho</span>
            </Button>
          </div>

          {goals.length === 0 ? (
            <EmptyState
              illustration="flower"
              title="Você ainda não tem nenhum cofrinho"
              description="Crie um cofrinho para uma viagem, um presente ou uma reserva. O aplicativo calcula sozinho quanto guardar por mês para chegar lá tranquilo!"
              actionLabel="Criar meu primeiro cofrinho"
              onAction={() => setNewGoalModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {goals.map((goal, idx) => {
                const calc = calculateGoalMonthlyRecommendation(
                  goal.targetCents,
                  goal.savedCents,
                  goal.deadline,
                  now
                );
                const percent = Math.min(
                  100,
                  Math.round((goal.savedCents / Math.max(1, goal.targetCents)) * 100)
                );

                return (
                  <Card
                    key={goal.id}
                    variant={calc.isCompleted ? 'sun' : 'white'}
                    withFlowerWatermark
                    staggerIndex={idx}
                    className="flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-sun text-blue-deep flex items-center justify-center shrink-0">
                            <PiggyBank size={24} />
                          </div>
                          <div>
                            <h3 className="title-section">{goal.name}</h3>
                            <span className="text-xs font-semibold opacity-80">
                              Meta: {formatCentsToBRL(goal.targetCents)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            const { undo } = await deleteGoalWithUndo(goal.id);
                            showUndoToast(`Cofrinho "${goal.name}" apagado!`, undo);
                          }}
                          aria-label={`Apagar cofrinho ${goal.name}`}
                          className="min-w-[44px] min-h-[44px] rounded-full hover:bg-red-soft/15 text-red-soft flex items-center justify-center"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div>
                        <span className="text-sm block opacity-85">Já guardou:</span>
                        <p className="font-sans font-extrabold text-3xl text-green-ok tabular-nums">
                          {formatCentsToBRL(goal.savedCents)}
                        </p>
                      </div>

                      {/* Barra de progresso suave com espaçamento vertical amplo */}
                      <div className="py-1.5 space-y-2">
                        <div className="w-full h-4 bg-cream dark:bg-blue-deep rounded-pill overflow-hidden p-0.5 border border-blue-royal/20">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(4, percent)}%` }}
                            transition={{ duration: 0.3 }}
                            className="h-full rounded-pill bg-green-ok"
                          />
                        </div>
                        <span className="text-xs font-bold block">
                          {percent}% da meta alcançada
                        </span>
                      </div>

                      {/* Texto automático: "Para chegar lá, guarde R$ X por mês" */}
                      <div className="p-3.5 rounded-2xl bg-blue-sky/45 dark:bg-blue-deep/80 border border-blue-royal/15 flex items-start gap-2.5">
                        <Sparkles size={18} className="text-blue-royal dark:text-sun shrink-0 mt-0.5" />
                        <p className="text-sm font-bold leading-snug">{calc.helperText}</p>
                      </div>
                    </div>

                    {/* Botões Guardar e Retirar */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button
                        variant="primary"
                        onClick={() => {
                          setMovementGoal(goal);
                          setMovementMode('guardar');
                          setMovementAmountInput('');
                        }}
                      >
                        <ArrowUpCircle size={18} />
                        <span>Guardar</span>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setMovementGoal(goal);
                          setMovementMode('retirar');
                          setMovementAmountInput('');
                        }}
                      >
                        <ArrowDownCircle size={18} />
                        <span>Retirar</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          ABA 2: QUANTO POSSO GASTAR (ORÇAMENTO POR CATEGORIA E TOTAL)
         ===================================================================== */}
      {activeTab === 'orcamento' && (
        <section className="space-y-5" aria-label="Quanto posso gastar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="title-section text-blue-royal dark:text-sun">
                Quanto posso gastar em {monthRange.label}
              </h2>
              <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-1">
                Compare o que você planejou com o que já saiu em cada categoria.
              </p>
            </div>

            <Button variant="secondary" onClick={handleCopyPreviousMonth}>
              <Copy size={18} />
              <span>Copiar do mês passado</span>
            </Button>
          </div>

          {/* Card de Planejado Total do Mês */}
          {(() => {
            const totalPlanned = budgetByCategory.get(null) || 0;
            const totalSpent = spentByCategory.total;
            const pct = calculateBudgetUsagePercent(totalSpent, totalPlanned);
            return (
              <Card variant="framed">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-blue-royal dark:text-sun">
                      Total planejado do mês
                    </span>
                    <h3 className="title-section mt-0.5">
                      {totalPlanned > 0
                        ? `${formatCentsToBRL(totalSpent)} gastos de ${formatCentsToBRL(totalPlanned)}`
                        : 'Nenhum limite total definido ainda'}
                    </h3>
                    <p className="text-sm opacity-85 mt-1">
                      {pct !== null
                        ? `Você usou ${pct}% do total planejado para o mês.`
                        : 'Defina um valor máximo total se quiser acompanhar o mês inteiro de uma vez.'}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setBudgetModalCatId('total');
                      setBudgetModalTitle('Total do mês');
                      setBudgetModalValue(totalPlanned > 0 ? String(totalPlanned / 100) : '');
                    }}
                  >
                    {totalPlanned > 0 ? 'Ajustar total' : 'Definir total'}
                  </Button>
                </div>
              </Card>
            );
          })()}

          {/* Lista de categorias com barras simples */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const planned = budgetByCategory.get(cat.id) || 0;
              const spent = spentByCategory.map.get(cat.id) || 0;
              const pct = calculateBudgetUsagePercent(spent, planned);

              return (
                <Card key={cat.id} variant="white" className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base truncate">{cat.name}</h3>
                        <p className="text-sm text-blue-deep/80 dark:text-cream/80 mt-0.5">
                          Saiu: <strong>{formatCentsToBRL(spent)}</strong>
                          {planned > 0 ? ` de ${formatCentsToBRL(planned)}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBudgetModalCatId(cat.id);
                        setBudgetModalTitle(cat.name);
                        setBudgetModalValue(planned > 0 ? String(planned / 100) : '');
                      }}
                      className="min-h-[46px] px-4 rounded-pill bg-blue-sky/60 dark:bg-blue-royal/50 text-blue-deep dark:text-white text-xs font-bold whitespace-nowrap shrink-0 hover:bg-blue-sky transition-colors"
                    >
                      {planned > 0 ? 'Mudar valor' : 'Planejar'}
                    </button>
                  </div>

                  {pct !== null && (
                    <div className="pt-2 space-y-2.5 border-t border-blue-sky/40 dark:border-blue-sky/20">
                      <div className="w-full h-4 bg-cream dark:bg-blue-deep rounded-pill overflow-hidden p-0.5 border border-blue-royal/15">
                        <div
                          className={`h-full rounded-pill transition-all ${
                            pct > 100
                              ? 'bg-red-soft'
                              : pct >= 80
                                ? 'bg-orange'
                                : 'bg-blue-royal dark:bg-sun'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold block pt-0.5">
                        {planned >= spent
                          ? `Ainda pode gastar ${formatCentsToBRL(planned - spent)}`
                          : `Passou ${formatCentsToBRL(spent - planned)} do planejado`}
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          ABA 3: VIAGENS
         ===================================================================== */}
      {activeTab === 'viagens' && (
        <section className="space-y-5" aria-label="Minhas Viagens">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="title-section text-blue-royal dark:text-sun">
                Planejamento de Viagens
              </h2>
              <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-1">
                Organize passagem, hospedagem, comida, passeios e extras sem susto.
              </p>
            </div>
            <Button variant="primary" onClick={() => setNewTripModalOpen(true)}>
              <Plus size={18} />
              <span>Nova viagem</span>
            </Button>
          </div>

          {trips.length === 0 ? (
            <EmptyState
              illustration="sun"
              title="Nenhuma viagem planejada ainda"
              description="Vai viajar? Crie um roteiro simples com o quanto pretende gastar em passagem, hospedagem, comida e passeios."
              actionLabel="Planejar uma viagem"
              onAction={() => setNewTripModalOpen(true)}
            />
          ) : (
            <div className="space-y-6">
              {trips.map((trip) => {
                const items = tripItems.filter((i) => i.tripId === trip.id);
                const totalPlanned = items.reduce((a, b) => a + b.plannedCents, 0);
                const totalSpent = items.reduce((a, b) => a + b.spentCents, 0);
                const linkedGoal = goals.find((g) => g.id === trip.goalId);

                return (
                  <Card key={trip.id} variant="white" className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-blue-sky/50 pb-4">
                      <div>
                        <span className="inline-block px-3 py-1 rounded-pill bg-blue-sky/60 text-blue-deep text-xs font-bold mb-1">
                          Destino: {trip.destination}
                        </span>
                        <h3 className="title-section text-blue-royal dark:text-sun">
                          {trip.name}
                        </h3>
                        {linkedGoal && (
                          <p className="text-xs font-bold text-green-ok mt-1">
                            Ligada ao cofrinho &ldquo;{linkedGoal.name}&rdquo; (guardado:{' '}
                            {formatCentsToBRL(linkedGoal.savedCents)})
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs block opacity-80">Total planejado da viagem</span>
                        <strong className="font-extrabold text-xl tabular-nums">
                          {formatCentsToBRL(totalPlanned)}
                        </strong>
                        <span className="text-xs block text-red-soft font-bold">
                          Já gasto: {formatCentsToBRL(totalSpent)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {TRIP_PARTS.map(({ part, label }) => {
                        const item = items.find((i) => i.part === part);
                        if (!item) return null;
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl bg-cream/75 dark:bg-blue-deep border border-blue-sky/60 flex flex-col justify-between gap-2"
                          >
                            <div>
                              <span className="font-bold text-sm block">{label}</span>
                              <p className="text-xs opacity-80 mt-0.5">
                                Planejado: <strong>{formatCentsToBRL(item.plannedCents)}</strong>
                              </p>
                              <p className="text-xs text-red-soft font-semibold">
                                Gasto: {formatCentsToBRL(item.spentCents)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTripItem(item);
                                setTripItemPlannedInput(String(item.plannedCents / 100));
                                setTripItemSpentInput(String(item.spentCents / 100));
                              }}
                              className="min-h-[40px] px-3 rounded-pill bg-white dark:bg-[#152144] text-blue-royal dark:text-sun text-xs font-bold border border-blue-sky"
                            >
                              Ajustar valores
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          ABA 4: CONTAS A PAGAR (RECORRENTES COM BOTÃO "PAGUEI")
         ===================================================================== */}
      {activeTab === 'contas' && (
        <section className="space-y-6" aria-label="Contas a pagar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="title-section text-blue-royal dark:text-sun">
                Contas que se repetem todo mês
              </h2>
              <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-1">
                Acompanhe seus ganhos, dívidas e veja o valor restante descontar na hora ao tocar em &ldquo;Paguei&rdquo;.
              </p>
            </div>
            <Button variant="primary" onClick={() => setNewBillModalOpen(true)}>
              <Plus size={18} />
              <span>Nova conta mensal</span>
            </Button>
          </div>

          {/* Painel Resumo Financeiro de Contas (Ganhos vs Dívidas com Desconto em Tempo Real) */}
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Total de Ganhos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-[#10B981]/15 to-[#059669]/5 dark:from-[#10B981]/20 dark:to-[#059669]/10 border-2 border-[#10B981]/40 dark:border-[#10B981]/30 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-[#34D399]">
                    Total de Ganhos
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ArrowUpCircle size={18} />
                  </div>
                </div>
                <div className="mt-2.5">
                  <p className="text-2xl font-extrabold font-serif italic text-blue-deep dark:text-white tabular-nums">
                    {formatCentsToBRL(totalIncomeCents)}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-blue-deep/70 dark:text-cream/70 font-semibold">
                    <span>
                      {monthIncomeTransactions.length === 1
                        ? '1 entrada neste mês'
                        : `${monthIncomeTransactions.length} entradas neste mês`}
                    </span>
                    {totalIncomeCents === 0 && (
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="text-blue-royal dark:text-sun font-bold underline cursor-pointer"
                      >
                        + Anotar ganho
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Total de Contas / Dívidas do Mês */}
              <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-blue-sky/40 to-blue-sky/10 dark:from-white/10 dark:to-white/5 border-2 border-blue-sky/70 dark:border-white/15 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-royal dark:text-sun">
                    Total de Dívidas / Contas
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-royal dark:bg-sun text-white dark:text-blue-deep flex items-center justify-center shrink-0 shadow-xs">
                    <CalendarCheck size={18} />
                  </div>
                </div>
                <div className="mt-2.5">
                  <p className="text-2xl font-extrabold font-serif italic text-blue-deep dark:text-white tabular-nums">
                    {formatCentsToBRL(billsMetrics.totalBillsMonthCents)}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-blue-deep/70 dark:text-cream/70 font-semibold">
                    <span>{billsMetrics.totalActiveBillsCount} contas cadastradas</span>
                    {billsMetrics.totalLongTermDebtCents > 0 && (
                      <span className="text-orange font-bold" title="Total somando todas as parcelas futuras de dívidas">
                        Parcelado: {formatCentsToBRL(billsMetrics.totalLongTermDebtCents)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Falta Pagar (Desconta conforme vai pagando!) */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border-2 shadow-xs relative overflow-hidden transition-all ${
                  billsMetrics.remainingBillsMonthCents === 0 && billsMetrics.totalActiveBillsCount > 0
                    ? 'bg-linear-to-br from-[#10B981]/15 to-[#059669]/5 dark:from-[#10B981]/20 dark:to-[#059669]/10 border-[#10B981]/50'
                    : 'bg-linear-to-br from-[#EF4444]/15 to-[#DC2626]/5 dark:from-[#EF4444]/20 dark:to-[#DC2626]/10 border-[#EF4444]/40 dark:border-[#EF4444]/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      billsMetrics.remainingBillsMonthCents === 0 && billsMetrics.totalActiveBillsCount > 0
                        ? 'text-[#059669] dark:text-[#34D399]'
                        : 'text-[#DC2626] dark:text-[#F87171]'
                    }`}
                  >
                    Falta Pagar
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                      billsMetrics.remainingBillsMonthCents === 0 && billsMetrics.totalActiveBillsCount > 0
                        ? 'bg-[#10B981]'
                        : 'bg-[#EF4444]'
                    }`}
                  >
                    {billsMetrics.remainingBillsMonthCents === 0 && billsMetrics.totalActiveBillsCount > 0 ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <ArrowDownCircle size={18} />
                    )}
                  </div>
                </div>
                <div className="mt-2.5">
                  <p
                    className={`text-2xl font-extrabold font-serif italic tabular-nums ${
                      billsMetrics.remainingBillsMonthCents === 0 && billsMetrics.totalActiveBillsCount > 0
                        ? 'text-[#059669] dark:text-[#34D399]'
                        : 'text-[#DC2626] dark:text-[#F87171]'
                    }`}
                  >
                    {formatCentsToBRL(billsMetrics.remainingBillsMonthCents)}
                  </p>
                  <p className="mt-1 text-[11px] text-blue-deep/70 dark:text-cream/70 font-semibold truncate">
                    {billsMetrics.remainingBillsMonthCents === 0 && billsMetrics.totalActiveBillsCount > 0 ? (
                      '🎉 Todas as contas pagas no mês!'
                    ) : (
                      <>
                        {billsMetrics.paidBillsCount} de {billsMetrics.totalActiveBillsCount} pagas
                        {billsMetrics.paidBillsMonthCents > 0 && ` (-${formatCentsToBRL(billsMetrics.paidBillsMonthCents)} descontados)`}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Card 4: Sobra Prevista / Saldo Livre */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border-2 shadow-xs relative overflow-hidden transition-all ${
                  billsMetrics.freeBalanceCents >= 0
                    ? 'bg-linear-to-br from-sun/25 to-sun/10 dark:from-[#FFD84D]/15 dark:to-transparent border-sun/60 dark:border-sun/40'
                    : 'bg-linear-to-br from-[#EF4444]/20 to-transparent border-[#EF4444]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-royal dark:text-sun">
                    Sobra Prevista
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF8833] to-[#FF7518] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles size={18} />
                  </div>
                </div>
                <div className="mt-2.5">
                  <p
                    className={`text-2xl font-extrabold font-serif italic tabular-nums ${
                      billsMetrics.freeBalanceCents >= 0
                        ? 'text-blue-deep dark:text-white'
                        : 'text-red-soft font-bold'
                    }`}
                  >
                    {formatCentsToBRL(billsMetrics.freeBalanceCents)}
                  </p>
                  <p className="mt-1 text-[11px] text-blue-deep/70 dark:text-cream/70 font-semibold truncate">
                    {billsMetrics.freeBalanceCents >= 0
                      ? 'Ganhos menos contas que faltam pagar'
                      : 'Atenção: contas superam os ganhos do mês'}
                  </p>
                </div>
              </div>
            </div>

            {/* Barra de Progresso e Quitação do Mês com Desconto Dinâmico */}
            {billsMetrics.totalActiveBillsCount > 0 && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#152144] border-2 border-blue-sky/60 dark:border-white/10 shadow-card space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-royal dark:text-sun font-extrabold uppercase tracking-wider text-[11px]">
                      Quitação do Mês:
                    </span>
                    <span className="text-blue-deep dark:text-cream">
                      {billsMetrics.paidBillsCount} de {billsMetrics.totalActiveBillsCount} contas pagas ({billsMetrics.progressPercent}%)
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-green-ok dark:text-[#4ADE80]">
                    {formatCentsToBRL(billsMetrics.paidBillsMonthCents)} descontados de {formatCentsToBRL(billsMetrics.totalBillsMonthCents)}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-cream dark:bg-[#0D152D] overflow-hidden border border-blue-sky/40">
                  <div
                    className="h-full bg-linear-to-r from-blue-royal via-[#10B981] to-green-ok rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${billsMetrics.progressPercent}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-deep/75 dark:text-cream/75">
                  <span>
                    💡 Toque no botão <strong className="text-blue-royal dark:text-sun">&ldquo;Paguei!&rdquo;</strong> de qualquer conta abaixo para dar baixa. O valor restante é descontado na hora!
                  </span>
                  {billsMetrics.remainingBillsMonthCents > 0 ? (
                    <span className="font-bold text-orange shrink-0">
                      Falta quitar {formatCentsToBRL(billsMetrics.remainingBillsMonthCents)}
                    </span>
                  ) : (
                    <span className="font-bold text-green-ok dark:text-[#4ADE80] shrink-0">
                      Parabéns! Todas as contas do mês quitadas. 🎉
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {recurrences.length === 0 ? (
            <EmptyState
              illustration="wave"
              title="Nenhuma conta mensal cadastrada"
              description="Cadastre contas fixas como Luz, Água, Internet ou Aluguel para lembrar do vencimento e marcar como paga com 1 toque."
              actionLabel="Cadastrar conta mensal"
              onAction={() => setNewBillModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recurrences.map((rec) => {
                const cat = categories.find((c) => c.id === rec.categoryId);
                const isPaidThisMonth = Boolean(
                  (rec.lastPaidMonth && rec.lastPaidMonth === currentMonthKey) ||
                  monthTransactions.some((t) => t.recurrenceId === rec.id && !t.deletedAt)
                );

                return (
                  <Card
                    key={rec.id}
                    variant="white"
                    className="p-5 sm:p-6 space-y-4 relative overflow-hidden"
                  >
                    {/* Cabeçalho do Card: Ícone da categoria, Categoria, Título e Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs border border-white/30"
                          style={{ backgroundColor: cat?.color || '#2346C8' }}
                        >
                          <CategoryIcon name={cat?.icon || 'FileText'} size={22} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-deep/60 dark:text-cream/60">
                              {cat?.name || 'Contas'}
                            </span>
                            {isPaidThisMonth ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-ok/15 text-green-ok dark:text-[#4ADE80] font-extrabold text-[11px] border border-green-ok/30">
                                <CheckCircle2 size={13} />
                                <span>Esse mês pago (Descontado)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange/15 text-orange dark:text-sun font-extrabold text-[11px] border border-orange/30">
                                <span>Pendente (A descontar)</span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-lg text-blue-deep dark:text-white truncate">
                            {rec.templateTitle}
                          </h3>
                        </div>
                      </div>

                      {/* Botão de Apagar Conta */}
                      <button
                        type="button"
                        onClick={() => setBillToDelete(rec)}
                        aria-label={`Apagar conta ${rec.templateTitle}`}
                        className="w-10 h-10 rounded-full hover:bg-red-soft/15 text-red-soft flex items-center justify-center transition-colors active:scale-95 shrink-0"
                        title="Apagar esta conta mensal"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Descrição detalhada da conta (se houver) */}
                    {rec.description && (
                      <p className="text-xs text-blue-deep/80 dark:text-cream/80 bg-cream/70 dark:bg-[#0D152D]/60 p-2.5 rounded-xl border border-blue-sky/40 dark:border-white/10 leading-relaxed">
                        {rec.description}
                      </p>
                    )}

                    {/* Valor e Vencimento */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div>
                        <span className="text-xs font-bold uppercase text-orange block">
                          {isPaidThisMonth ? 'Próximo vencimento:' : 'Vencimento deste mês:'}{' '}
                          {rec.nextDate.split('-').reverse().join('/')}
                        </span>
                        <p className="font-extrabold text-2xl text-blue-royal dark:text-sun tabular-nums">
                          {formatCentsToBRL(rec.amountCents)}
                        </p>
                      </div>
                    </div>

                    {/* Informações de Repetição e Parcelas Faltantes */}
                    {rec.totalMonths ? (
                      (() => {
                        const total = rec.totalMonths;
                        const paid = rec.paidCount || 0;
                        const remaining = Math.max(0, total - paid);
                        const pct = Math.min(100, Math.round((paid / total) * 100));
                        return (
                          <div className="p-3 rounded-2xl bg-blue-sky/20 dark:bg-white/5 border border-blue-sky/35 dark:border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-blue-deep/80 dark:text-cream/80 flex items-center gap-1.5">
                                <Repeat size={14} className="text-blue-royal dark:text-sun shrink-0" />
                                <span>Repete em {total} meses</span>
                              </span>
                              <span
                                className={
                                  remaining === 0
                                    ? 'text-green-ok font-extrabold'
                                    : 'text-orange font-extrabold'
                                }
                              >
                                {remaining === 0
                                  ? 'Todas pagas!'
                                  : `Faltam ${remaining} ${remaining === 1 ? 'parcela' : 'parcelas'}`}
                              </span>
                            </div>

                            <div className="w-full h-2 rounded-full bg-cream dark:bg-[#0D152D] overflow-hidden border border-blue-sky/30">
                              <div
                                className="h-full bg-green-ok rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            <div className="flex justify-between items-center text-[11px] text-blue-deep/70 dark:text-cream/70 font-semibold">
                              <span>Parcela {paid} de {total}</span>
                              <span>{pct}% concluído</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-deep/75 dark:text-cream/75 p-2.5 rounded-xl bg-blue-sky/15 dark:bg-white/5 border border-blue-sky/30 dark:border-white/10">
                        <Repeat size={14} className="text-blue-royal dark:text-sun shrink-0" />
                        <span>Repete todo mês (Fixa contínua) • {rec.paidCount || 0} meses já pagos</span>
                      </div>
                    )}

                    {/* Botão de Ação: Paguei! / Pagar próx. mês */}
                    <div className="pt-2 border-t border-blue-sky/30 dark:border-white/10 flex items-center justify-between gap-2">
                      <div className="text-xs">
                        {isPaidThisMonth ? (
                          <span className="text-green-ok dark:text-[#4ADE80] font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            Abatida do total do mês
                          </span>
                        ) : (
                          <span className="text-blue-deep/70 dark:text-cream/70 text-[11px]">
                            Toque para abater do total
                          </span>
                        )}
                      </div>
                      <Button
                        variant={isPaidThisMonth ? 'secondary' : 'primary'}
                        size="md"
                        onClick={() => handleMarkBillPaid(rec.id, rec.templateTitle)}
                        className="shadow-sm"
                      >
                        <Check size={18} />
                        <span>{isPaidThisMonth ? 'Pagar próx. mês' : 'Paguei!'}</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          ABA 5: SIMULADOR DE PARCELAMENTO (PIX E CARTÃO DE CRÉDITO)
         ===================================================================== */}
      {activeTab === 'simulador' && (
        <section aria-label="Simulador de parcelamento">
          <InstallmentSimulator />
        </section>
      )}

      {/* =====================================================================
          ABA 6: SIMULADOR DE INVESTIMENTOS & METAS (FASE 4)
         ===================================================================== */}
      {activeTab === 'investimentos' && (
        <section aria-label="Simulador de investimentos e metas">
          <InvestmentSimulator />
        </section>
      )}

      {/* 1. Modal Criar Novo Cofrinho */}
      <ModalShell
        open={newGoalModalOpen}
        onClose={() => setNewGoalModalOpen(false)}
        title="Novo cofrinho"
        subtitle="Dê um nome para o seu objetivo e veja quanto guardar por mês."
        maxWidthClass="max-w-lg"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setNewGoalModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleCreateGoal}>
              <Check size={18} />
              <span>Criar cofrinho</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div role="alert" className="p-3 rounded-xl bg-red-soft/15 text-red-soft border border-red-soft/40 text-xs font-bold">
              {modalError}
            </div>
          )}
          <div>
            <label htmlFor="goal-name" className="block font-bold text-base mb-1">
              Qual é o objetivo deste cofrinho?
            </label>
            <input
              id="goal-name"
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="Ex.: Viagem para a praia, Reserva de paz..."
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border-2 border-blue-sky font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-target" className="block font-bold text-sm mb-1">
                Valor da meta (R$)
              </label>
              <input
                id="goal-target"
                type="text"
                inputMode="decimal"
                value={goalTargetInput}
                onChange={(e) => setGoalTargetInput(e.target.value)}
                placeholder="Ex.: 1200"
                className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border-2 border-blue-sky font-bold text-lg"
              />
            </div>

            <div>
              <label htmlFor="goal-initial" className="block font-bold text-sm mb-1">
                Já tem algo guardado? (opcional)
              </label>
              <input
                id="goal-initial"
                type="text"
                inputMode="decimal"
                value={goalInitialInput}
                onChange={(e) => setGoalInitialInput(e.target.value)}
                placeholder="Ex.: 200"
                className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-semibold"
              />
            </div>
          </div>

          <div>
            <label htmlFor="goal-deadline" className="block font-bold text-sm mb-1">
              Até quando quer alcançar? (mês/data)
            </label>
            <input
              id="goal-deadline"
              type="date"
              value={goalDeadline}
              onChange={(e) => setGoalDeadline(e.target.value)}
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] text-blue-deep dark:text-cream border-2 border-blue-sky/70 dark:border-white/20 font-extrabold shadow-sm dark:[color-scheme:dark]"
            />
          </div>

          {parseReaisStringToCents(goalTargetInput) > 0 && (
            <div className="p-4 rounded-2xl bg-sun/85 text-blue-deep border border-orange">
              <span className="text-xs font-extrabold uppercase block mb-0.5">
                Cálculo automático para você:
              </span>
              <p className="font-bold text-base">{livePreviewCalc.helperText}</p>
            </div>
          )}
        </div>
      </ModalShell>

      {/* 2. Modal Guardar ou Retirar do Cofrinho */}
      <ModalShell
        open={Boolean(movementGoal)}
        onClose={() => setMovementGoal(null)}
        title={
          movementMode === 'guardar'
            ? `Guardar em "${movementGoal?.name}"`
            : `Retirar de "${movementGoal?.name}"`
        }
        subtitle={
          movementMode === 'guardar'
            ? 'Cada valor guardado aproxima você da sua meta!'
            : 'Precisou usar uma parte? Sem problemas, anote abaixo.'
        }
        maxWidthClass="max-w-md"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setMovementGoal(null)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleConfirmGoalMovement}>
              <Check size={18} />
              <span>Confirmar valor</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {modalError && (
            <div role="alert" className="p-3 rounded-xl bg-red-soft/15 text-red-soft border border-red-soft/40 text-xs font-bold">
              {modalError}
            </div>
          )}
          <label htmlFor="goal-mov-amount" className="block font-bold text-base mb-1.5">
            Qual valor em reais (R$)?
          </label>
          <input
            id="goal-mov-amount"
            type="text"
            inputMode="decimal"
            value={movementAmountInput}
            onChange={(e) => setMovementAmountInput(e.target.value)}
            placeholder="Ex.: 150"
            className="w-full min-h-[54px] px-4 rounded-xl bg-white dark:bg-[#152144] border-2 border-blue-royal font-extrabold text-2xl tabular-nums"
          />
        </div>
      </ModalShell>

      {/* 3. Modal Planejar Orçamento da Categoria */}
      <ModalShell
        open={Boolean(budgetModalCatId)}
        onClose={() => setBudgetModalCatId(null)}
        title={`Quanto gastar: ${budgetModalTitle}`}
        subtitle="Defina um valor confortável para acompanhar ao longo do mês."
        maxWidthClass="max-w-md"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setBudgetModalCatId(null)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveBudgetModal}>
              <Check size={18} />
              <span>Salvar valor</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {modalError && (
            <div role="alert" className="p-3 rounded-xl bg-red-soft/15 text-red-soft border border-red-soft/40 text-xs font-bold">
              {modalError}
            </div>
          )}
          <label htmlFor="budget-val-input" className="block font-bold text-base mb-1.5">
            Valor planejado para o mês (R$)
          </label>
          <input
            id="budget-val-input"
            type="text"
            inputMode="decimal"
            value={budgetModalValue}
            onChange={(e) => setBudgetModalValue(e.target.value)}
            placeholder="Ex.: 600"
            className="w-full min-h-[54px] px-4 rounded-xl bg-white dark:bg-[#152144] border-2 border-blue-royal font-extrabold text-2xl tabular-nums"
          />
        </div>
      </ModalShell>

      {/* 4. Modal Nova Viagem */}
      <ModalShell
        open={newTripModalOpen}
        onClose={() => setNewTripModalOpen(false)}
        title="Planejar nova viagem"
        subtitle="Divida o orçamento por parte para viajar com tranquilidade."
        maxWidthClass="max-w-xl"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setNewTripModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleCreateTrip}>
              <Check size={18} />
              <span>Salvar viagem</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div role="alert" className="p-3 rounded-xl bg-red-soft/15 text-red-soft border border-red-soft/40 text-xs font-bold">
              {modalError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="trip-name" className="block font-bold text-sm mb-1">
                Nome da viagem
              </label>
              <input
                id="trip-name"
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="Ex.: Férias de Janeiro"
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-semibold"
              />
            </div>
            <div>
              <label htmlFor="trip-dest" className="block font-bold text-sm mb-1">
                Destino
              </label>
              <input
                id="trip-dest"
                type="text"
                value={tripDest}
                onChange={(e) => setTripDest(e.target.value)}
                placeholder="Ex.: Maceió"
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="trip-start" className="block font-bold text-sm mb-1">
                Data de ida
              </label>
              <input
                id="trip-start"
                type="date"
                value={tripStart}
                onChange={(e) => setTripStart(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#152144] text-blue-deep dark:text-cream border-2 border-blue-sky/70 dark:border-white/20 font-extrabold shadow-sm dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="trip-end" className="block font-bold text-sm mb-1">
                Data de volta
              </label>
              <input
                id="trip-end"
                type="date"
                value={tripEnd}
                onChange={(e) => setTripEnd(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#152144] text-blue-deep dark:text-cream border-2 border-blue-sky/70 dark:border-white/20 font-extrabold shadow-sm dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {goals.length > 0 && (
            <div>
              <label htmlFor="trip-goal" className="block font-bold text-sm mb-1">
                Ligar a um Cofrinho (opcional)
              </label>
              <CustomSelect
                id="trip-goal"
                value={tripGoalId}
                onChange={(val) => setTripGoalId(val)}
                placeholder="Sem cofrinho vinculado"
                options={[
                  { value: '', label: 'Sem cofrinho vinculado' },
                  ...goals.map((g) => ({
                    value: g.id,
                    label: `${g.name} (${formatCentsToBRL(g.savedCents)})`
                  }))
                ]}
              />
            </div>
          )}

          <div className="pt-2 border-t border-blue-sky/60">
            <span className="block font-bold text-base mb-2">
              Quanto planeja gastar em cada parte? (R$)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TRIP_PARTS.map(({ part, label }) => (
                <div key={part}>
                  <label className="block text-xs font-bold mb-1">{label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tripPartsInput[part]}
                    onChange={(e) =>
                      setTripPartsInput((prev) => ({ ...prev, [part]: e.target.value }))
                    }
                    placeholder="0,00"
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </ModalShell>

      {/* 5. Modal Ajustar Parte da Viagem */}
      <ModalShell
        open={Boolean(editingTripItem)}
        onClose={() => setEditingTripItem(null)}
        title="Ajustar parte da viagem"
        maxWidthClass="max-w-md"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setEditingTripItem(null)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveTripItemEdit}>
              <Check size={18} />
              <span>Salvar</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block font-bold text-sm mb-1">Valor planejado (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={tripItemPlannedInput}
              onChange={(e) => setTripItemPlannedInput(e.target.value)}
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-sm mb-1">Quanto já foi gasto (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={tripItemSpentInput}
              onChange={(e) => setTripItemSpentInput(e.target.value)}
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-bold"
            />
          </div>
        </div>
      </ModalShell>

      {/* 6. Modal Nova Conta a Pagar */}
      <ModalShell
        open={newBillModalOpen}
        onClose={() => setNewBillModalOpen(false)}
        title="Nova conta mensal"
        subtitle="Cadastre uma conta que se repete todo mês para marcar 'Paguei!' facilmente."
        maxWidthClass="max-w-md"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setNewBillModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleCreateBill}>
              <Check size={18} />
              <span>Salvar conta</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div role="alert" className="p-3 rounded-xl bg-red-soft/15 text-red-soft border border-red-soft/40 text-xs font-bold">
              {modalError}
            </div>
          )}
          <div>
            <label htmlFor="bill-title" className="block font-bold text-sm mb-1">
              Nome da conta
            </label>
            <input
              id="bill-title"
              type="text"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              placeholder="Ex.: Conta de Luz, Internet, Condomínio..."
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-semibold"
            />
          </div>

          <div>
            <label htmlFor="bill-desc" className="block font-bold text-sm mb-1">
              Descrição ou anotação (opcional)
            </label>
            <input
              id="bill-desc"
              type="text"
              value={billDescription}
              onChange={(e) => setBillDescription(e.target.value)}
              placeholder="Ex.: Vence no débito dia 10, código 12345, conta conjunta..."
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bill-amount" className="block font-bold text-sm mb-1">
                Valor aproximado (R$)
              </label>
              <input
                id="bill-amount"
                type="text"
                inputMode="decimal"
                value={billAmountInput}
                onChange={(e) => setBillAmountInput(e.target.value)}
                placeholder="Ex.: 180"
                className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-bold"
              />
            </div>

            <div>
              <label htmlFor="bill-date" className="block font-bold text-sm mb-1">
                Próximo vencimento
              </label>
              <input
                id="bill-date"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] text-blue-deep dark:text-cream border-2 border-blue-sky/70 dark:border-white/20 font-extrabold shadow-sm dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bill-cat" className="block font-bold text-sm mb-1">
              Categoria
            </label>
            <CustomSelect
              id="bill-cat"
              value={billCategoryId}
              onChange={(val) => setBillCategoryId(val)}
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
                color: c.color
              }))}
            />
          </div>

          {/* Duração e Repetição da Conta */}
          <div className="space-y-2 pt-2 border-t border-blue-sky/40 dark:border-white/10">
            <label className="block font-bold text-sm">
              Duração e Repetição da Conta
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-blue-sky/20 dark:bg-white/5 border border-blue-sky/30 text-xs">
              <button
                type="button"
                onClick={() => setBillDurationType('continua')}
                className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                  billDurationType === 'continua'
                    ? 'bg-blue-royal text-white shadow-xs'
                    : 'text-blue-deep/75 dark:text-cream/75 hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                Contínua (Todo mês)
              </button>
              <button
                type="button"
                onClick={() => setBillDurationType('parcelada')}
                className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                  billDurationType === 'parcelada'
                    ? 'bg-blue-royal text-white shadow-xs'
                    : 'text-blue-deep/75 dark:text-cream/75 hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                Parcelada (Qtd. meses)
              </button>
            </div>

            {billDurationType === 'parcelada' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label htmlFor="bill-months" className="block text-xs font-bold mb-1">
                    Quantos meses se repete?
                  </label>
                  <input
                    id="bill-months"
                    type="number"
                    min="1"
                    max="360"
                    value={billTotalMonthsInput}
                    onChange={(e) => setBillTotalMonthsInput(e.target.value)}
                    placeholder="Ex.: 12"
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-bold"
                  />
                  <span className="text-[11px] text-blue-deep/60 dark:text-cream/60">
                    Total de parcelas
                  </span>
                </div>

                <div>
                  <label htmlFor="bill-paid-count" className="block text-xs font-bold mb-1">
                    Quantas já foram pagas?
                  </label>
                  <input
                    id="bill-paid-count"
                    type="number"
                    min="0"
                    max={parseInt(billTotalMonthsInput, 10) || 360}
                    value={billPaidCountInput}
                    onChange={(e) => setBillPaidCountInput(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-bold"
                  />
                  <span className="text-[11px] text-blue-deep/60 dark:text-cream/60">
                    Parcelas já quitadas
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalShell>

      {/* Diálogo de Confirmação para Apagar Conta Mensal */}
      <ConfirmDialog
        open={Boolean(billToDelete)}
        title={`Apagar conta "${billToDelete?.templateTitle}"?`}
        description="Esta conta mensal não aparecerá mais nos próximos meses. Os pagamentos anteriores continuam salvos nos seus lançamentos."
        confirmLabel="Sim, apagar conta"
        cancelLabel="Não, voltar"
        onConfirm={handleDeleteBill}
        onCancel={() => setBillToDelete(null)}
      />
    </div>
  );
};
