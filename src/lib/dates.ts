import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  isToday,
  isYesterday,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodMode = 'day' | 'week' | 'month';

/**
 * Retorna a data de hoje no formato ISO YYYY-MM-DD local.
 */
export function getTodayISO(refDate: Date = new Date()): string {
  return format(refDate, 'yyyy-MM-dd');
}

/**
 * Retorna a data de ontem no formato ISO YYYY-MM-DD local.
 */
export function getYesterdayISO(refDate: Date = new Date()): string {
  return format(addDays(refDate, -1), 'yyyy-MM-dd');
}

/**
 * Retorna a chave de mês YYYY-MM para orçamentos e filtros.
 */
export function getMonthKey(refDate: Date = new Date()): string {
  return format(refDate, 'yyyy-MM');
}

/**
 * Retorna o intervalo [startISO, endISO] no formato YYYY-MM-DD para Dia, Semana ou Mês.
 */
export function getPeriodRange(
  mode: PeriodMode,
  refDate: Date
): { startISO: string; endISO: string; label: string } {
  if (mode === 'day') {
    const start = startOfDay(refDate);
    const end = endOfDay(refDate);
    let label = format(refDate, "dd 'de' MMMM", { locale: ptBR });
    if (isToday(refDate)) {
      label = `Hoje, ${format(refDate, "dd 'de' MMM", { locale: ptBR })}`;
    } else if (isYesterday(refDate)) {
      label = `Ontem, ${format(refDate, "dd 'de' MMM", { locale: ptBR })}`;
    }
    return {
      startISO: format(start, 'yyyy-MM-dd'),
      endISO: format(end, 'yyyy-MM-dd'),
      label
    };
  }

  if (mode === 'week') {
    const start = startOfWeek(refDate, { weekStartsOn: 0 });
    const end = endOfWeek(refDate, { weekStartsOn: 0 });
    const label = `${format(start, 'dd/MM', { locale: ptBR })} a ${format(end, 'dd/MM', { locale: ptBR })}`;
    return {
      startISO: format(start, 'yyyy-MM-dd'),
      endISO: format(end, 'yyyy-MM-dd'),
      label
    };
  }

  const start = startOfMonth(refDate);
  const end = endOfMonth(refDate);
  const rawLabel = format(refDate, "MMMM 'de' yyyy", { locale: ptBR });
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
  return {
    startISO: format(start, 'yyyy-MM-dd'),
    endISO: format(end, 'yyyy-MM-dd'),
    label
  };
}

/**
 * Avança ou volta um período (Dia, Semana ou Mês).
 */
export function shiftPeriodDate(mode: PeriodMode, current: Date, direction: -1 | 1): Date {
  if (mode === 'day') return addDays(current, direction);
  if (mode === 'week') return addWeeks(current, direction);
  return addMonths(current, direction);
}

/**
 * Formata uma string YYYY-MM-DD em linguagem amigável:
 * "Hoje, 04 de novembro", "Ontem, 03 de novembro" ou "Terça, 01 de novembro".
 */
export function formatFriendlyDayHeader(dateISO: string, now: Date = new Date()): string {
  const parsed = parseISO(dateISO);
  if (isSameDay(parsed, now)) {
    return `Hoje, ${format(parsed, "dd 'de' MMMM", { locale: ptBR })}`;
  }
  if (isSameDay(parsed, addDays(now, -1))) {
    return `Ontem, ${format(parsed, "dd 'de' MMMM", { locale: ptBR })}`;
  }
  const formatted = format(parsed, "EEEE, dd 'de' MMMM", { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
