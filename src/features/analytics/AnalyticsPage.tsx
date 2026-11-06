import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addMonths, subMonths, format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  HelpCircle,
  Plus,
  Sparkles,
  Calendar
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { db } from '../../db/dexie';
import { getPeriodRange } from '../../lib/dates';
import { calculatePeriodTotals, formatCentsToBRL } from '../../lib/money';
import {
  buildCategoryBreakdown,
  generateFriendlyAnalyticsSuggestions
} from './analyticsService';
import { useAppStore } from '../../app/store/useAppStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpButton } from '../../components/ui/HelpButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CategoryIcon } from '../../components/ui/CategoryIcon';

function formatMonthYear(date: Date): string {
  return getPeriodRange('month', date).label;
}

export const AnalyticsPage: React.FC = () => {
  const { openAddModal, activeSpaceId } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [expandedWhyIds, setExpandedWhyIds] = useState<Record<string, boolean>>({});

  const currentMonthKey = format(selectedDate, 'yyyy-MM');
  const prevMonthDate = subMonths(selectedDate, 1);
  const prevMonthKey = format(prevMonthDate, 'yyyy-MM');

  const data = useLiveQuery(async () => {
    const [allTxs, categories] = await Promise.all([
      db.transactions
        .where('spaceId')
        .equals(activeSpaceId)
        .and((t) => !t.deletedAt)
        .toArray(),
      db.categories.where('spaceId').equals(activeSpaceId).toArray()
    ]);

    const currentMonthTxs = allTxs.filter((t) => t.date.startsWith(currentMonthKey));
    const prevMonthTxs = allTxs.filter((t) => t.date.startsWith(prevMonthKey));

    return {
      currentMonthTxs,
      prevMonthTxs,
      categories
    };
  }, [activeSpaceId, currentMonthKey, prevMonthKey]);

  const categoriesMap = useMemo(() => {
    const map = new Map();
    for (const c of data?.categories || []) {
      map.set(c.id, c);
    }
    return map;
  }, [data?.categories]);

  const breakdown = useMemo(() => {
    if (!data) return [];
    return buildCategoryBreakdown(data.currentMonthTxs, categoriesMap);
  }, [data, categoriesMap]);

  const suggestions = useMemo(() => {
    if (!data) return [];
    return generateFriendlyAnalyticsSuggestions(
      data.currentMonthTxs,
      data.prevMonthTxs,
      categoriesMap
    );
  }, [data, categoriesMap]);

  const currentTotals = useMemo(
    () => calculatePeriodTotals(data?.currentMonthTxs || []),
    [data?.currentMonthTxs]
  );

  const prevTotals = useMemo(
    () => calculatePeriodTotals(data?.prevMonthTxs || []),
    [data?.prevMonthTxs]
  );

  const toggleWhy = (id: string) => {
    setExpandedWhyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const diffSaiu = currentTotals.saiu - prevTotals.saiu;

  return (
    <div className="space-y-6 pb-8" data-tutorial="analytics-view">
      <header className="flex items-start justify-between gap-3 sm:gap-4 pt-1 sm:pt-2">
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="title-page text-blue-royal dark:text-sun">
            Análises
          </h1>
          <p className="text-sm sm:text-base text-blue-deep/85 dark:text-cream/85 mt-1 sm:mt-2">
            Entenda para onde foi o seu dinheiro sem complicação.
          </p>
        </div>

        <HelpButton
          title="Análises do mês"
          explanation="Aqui você vê um desenho colorido mostrando onde gastou mais no mês, uma comparação simples com o mês passado e dicas gentis."
          example="Toque em 'Por que estou vendo isso?' abaixo de qualquer dica para ver a conta exata que o aplicativo fez."
        />
      </header>

      {/* Navegação de mês com respiro vertical amplo */}
      <Card variant="white" className="my-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => subMonths(d, 1))}
            aria-label="Mês anterior"
            className="w-12 h-12 rounded-2xl bg-cream dark:bg-blue-deep flex items-center justify-center hover:bg-blue-sky/50 transition-colors shrink-0"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-deep/75 dark:text-cream/75 block">
              Mês analisado
            </span>
            <span className="font-serif text-lg font-bold text-blue-royal dark:text-sun">
              {formatMonthYear(selectedDate)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate((d) => addMonths(d, 1))}
            aria-label="Próximo mês"
            className="w-12 h-12 rounded-2xl bg-cream dark:bg-blue-deep flex items-center justify-center hover:bg-blue-sky/50 transition-colors shrink-0"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </Card>

      {breakdown.length === 0 && currentTotals.entrou === 0 ? (
        <EmptyState
          illustration="shell"
          title="Ainda não há gastos neste mês"
          description={`Assim que você anotar gastos ou entradas em ${formatMonthYear(
            selectedDate
          )}, o gráfico colorido e as dicas aparecerão aqui automaticamente.`}
          actionLabel="Anote um gasto ou entrada"
          onAction={() => openAddModal()}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda (7 colunas): Para onde foi meu dinheiro (Gráfico + Barras) */}
          <div className="lg:col-span-7 space-y-6">
            <Card variant="white" className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-royal text-white flex items-center justify-center shrink-0">
                    <PieChartIcon size={24} />
                  </div>
                  <div>
                    <h2 className="title-section">Para onde foi meu dinheiro</h2>
                    <p className="text-sm text-blue-deep/80 dark:text-cream/80 mt-0.5">
                      Total que saiu no mês:{' '}
                      <strong className="money-value text-red-soft">
                        {formatCentsToBRL(currentTotals.saiu)}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              {breakdown.length === 0 ? (
                <p className="text-sm text-blue-deep/80 dark:text-cream/80 py-4">
                  Você teve entradas neste mês, mas ainda não anotou nenhuma saída de dinheiro.
                </p>
              ) : (
                <>
                  {/* Gráfico de rosca Recharts */}
                  <div className="h-60 w-full" aria-label="Gráfico de gastos por categoria">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={breakdown}
                          dataKey="amountCents"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          {breakdown.map((entry) => (
                            <Cell key={entry.categoryId} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCentsToBRL(Number(value || 0))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Lista detalhada com barras horizontais por categoria */}
                  <div className="space-y-4 pt-2 border-t border-blue-sky/50">
                    {breakdown.map((item) => (
                      <div key={item.categoryId} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: item.color }}
                            >
                              <CategoryIcon name={item.icon} size={18} />
                            </div>
                            <span className="font-bold text-base truncate">
                              {item.name}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cream dark:bg-blue-deep text-blue-deep/85 dark:text-cream/85 shrink-0">
                              {item.percentage}%
                            </span>
                          </div>

                          <span className="money-value font-bold text-base shrink-0">
                            {formatCentsToBRL(item.amountCents)}
                          </span>
                        </div>

                        <div className="w-full h-3 rounded-full bg-cream dark:bg-blue-deep overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, item.percentage)}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Coluna Direita (5 colunas): Comparação com mês passado + Sugestões gentis */}
          <div className="lg:col-span-5 space-y-6">
            {/* Comparação direta com o mês anterior */}
            <Card variant="white" className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    prevTotals.saiu === 0
                      ? 'bg-blue-sky/70 dark:bg-blue-royal/40 text-blue-royal dark:text-sun'
                      : diffSaiu <= 0
                      ? 'bg-green-ok text-white'
                      : 'bg-orange text-white'
                  }`}
                >
                  {prevTotals.saiu === 0 ? (
                    <Calendar size={24} />
                  ) : diffSaiu <= 0 ? (
                    <TrendingDown size={24} />
                  ) : (
                    <TrendingUp size={24} />
                  )}
                </div>
                <div>
                  <h2 className="title-section text-blue-deep dark:text-cream">Comparação com o mês passado</h2>
                  <p className="text-xs font-semibold text-blue-deep/75 dark:text-cream/75">
                    Comparado a {formatMonthYear(prevMonthDate)}
                  </p>
                </div>
              </div>

              {prevTotals.saiu === 0 ? (
                <p className="text-sm text-blue-deep/85 dark:text-cream/90 leading-relaxed pt-1">
                  Em {formatMonthYear(prevMonthDate)} não havia gastos anotados. No próximo mês,
                  mostraremos aqui se você gastou mais ou menos que agora!
                </p>
              ) : diffSaiu === 0 ? (
                <p className="text-sm text-blue-deep/85 dark:text-cream/90 leading-relaxed pt-1">
                  Você gastou exatamente o mesmo valor que no mês passado (
                  <strong className="text-blue-deep dark:text-white">{formatCentsToBRL(currentTotals.saiu)}</strong>).
                </p>
              ) : diffSaiu < 0 ? (
                <p className="text-base text-blue-deep dark:text-cream leading-relaxed pt-1">
                  Boa notícia! Até agora você gastou{' '}
                  <strong className="text-green-ok dark:text-[#4ADE80]">
                    {formatCentsToBRL(Math.abs(diffSaiu))} a menos
                  </strong>{' '}
                  do que no mês passado ({formatCentsToBRL(prevTotals.saiu)}).
                </p>
              ) : (
                <p className="text-base text-blue-deep dark:text-cream leading-relaxed pt-1">
                  Neste mês você gastou{' '}
                  <strong className="text-red-soft dark:text-[#F87171]">
                    {formatCentsToBRL(diffSaiu)} a mais
                  </strong>{' '}
                  do que no mês passado ({formatCentsToBRL(prevTotals.saiu)}).
                </p>
              )}
            </Card>

            {/* Sugestões gentis com "Por que estou vendo isso?" */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Lightbulb size={20} className="text-blue-royal dark:text-sun shrink-0" />
                <h2 className="title-section text-blue-royal dark:text-sun">Dicas gentis para você</h2>
              </div>

              {suggestions.length === 0 ? (
                <Card variant="sky">
                  <div className="flex items-center gap-3">
                    <Sparkles size={22} className="text-blue-royal dark:text-sun shrink-0" />
                    <p className="text-sm text-blue-deep dark:text-cream">
                      Continue anotando seus lançamentos para receber dicas personalizadas do mês.
                    </p>
                  </div>
                </Card>
              ) : (
                suggestions.map((sug) => {
                  const isExpanded = !!expandedWhyIds[sug.id];
                  return (
                    <Card
                      key={sug.id}
                      variant={sug.type === 'positive' ? 'sun' : 'white'}
                      className="space-y-3"
                    >
                      <h3
                        className={`font-serif font-bold text-lg ${
                          sug.type === 'positive'
                            ? 'text-blue-deep dark:text-white'
                            : 'text-blue-royal dark:text-sun'
                        }`}
                      >
                        {sug.title}
                      </h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          sug.type === 'positive'
                            ? 'text-blue-deep/90 dark:text-cream'
                            : 'text-blue-deep/85 dark:text-cream/90'
                        }`}
                      >
                        {sug.message}
                      </p>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleWhy(sug.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold underline underline-offset-4 min-h-[36px] text-blue-royal dark:text-sun hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <HelpCircle size={15} />
                          <span>
                            {isExpanded
                              ? 'Esconder explicação'
                              : 'Por que estou vendo isso?'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            className={`mt-2 p-3 rounded-xl text-xs leading-relaxed ${
                              sug.type === 'positive'
                                ? 'bg-white/80 dark:bg-[#15234A] text-blue-deep dark:text-cream border border-orange/30 dark:border-sun/20'
                                : 'bg-cream dark:bg-blue-deep text-blue-deep/90 dark:text-cream/90 border border-blue-sky/40 dark:border-white/10'
                            }`}
                          >
                            <strong className="text-blue-deep dark:text-white">Conta feita pelo app:</strong> {sug.whyExplanation}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            <div className="pt-2">
              <Button variant="secondary" fullWidth onClick={() => openAddModal()}>
                <Plus size={18} />
                <span>Novo lançamento</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
