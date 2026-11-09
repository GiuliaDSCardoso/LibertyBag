import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  CreditCard,
  Repeat,
  Plus,
  Check,
  Calculator
} from 'lucide-react';
import { db, type CategoryRecord, type PaymentMethod, type TransactionType } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import {
  formatCentsToBRL,
  parseDigitsToCents,
  parseReaisStringToCents
} from '../../lib/money';
import { getTodayISO, getYesterdayISO } from '../../lib/dates';
import { NumericKeypad } from '../../components/ui/NumericKeypad';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { HelpButton } from '../../components/ui/HelpButton';
import { Button } from '../../components/ui/Button';
import { ModalShell } from '../../components/ui/ModalShell';
import { CategoryFormModal } from '../categories/CategoryFormModal';
import { InstallmentSimulator } from '../simulation/InstallmentSimulator';
import {
  calculateInstallmentPlan,
  createTransactionWithUndo,
  type InterestInputMode
} from './transactionService';

export const AddTransactionModal: React.FC = () => {
  const {
    isAddModalOpen,
    closeAddModal,
    activeSpaceId,
    activeUserId,
    showUndoToast
  } = useAppStore();

  const [digits, setDigits] = useState('');
  const [type, setType] = useState<TransactionType>('saida');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => getTodayISO());
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

  // Lógica completa de Parcelamento + Entrada + Juros + Repetição em outros meses
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [installmentsInput, setInstallmentsInput] = useState<string>('2');
  const [hasDownPayment, setHasDownPayment] = useState(false);
  const [downPaymentInput, setDownPaymentInput] = useState('');
  const [hasInterest, setHasInterest] = useState(false);
  const [interestMode, setInterestMode] = useState<InterestInputMode>('installment_value');
  const [totalWithInterestInput, setTotalWithInterestInput] = useState('');
  const [customInstallmentInput, setCustomInstallmentInput] = useState('');

  // Ativar se repete em outros meses ou não
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [repeatFixedMonths, setRepeatFixedMonths] = useState<boolean>(false);
  const [repeatMonthsCount, setRepeatMonthsCount] = useState<number>(6);
  const [repeatMonthsInput, setRepeatMonthsInput] = useState<string>('6');

  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // Estado para abrir o criador de categoria sem perder o valor digitado
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newlyCreatedCategory, setNewlyCreatedCategory] = useState<CategoryRecord | null>(null);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);

  const categories = useLiveQuery(
    async () => {
      const all = await db.categories
        .where('spaceId')
        .equals(activeSpaceId)
        .and((cat) => !cat.deletedAt && cat.type === type)
        .sortBy('sortOrder');
      return all;
    },
    [activeSpaceId, type],
    []
  );

  const amountCents = parseDigitsToCents(digits);
  const downPaymentCents = parseReaisStringToCents(downPaymentInput);
  const totalWithInterestCents = parseReaisStringToCents(totalWithInterestInput);
  const customInstallmentCents = parseReaisStringToCents(customInstallmentInput);

  const todayISO = getTodayISO();
  const yesterdayISO = getYesterdayISO();

  const installmentPlan = calculateInstallmentPlan({
    baseAmountCents: amountCents,
    installmentsCount: isInstallment ? installmentsCount : 1,
    hasDownPayment: isInstallment && hasDownPayment,
    downPaymentCents,
    hasInterest: isInstallment && hasInterest,
    interestMode,
    totalWithInterestCents,
    customInstallmentCents
  });

  const resetForm = () => {
    setDigits('');
    setType('saida');
    setSelectedCategoryId(null);
    setDate(getTodayISO());
    setDescription('');
    setPaymentMethod('pix');
    setIsInstallment(false);
    setInstallmentsCount(2);
    setInstallmentsInput('2');
    setHasDownPayment(false);
    setDownPaymentInput('');
    setHasInterest(false);
    setInterestMode('installment_value');
    setTotalWithInterestInput('');
    setCustomInstallmentInput('');
    setRepeatMonthly(false);
    setRepeatFixedMonths(false);
    setRepeatMonthsCount(6);
    setRepeatMonthsInput('6');
    setShowMoreDetails(false);
    setErrorMessage(null);
    setNewlyCreatedCategory(null);
    isSavingRef.current = false;
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    closeAddModal();
  };

  const handleDigit = (d: string) => {
    setErrorMessage(null);
    if (digits.length >= 9) return;
    const next = (digits + d).replace(/^0+/, '');
    setDigits(next);
  };

  const handleBackspace = () => {
    setErrorMessage(null);
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMessage(null);
    setDigits('');
  };

  // Permite digitar os números direto no teclado físico quando não estiver focado em um <input>
  useEffect(() => {
    if (!isAddModalOpen || createCategoryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setErrorMessage(null);
        setDigits((prev) => (prev.length >= 9 ? prev : (prev + e.key).replace(/^0+/, '')));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setErrorMessage(null);
        setDigits((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAddModalOpen, createCategoryOpen]);

  const handleSelectPaymentMethod = (pm: PaymentMethod) => {
    setPaymentMethod(pm);
    if (pm === 'pix_parcelado') {
      setIsInstallment(true);
      setRepeatMonthly(false);
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setErrorMessage(null);
    setSelectedCategoryId(categoryId);
  };

  const handleSaveTransaction = async () => {
    setErrorMessage(null);

    if (amountCents <= 0) {
      setErrorMessage('Digite primeiro um valor maior que zero usando os números.');
      return;
    }

    const targetCat =
      categories.find((c) => c.id === selectedCategoryId) || newlyCreatedCategory;

    if (!targetCat) {
      setErrorMessage('Escolha uma categoria no 3º passo antes de clicar em Adicionar.');
      return;
    }

    if (isInstallment && hasDownPayment && downPaymentCents >= amountCents) {
      setErrorMessage('O valor da entrada precisa ser menor que o valor total da compra.');
      return;
    }

    if (isSaving || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const result = await createTransactionWithUndo({
        userId: activeUserId,
        spaceId: activeSpaceId,
        amountCents,
        type,
        categoryId: targetCat.id,
        date,
        description,
        paymentMethod,
        repeatMonthly,
        repeatMonthsCount: repeatMonthly && repeatFixedMonths ? repeatMonthsCount : null,
        installmentsCount: type === 'saida' && isInstallment ? installmentsCount : 1,
        hasDownPayment: type === 'saida' && isInstallment && hasDownPayment,
        downPaymentCents:
          type === 'saida' && isInstallment && hasDownPayment ? downPaymentCents : 0,
        hasInterest: type === 'saida' && isInstallment && hasInterest,
        interestMode,
        totalWithInterestCents,
        customInstallmentCents
      });

      const formattedValue = isInstallment
        ? installmentPlan.summaryText
        : formatCentsToBRL(amountCents);
      showUndoToast(`Salvo em ${targetCat.name}: ${formattedValue}`, result.undo);
      handleClose();
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleNewCategoryCreated = (savedCat: CategoryRecord) => {
    setType(savedCat.type);
    setNewlyCreatedCategory(savedCat);
    setSelectedCategoryId(savedCat.id);
    setErrorMessage(null);
  };

  const activeCategoryObj =
    categories.find((c) => c.id === selectedCategoryId) || newlyCreatedCategory || null;

  return (
    <>
      <ModalShell
        open={isAddModalOpen}
        onClose={handleClose}
        onPrimarySubmit={handleSaveTransaction}
        title="Novo lançamento"
        subtitle="1. Digite o valor • 2. Entrou ou Saiu • 3. Escolha a categoria"
        maxWidthClass="max-w-4xl"
        zIndexClass="z-40"
        headerRight={
          <HelpButton
            title="Como anotar à vista ou parcelado"
            explanation="Digite o valor, escolha se o dinheiro 'Saiu' ou 'Entrou', selecione a categoria e clique no botão azul 'Adicionar'. Se foi parcelado, com entrada ou juros, escolha a forma de pagamento abaixo."
            example="Comprou uma geladeira de R$ 2.000 dando R$ 400 de entrada e 10x de R$ 180 com juros? Digite 200000, ative 'Parcelar', marque 'Dei uma entrada' (400), escolha a categoria 'Casa' e clique em 'Adicionar'."
          />
        }
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
            <div className="text-xs sm:text-sm font-semibold text-blue-deep/85 dark:text-cream/85 text-center sm:text-left">
              {amountCents > 0 && activeCategoryObj ? (
                <span>
                  Pronto para adicionar:{' '}
                  <strong className="text-blue-royal dark:text-sun">
                    {isInstallment ? installmentPlan.summaryText : formatCentsToBRL(amountCents)}
                  </strong>{' '}
                  em <strong>{activeCategoryObj.name}</strong>
                </span>
              ) : amountCents > 0 ? (
                <span>Agora escolha uma categoria acima e clique em Adicionar</span>
              ) : (
                <span>Digite o valor, escolha a categoria e clique em Adicionar</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button variant="secondary" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                data-enter-submit="true"
                onClick={handleSaveTransaction}
                disabled={isSaving}
              >
                <Check size={18} />
                <span>Adicionar</span>
              </Button>
            </div>
          </div>
        }
      >
        {/* Mensagem amigável de erro caso toque na categoria sem digitar valor */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-4 rounded-2xl bg-sun text-blue-deep font-bold text-base border-2 border-orange flex items-center justify-between gap-2"
          >
            <span>👆 {errorMessage}</span>
          </div>
        )}

        {/* Layout em 2 colunas no desktop (>= 1024px) e 1 coluna no mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Coluna Esquerda: Passo 1 (Visor + Teclado) */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="bg-white dark:bg-[#152144] rounded-2xl p-4 border-2 border-blue-royal/30 shadow-card text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-deep/80 dark:text-cream/85 block mb-1">
                1º Passo — Qual é o valor total?
              </span>
              <div
                aria-live="polite"
                className={`font-sans font-extrabold text-3xl sm:text-4xl tabular-nums tracking-tight my-1 ${
                  type === 'entrada'
                    ? 'text-green-ok'
                    : 'text-blue-deep dark:text-white'
                }`}
              >
                {formatCentsToBRL(amountCents)}
              </div>
              <p className="text-xs text-blue-deep/80 dark:text-cream/80">
                Digite os centavos juntos (ex.: 1500 = R$ 15,00)
              </p>
            </div>

            <NumericKeypad
              onDigit={handleDigit}
              onBackspace={handleBackspace}
              onClear={handleClear}
            />
          </div>

          {/* Coluna Direita: Passo 2 (Entrou/Saiu) + Pagamento/Parcelamento + Passo 3 (Categorias) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Passo 2: Dois botões grandes "Saiu" / "Entrou" */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-deep/85 dark:text-cream/85 block mb-2 px-1">
                2º Passo — O dinheiro saiu ou entrou?
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('saida')}
                  aria-pressed={type === 'saida'}
                  className={`min-h-[56px] rounded-2xl px-4 py-2.5 font-bold text-base flex items-center justify-center gap-2.5 border-2 transition-all ${
                    type === 'saida'
                      ? 'bg-red-soft text-white border-red-soft shadow-soft'
                      : 'bg-white dark:bg-[#152144] text-blue-deep dark:text-cream border-blue-sky/70'
                  }`}
                >
                  <ArrowDownCircle size={22} aria-hidden="true" className="shrink-0" />
                  <div className="text-left">
                    <span className="block leading-tight">Saiu</span>
                    <span className="block text-xs font-normal opacity-95">Gastei / Paguei</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('entrada');
                    setIsInstallment(false);
                  }}
                  aria-pressed={type === 'entrada'}
                  className={`min-h-[56px] rounded-2xl px-4 py-2.5 font-bold text-base flex items-center justify-center gap-2.5 border-2 transition-all ${
                    type === 'entrada'
                      ? 'bg-green-ok text-white border-green-ok shadow-soft'
                      : 'bg-white dark:bg-[#152144] text-blue-deep dark:text-cream border-blue-sky/70'
                  }`}
                >
                  <ArrowUpCircle size={22} aria-hidden="true" className="shrink-0" />
                  <div className="text-left">
                    <span className="block leading-tight">Entrou</span>
                    <span className="block text-xs font-normal opacity-95">Recebi dinheiro</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Bloco Visível de Forma de Pagamento, Parcelamento (Crédito / Pix Parcelado / Entrada / Juros) e Repetição Mensal */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#152144] border border-blue-sky/80 space-y-3.5 shadow-xs">
              <div>
                <span className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-blue-deep/80 dark:text-cream/80 mb-2">
                  <CreditCard size={16} />
                  <span>Como foi pago ou recebido?</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'pix', label: 'Pix' },
                      { id: 'credito', label: 'Crédito' },
                      { id: 'pix_parcelado', label: 'Pix Parcelado' },
                      { id: 'debito', label: 'Débito' },
                      { id: 'dinheiro', label: 'Dinheiro' }
                    ] as const
                  ).map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => handleSelectPaymentMethod(pm.id)}
                      className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${
                        paymentMethod === pm.id
                          ? 'bg-blue-royal text-white border-blue-royal shadow-xs'
                          : 'bg-cream dark:bg-blue-deep border-blue-sky/70'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletores rápidos: À vista vs. Parcelado vs. Repete em outros meses */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsInstallment(false);
                    setRepeatMonthly(false);
                  }}
                  className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border transition-all ${
                    !isInstallment && !repeatMonthly
                      ? 'bg-blue-royal text-white border-blue-royal'
                      : 'bg-cream dark:bg-blue-deep border-blue-sky/70'
                  }`}
                >
                  À vista (1 vez só)
                </button>

                {type === 'saida' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsInstallment(true);
                      setRepeatMonthly(false);
                      if (paymentMethod === 'pix' || paymentMethod === 'dinheiro') {
                        setPaymentMethod('credito');
                      }
                    }}
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border transition-all ${
                      isInstallment
                        ? 'bg-blue-royal text-white border-blue-royal'
                        : 'bg-cream dark:bg-blue-deep border-blue-sky/70'
                    }`}
                  >
                    Parcelado (em meses)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setRepeatMonthly((v) => !v);
                    setIsInstallment(false);
                  }}
                  className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    repeatMonthly
                      ? 'bg-blue-royal text-white border-blue-royal'
                      : 'bg-cream dark:bg-blue-deep border-blue-sky/70'
                  }`}
                >
                  <Repeat size={15} />
                  <span>Repete outros meses</span>
                </button>
              </div>

              {/* PAINEL DE PARCELAMENTO COMPLETO (Quantidade de meses, Entrada, Juros) */}
              {type === 'saida' && isInstallment && (
                <div className="pt-3 border-t border-blue-sky/50 space-y-4">
                  {/* Botão de Simulação Inteligente de Bancos */}
                  <button
                    type="button"
                    onClick={() => setSimulationModalOpen(true)}
                    className="w-full min-h-[46px] px-4 rounded-2xl bg-blue-sky/40 dark:bg-white/10 hover:bg-blue-sky/60 dark:hover:bg-white/20 border border-blue-sky/80 dark:border-white/20 text-xs font-bold text-blue-royal-ink dark:text-sun flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Calculator size={16} />
                    <span>Simular e comparar juros dos bancos (Nubank, Itaú, Inter...)</span>
                  </button>

                  {/* 1. Quantidade de meses / parcelas */}
                  <div>
                    <label
                      htmlFor="tx-installments-input"
                      className="block text-sm font-bold mb-1.5"
                    >
                      Em quantos meses (parcelas)?
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[2, 3, 4, 6, 10, 12].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setInstallmentsCount(n);
                            setInstallmentsInput(String(n));
                          }}
                          className={`min-h-[42px] px-3 rounded-xl text-xs font-bold border ${
                            installmentsCount === n && installmentsInput === String(n)
                              ? 'bg-blue-royal text-white border-blue-royal'
                              : 'bg-cream dark:bg-blue-deep border-blue-sky'
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-xs font-bold">Outro:</span>
                        <input
                          id="tx-installments-input"
                          type="text"
                          inputMode="numeric"
                          value={installmentsInput}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
                            setInstallmentsInput(raw);
                            const parsed = parseInt(raw, 10);
                            if (!Number.isNaN(parsed) && parsed > 0) {
                              setInstallmentsCount(parsed);
                            }
                          }}
                          placeholder="Ex.: 10"
                          className="w-20 min-h-[42px] px-2.5 rounded-xl bg-cream dark:bg-blue-deep border border-blue-sky font-bold text-center text-sm"
                        />
                        <span className="text-xs font-bold">meses</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Dei uma entrada e parcelei o resto? */}
                  <div className="p-3 rounded-xl bg-cream/70 dark:bg-blue-deep/80 border border-blue-sky/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        Deu uma entrada à vista e parcelou o resto?
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setHasDownPayment(false)}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-bold border ${
                            !hasDownPayment
                              ? 'bg-blue-royal text-white border-blue-royal'
                              : 'bg-white dark:bg-[#152144] border-blue-sky'
                          }`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setHasDownPayment(true)}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-bold border ${
                            hasDownPayment
                              ? 'bg-blue-royal text-white border-blue-royal'
                              : 'bg-white dark:bg-[#152144] border-blue-sky'
                          }`}
                        >
                          Sim, dei entrada
                        </button>
                      </div>
                    </div>

                    {hasDownPayment && (
                      <div>
                        <label
                          htmlFor="tx-down-payment"
                          className="block text-xs font-bold mb-1"
                        >
                          Qual foi o valor da entrada (R$)?
                        </label>
                        <input
                          id="tx-down-payment"
                          type="text"
                          inputMode="decimal"
                          value={downPaymentInput}
                          onChange={(e) => setDownPaymentInput(e.target.value)}
                          placeholder="Ex.: 200,00"
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-bold text-sm"
                        />
                        {amountCents > downPaymentCents && downPaymentCents > 0 && (
                          <p className="text-xs text-blue-deep/85 dark:text-cream/85 mt-1 font-semibold">
                            Restante para parcelar:{' '}
                            <strong>{formatCentsToBRL(amountCents - downPaymentCents)}</strong> em{' '}
                            {installmentsCount}x
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Teve juros no parcelamento? */}
                  <div className="p-3 rounded-xl bg-cream/70 dark:bg-blue-deep/80 border border-blue-sky/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">Teve juros nas parcelas?</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setHasInterest(false)}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-bold border ${
                            !hasInterest
                              ? 'bg-blue-royal text-white border-blue-royal'
                              : 'bg-white dark:bg-[#152144] border-blue-sky'
                          }`}
                        >
                          Sem juros
                        </button>
                        <button
                          type="button"
                          onClick={() => setHasInterest(true)}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-bold border ${
                            hasInterest
                              ? 'bg-orange text-blue-deep border-orange'
                              : 'bg-white dark:bg-[#152144] border-blue-sky'
                          }`}
                        >
                          Com juros
                        </button>
                      </div>
                    </div>

                    {hasInterest && (
                      <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setInterestMode('installment_value')}
                            className={`min-h-[40px] px-2.5 rounded-xl text-xs font-bold border ${
                              interestMode === 'installment_value'
                                ? 'bg-blue-royal text-white border-blue-royal'
                                : 'bg-white dark:bg-[#152144] border-blue-sky'
                            }`}
                          >
                            Informar valor da parcela
                          </button>
                          <button
                            type="button"
                            onClick={() => setInterestMode('total_with_interest')}
                            className={`min-h-[40px] px-2.5 rounded-xl text-xs font-bold border ${
                              interestMode === 'total_with_interest'
                                ? 'bg-blue-royal text-white border-blue-royal'
                                : 'bg-white dark:bg-[#152144] border-blue-sky'
                            }`}
                          >
                            Informar total com juros
                          </button>
                        </div>

                        {interestMode === 'installment_value' ? (
                          <div>
                            <label
                              htmlFor="tx-custom-installment"
                              className="block text-xs font-bold mb-1"
                            >
                              Qual ficou o valor de cada uma das {installmentsCount} parcelas (R$)?
                            </label>
                            <input
                              id="tx-custom-installment"
                              type="text"
                              inputMode="decimal"
                              value={customInstallmentInput}
                              onChange={(e) => setCustomInstallmentInput(e.target.value)}
                              placeholder="Ex.: 185,00"
                              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-bold text-sm"
                            />
                          </div>
                        ) : (
                          <div>
                            <label
                              htmlFor="tx-total-interest"
                              className="block text-xs font-bold mb-1"
                            >
                              Qual ficou o valor final total com juros (R$)?
                            </label>
                            <input
                              id="tx-total-interest"
                              type="text"
                              inputMode="decimal"
                              value={totalWithInterestInput}
                              onChange={(e) => setTotalWithInterestInput(e.target.value)}
                              placeholder="Ex.: 1200,00"
                              className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-[#152144] border border-blue-sky font-bold text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resumo ao vivo do Parcelamento */}
                  <div className="p-3 rounded-xl bg-blue-sky/45 dark:bg-blue-deep border border-blue-royal/25 flex items-start gap-2.5">
                    <Calculator size={18} className="text-blue-royal dark:text-sun shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <span className="font-extrabold uppercase block text-blue-royal dark:text-sun">
                        Resumo das parcelas:
                      </span>
                      <span className="font-bold">{installmentPlan.summaryText}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PAINEL DE REPETIÇÃO EM OUTROS MESES */}
              {repeatMonthly && (
                <div className="pt-3 border-t border-blue-sky/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold">
                      Como esse valor se repete nos próximos meses?
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRepeatFixedMonths(false)}
                        className={`min-h-[38px] px-3 rounded-lg text-xs font-bold border ${
                          !repeatFixedMonths
                            ? 'bg-blue-royal text-white border-blue-royal'
                            : 'bg-cream dark:bg-blue-deep border-blue-sky'
                        }`}
                      >
                        Todo mês (conta fixa)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepeatFixedMonths(true)}
                        className={`min-h-[38px] px-3 rounded-lg text-xs font-bold border ${
                          repeatFixedMonths
                            ? 'bg-blue-royal text-white border-blue-royal'
                            : 'bg-cream dark:bg-blue-deep border-blue-sky'
                        }`}
                      >
                        Por X meses
                      </button>
                    </div>
                  </div>

                  {repeatFixedMonths && (
                    <div className="flex items-center gap-3">
                      <label htmlFor="tx-repeat-months" className="text-xs font-bold">
                        Repetir por quantos meses?
                      </label>
                      <input
                        id="tx-repeat-months"
                        type="text"
                        inputMode="numeric"
                        value={repeatMonthsInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
                          setRepeatMonthsInput(raw);
                          const parsed = parseInt(raw, 10);
                          if (!Number.isNaN(parsed) && parsed > 0) {
                            setRepeatMonthsCount(parsed);
                          }
                        }}
                        placeholder="Ex.: 10"
                        className="w-24 min-h-[42px] px-3 rounded-xl bg-cream dark:bg-blue-deep border border-blue-sky font-bold text-center text-sm"
                      />
                      <span className="text-xs font-bold">meses</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botão opcional "Data e Observação" */}
            <div>
              <button
                type="button"
                onClick={() => setShowMoreDetails((v) => !v)}
                className="w-full min-h-[46px] px-4 py-2 rounded-2xl bg-blue-sky/50 dark:bg-[#152144] text-blue-deep dark:text-cream font-bold text-xs sm:text-sm flex items-center justify-between gap-2 border border-blue-royal/20"
              >
                <span className="truncate">
                  Data e observação (data:{' '}
                  {date === todayISO ? 'Hoje' : date === yesterdayISO ? 'Ontem' : date}
                  {description ? `, "${description}"` : ''})
                </span>
                {showMoreDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showMoreDetails && (
                <div className="mt-2 p-4 rounded-2xl bg-white dark:bg-[#152144] border border-blue-sky space-y-4">
                  {/* Data com atalhos Hoje / Ontem */}
                  <div>
                    <label className="flex items-center gap-2 font-bold text-sm mb-2">
                      <Calendar size={18} />
                      <span>Quando aconteceu?</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDate(todayISO)}
                        className={`min-h-[44px] px-4 rounded-pill text-sm font-bold whitespace-nowrap ${
                          date === todayISO
                            ? 'bg-blue-royal text-white'
                            : 'bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream border border-blue-sky'
                        }`}
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => setDate(yesterdayISO)}
                        className={`min-h-[44px] px-4 rounded-pill text-sm font-bold whitespace-nowrap ${
                          date === yesterdayISO
                            ? 'bg-blue-royal text-white'
                            : 'bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream border border-blue-sky'
                        }`}
                      >
                        Ontem
                      </button>
                      <input
                        type="date"
                        aria-label="Escolher outra data"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-[#152144] text-blue-deep dark:text-cream border-2 border-blue-sky/70 dark:border-white/20 text-sm font-bold shadow-sm dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Descrição opcional */}
                  <div>
                    <label
                      htmlFor="tx-description"
                      className="flex items-center gap-2 font-bold text-sm mb-1.5"
                    >
                      <FileText size={18} />
                      <span>Quer anotar uma observação? (opcional)</span>
                    </label>
                    <input
                      id="tx-description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex.: Geladeira nova, Feira da semana..."
                      className="w-full min-h-[46px] px-4 rounded-xl bg-cream dark:bg-blue-deep border border-blue-sky text-base"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Passo 3: Grade de Categorias + item final "Nova categoria" (só seleciona, conclui apenas ao clicar em Adicionar) */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-deep/85 dark:text-cream/85 block mb-2 px-1">
                3º Passo — Escolha a categoria:
              </span>

              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {categories.map((cat) => {
                  const isSelected =
                    selectedCategoryId === cat.id || newlyCreatedCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={isSaving}
                      aria-pressed={isSelected}
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`relative min-h-[74px] p-2 rounded-2xl transition-all border-2 flex flex-col items-center justify-center text-center gap-1.5 shadow-card ${
                        isSelected
                          ? 'bg-blue-royal text-white border-blue-royal ring-2 ring-sun scale-[1.02]'
                          : 'bg-white dark:bg-[#152144] hover:bg-blue-sky/50 border-blue-sky/60 hover:border-blue-royal'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-sun text-blue-deep flex items-center justify-center shadow-xs">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color || '#2346C8' }}
                      >
                        <CategoryIcon name={cat.icon} size={18} />
                      </div>
                      <span className="text-xs font-bold leading-tight line-clamp-2">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}

                {/* Último item da grade: "Nova categoria" (sem '+' duplicado no texto) */}
                <button
                  type="button"
                  onClick={() => setCreateCategoryOpen(true)}
                  className="min-h-[74px] p-2 rounded-2xl bg-blue-sky/45 dark:bg-[#2339A8]/60 hover:bg-blue-sky active:scale-95 border-2 border-dashed border-blue-royal dark:border-sun flex flex-col items-center justify-center text-center gap-1.5 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-royal text-white flex items-center justify-center shrink-0">
                    <Plus size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-bold text-blue-royal dark:text-sun leading-tight">
                    Nova categoria
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalShell>

      {/* Modal de criar nova categoria em cima do fluxo de Adicionar sem perder os dados */}
      <CategoryFormModal
        open={createCategoryOpen}
        initialType={type}
        onClose={() => setCreateCategoryOpen(false)}
        onSaved={handleNewCategoryCreated}
      />

      {/* Modal de Simulação de Parcelamento */}
      <ModalShell
        open={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
        title="Simulador de Parcelamento"
        subtitle="Compare taxas reais dos principais bancos brasileiros e evite juros abusivos."
        maxWidthClass="max-w-4xl"
      >
        <InstallmentSimulator
          initialAmountCents={amountCents > 0 ? amountCents : 100000}
          initialType={paymentMethod === 'pix_parcelado' ? 'pix_parcelado' : 'credito'}
          onApplyInstallmentPlan={(plan) => {
            setInstallmentsCount(plan.installments);
            setInstallmentsInput(String(plan.installments));
            setHasInterest(true);
            setInterestMode('total_with_interest');
            setTotalWithInterestInput(
              (plan.totalFinalCents / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })
            );
            setSimulationModalOpen(false);
            showUndoToast(
              `Taxa do ${plan.bankName} (${plan.interestMonthlyPercent.toFixed(2)}% a.m.) aplicada!`,
              async () => {}
            );
          }}
        />
      </ModalShell>
    </>
  );
};
