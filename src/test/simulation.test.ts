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

  it('inclui PicPay na lista de bancos com taxas reais de crédito e pix parcelado e tarifa', () => {
    const picpay = POPULAR_BANKS.find((b) => b.id === 'picpay');
    expect(picpay).toBeDefined();
    expect(picpay?.name).toBe('PicPay');
    expect(picpay?.color).toBe('#11C76F');
    expect(picpay?.creditMonthlyRate).toBe(5.49);
    expect(picpay?.pixMonthlyRate).toBe(5.493);
    expect(picpay?.pixServiceFeePercent).toBe(4.99);

    // Validação idêntica aos dados reais do aplicativo PicPay (print do usuário: R$ 1.000 em 6x = R$ 210,12)
    const picPayRealSim = calculateInstallment(100000, 5.493, 6, 4.99);
    expect(picPayRealSim.installmentCents).toBe(21012); // R$ 210,12 exatos
    expect(picPayRealSim.serviceFeeCents).toBe(4990); // R$ 49,90 tarifa de serviço
    expect(picPayRealSim.financingBaseCents).toBe(104990); // R$ 1.049,90 base financiada
    expect(picPayRealSim.cetMonthlyPercent).toBeGreaterThan(6.0); // CET real superior aos juros nominais
  });

  it('calcula parcelamento de cartão sem juros da loja (0% de acréscimo)', () => {
    const res = calculateInstallment(120000, 4.99, 10, 0, { creditInterestFree: true });
    expect(res.installmentCents).toBe(12000); // 10x de R$ 120,00
    expect(res.totalFinalCents).toBe(120000);
    expect(res.totalInterestCents).toBe(0);
    expect(res.cetMonthlyPercent).toBe(0);
  });

  it('calcula IOF oficial brasileiro quando ativado', () => {
    // R$ 1.000 em 6x com IOF
    const res = calculateInstallment(100000, 5.0, 6, 0, { includeIOF: true });
    expect(res.iofTotalCents).toBeGreaterThan(0);
    // 0,38% de R$ 1.000 = R$ 3,80 (380 cents) + IOF diário
    expect(res.iofTotalCents).toBeGreaterThanOrEqual(380);
    expect(res.financingBaseCents).toBe(100000 + res.iofTotalCents);
  });

  it('gera grade completa de parcelas compatível com o app do PicPay', async () => {
    const { generateFullInstallmentSchedule } = await import('../features/simulation/simulationService');
    const schedule = generateFullInstallmentSchedule(100000, 5.493, 4.99);
    const row1x = schedule.find(r => r.installments === 1);
    const row6x = schedule.find(r => r.installments === 6);
    expect(row1x).toBeDefined();
    expect(row1x?.installmentCents).toBe(104990); // 1x de R$ 1.049,90
    expect(row6x).toBeDefined();
    expect(row6x?.installmentCents).toBe(21012); // 6x de R$ 210,12
  });

  it('inclui 99Pay na lista de bancos populares', () => {
    const pay99 = POPULAR_BANKS.find(b => b.id === '99pay');
    expect(pay99).toBeDefined();
    expect(pay99?.name).toBe('99Pay');
    expect(pay99?.pixMonthlyRate).toBe(4.49);
  });

  it('inclui Banco do Brasil (BB) na lista de bancos populares', () => {
    const bb = POPULAR_BANKS.find(b => b.id === 'bb');
    expect(bb).toBeDefined();
    expect(bb?.name).toBe('Banco do Brasil (BB)');
    expect(bb?.creditMonthlyRate).toBe(3.99);
    expect(bb?.pixMonthlyRate).toBe(3.99);
    expect(bb?.pixServiceFeePercent).toBe(2.99);
  });
});
