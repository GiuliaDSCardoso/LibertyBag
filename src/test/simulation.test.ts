import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateInstallment,
  simulateAllBanks,
  POPULAR_BANKS,
  saveBankLimits,
  getSavedBankLimits
} from '../features/simulation/simulationService';

describe('LibertyBag — Simulador de Parcelamento (Fase 3.5)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calcula parcelamento à vista (1x) sem juros', () => {
    const res = calculateInstallment(100000, 3.29, 1);
    expect(res.installmentCents).toBe(100000);
    expect(res.totalFinalCents).toBe(100000);
    expect(res.totalInterestCents).toBe(0);
  });

  it('calcula juros compostos de parcelamento pela Tabela Price em 12x', () => {
    // R$ 1.000,00 em 12x a 3,29% a.m.
    const res = calculateInstallment(100000, 3.29, 12);
    // Parcela esperada ~ R$ 102,67 (10267 centavos)
    expect(res.installmentCents).toBeGreaterThan(10000);
    expect(res.installmentCents).toBeLessThan(10500);
    expect(res.totalFinalCents).toBe(res.installmentCents * 12);
    expect(res.totalInterestCents).toBe(res.totalFinalCents - 100000);
  });

  it('simula todos os bancos populares e identifica a melhor recomendação', () => {
    const limits = {
      nubank: { creditLimitCents: 200000, pixLimitCents: 100000 }
    };

    const sim = simulateAllBanks({
      amountCents: 120000, // R$ 1.200
      installments: 10,
      simulationType: 'credito',
      limits
    });

    expect(sim.results.length).toBe(POPULAR_BANKS.length);
    // Resultados devem vir ordenados por menor custo final
    for (let i = 0; i < sim.results.length - 1; i++) {
      expect(sim.results[i].finalTotalCents).toBeLessThanOrEqual(
        sim.results[i + 1].finalTotalCents
      );
    }

    // A melhor opção deve ser a de menor taxa de crédito (Banco Inter a 2.89% a.m.)
    expect(sim.bestOption.bank.id).toBe('inter');
    expect(sim.maxSavingsCents).toBeGreaterThan(0);
  });

  it('identifica quando a simulação ultrapassa o limite cadastrado do banco', () => {
    const limits = {
      nubank: { creditLimitCents: 50000, pixLimitCents: 30000 } // Limite R$ 500
    };

    const sim = simulateAllBanks({
      amountCents: 100000, // R$ 1.000
      installments: 6,
      simulationType: 'credito',
      limits
    });

    const nuResult = sim.results.find((r) => r.bank.id === 'nubank');
    expect(nuResult).toBeDefined();
    expect(nuResult?.exceedsLimit).toBe(true);
    expect(nuResult?.overLimitCents).toBeGreaterThan(50000);
  });

  it('salva e recupera limites bancários por usuário e espaço', () => {
    const testLimits = {
      itau: { creditLimitCents: 450000, pixLimitCents: 200000 },
      c6: { creditLimitCents: 150000, pixLimitCents: 80000 }
    };

    saveBankLimits('user-1', 'space-1', testLimits);
    const retrieved = getSavedBankLimits('user-1', 'space-1');

    expect(retrieved['itau'].creditLimitCents).toBe(450000);
    expect(retrieved['c6'].pixLimitCents).toBe(80000);
  });

  it('inclui PicPay na lista de bancos com taxas de crédito e pix parcelado', () => {
    const picpay = POPULAR_BANKS.find((b) => b.id === 'picpay');
    expect(picpay).toBeDefined();
    expect(picpay?.name).toBe('PicPay');
    expect(picpay?.color).toBe('#11C76F');
    expect(picpay?.creditMonthlyRate).toBe(3.29);
    expect(picpay?.pixMonthlyRate).toBe(3.89);
  });
});
