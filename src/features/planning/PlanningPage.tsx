import React, { useMemo, useState } from 'react';
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
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
  Trash2
} from 'lucide-react';
import { db, type SavingsGoalRecord, type TripItemRecord } from '../../db/dexie';
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
import { EmptyState } from '../../components/ui/EmptyState';
import { ModalShell } from '../../components/ui/ModalShell';
import { MatisseFlower } from '../../components/illustrations/BeachIllustrations';
import {
  TRIP_PARTS,
  calculateGoalMonthlyRecommendation,
  copyPreviousMonthBudgetsWithUndo,
  createRecurringBillWithUndo,
  createSavingsGoalWithUndo,
  createTripWithUndo,
  deleteGoalWithUndo,
  markRecurringBillPaidWithUndo,
  moveGoalMoneyWithUndo,
  saveBudgetWithUndo,
  updateTripItemWithUndo
} from './planningService';

type PlanningTab = 'cofrinhos' | 'orcamento' | 'viagens' | 'contas';

export const PlanningPage: React.FC = () => {
  const { activeSpaceId, activeUserId, showUndoToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<PlanningTab>('cofrinhos');

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
        .and((r) => !r.deletedAt && r.active)
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
  const [billAmountInput, setBillAmountInput] = useState('');
  const [billDate, setBillDate] = useState(() => getTodayISO());
  const [billCategoryId, setBillCategoryId] = useState('cat-contas');
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

    const { recurrence, undo } = await createRecurringBillWithUndo({
      userId: activeUserId,
      spaceId: activeSpaceId,
      title: trimmedTitle,
      amountCents: cents,
      categoryId: billCategoryId,
      nextDate: billDate
    });

    setNewBillModalOpen(false);
    setBillTitle('');
    setBillAmountInput('');
    setModalError(null);
    showUndoToast(`Conta "${recurrence.templateTitle}" adicionada!`, undo);
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

  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-4 pt-2">
        <div>
          <h1 className="title-page text-blue-royal dark:text-sun">
            Planejar
          </h1>
          <p className="text-base text-blue-deep/85 dark:text-cream/85 mt-2">
            Seus cofrinhos, quanto pode gastar, viagens e contas de todo mês.
          </p>
        </div>

        <HelpButton
          title="Como funciona o Planejar"
          explanation="Aqui você cuida do futuro de forma simples: cria Cofrinhos (e o app calcula sozinho quanto guardar por mês), define Quanto pode gastar em cada categoria, planeja Viagens por partes e marca 'Paguei' nas contas do mês."
          example="Crie um cofrinho de R$ 1.200 para daqui a 6 meses e veja na hora a mensagem: 'Para chegar lá, guarde R$ 200,00 por mês'."
        />
      </header>

      {/* Navegação das 4 partes do Planejar */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-[#192B85] p-2 rounded-card border border-blue-sky/60 shadow-card"
        role="tablist"
        aria-label="Seções de planejamento"
      >
        {(
          [
            { id: 'cofrinhos', label: 'Cofrinhos', icon: PiggyBank },
            { id: 'orcamento', label: 'Quanto gastar', icon: Wallet },
            { id: 'viagens', label: 'Viagens', icon: Plane },
            { id: 'contas', label: 'Contas a pagar', icon: CalendarCheck }
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`min-h-[52px] px-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-blue-royal text-white shadow-xs'
                : 'text-blue-deep dark:text-cream hover:bg-blue-sky/40'
            }`}
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
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
                              className="min-h-[40px] px-3 rounded-pill bg-white dark:bg-[#192B85] text-blue-royal dark:text-sun text-xs font-bold border border-blue-sky"
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
        <section className="space-y-5" aria-label="Contas a pagar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="title-section text-blue-royal dark:text-sun">
                Contas que se repetem todo mês
              </h2>
              <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-1">
                Quando pagar uma conta, basta tocar em &ldquo;Paguei&rdquo; para anotar no mês.
              </p>
            </div>
            <Button variant="primary" onClick={() => setNewBillModalOpen(true)}>
              <Plus size={18} />
              <span>Nova conta mensal</span>
            </Button>
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
              {recurrences.map((rec) => (
                <Card
                  key={rec.id}
                  variant="white"
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-xs font-bold uppercase text-orange block">
                      Próximo vencimento: {rec.nextDate.split('-').reverse().join('/')}
                    </span>
                    <h3 className="font-bold text-lg">{rec.templateTitle}</h3>
                    <p className="font-extrabold text-xl text-blue-royal dark:text-sun tabular-nums">
                      {formatCentsToBRL(rec.amountCents)}
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => handleMarkBillPaid(rec.id, rec.templateTitle)}
                  >
                    <Check size={18} />
                    <span>Paguei!</span>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          MODAIS ENQUADRADOS COM MODALSHELL
         ===================================================================== */}

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
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border-2 border-blue-sky font-semibold"
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
                className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border-2 border-blue-sky font-bold text-lg"
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
                className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
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
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
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
            className="w-full min-h-[54px] px-4 rounded-xl bg-white dark:bg-[#192B85] border-2 border-blue-royal font-extrabold text-2xl tabular-nums"
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
            className="w-full min-h-[54px] px-4 rounded-xl bg-white dark:bg-[#192B85] border-2 border-blue-royal font-extrabold text-2xl tabular-nums"
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
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
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
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
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
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky"
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
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky"
              />
            </div>
          </div>

          {goals.length > 0 && (
            <div>
              <label htmlFor="trip-goal" className="block font-bold text-sm mb-1">
                Ligar a um Cofrinho (opcional)
              </label>
              <select
                id="trip-goal"
                value={tripGoalId}
                onChange={(e) => setTripGoalId(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
              >
                <option value="">Sem cofrinho vinculado</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({formatCentsToBRL(g.savedCents)})
                  </option>
                ))}
              </select>
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
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
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
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-sm mb-1">Quanto já foi gasto (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={tripItemSpentInput}
              onChange={(e) => setTripItemSpentInput(e.target.value)}
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-bold"
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
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
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
                className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-bold"
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
                className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bill-cat" className="block font-bold text-sm mb-1">
              Categoria
            </label>
            <select
              id="bill-cat"
              value={billCategoryId}
              onChange={(e) => setBillCategoryId(e.target.value)}
              className="w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#192B85] border border-blue-sky font-semibold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};
