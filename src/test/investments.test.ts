import { describe, it, expect } from 'vitest';
import {
  calculateInvestmentSimulation,
  calculateGoalMode,
  calculateDiversifiedPortfolio,
  getIncomeTaxRatePercent,
  convertPeriodToTimeUnits,
  annualRateToMonthlyRate,
  getBestInvestmentRecommendation,
  getRecommendedPortfolioAllocation
} from '../features/investments/investmentService';

describe('LibertyBag — Simulador de Investimentos (Fase 4)', () => {
  it('converte períodos em meses e dias com exatidão', () => {
    expect(convertPeriodToTimeUnits(2, 'years')).toEqual({ months: 24, days: 730 });
    expect(convertPeriodToTimeUnits(6, 'months')).toEqual({ months: 6, days: 180 });
    expect(convertPeriodToTimeUnits(90, 'days')).toEqual({ months: 3, days: 90 });
  });

  it('aplica a tabela regressiva de Imposto de Renda e isenção corretamente', () => {
    // Isento
    expect(getIncomeTaxRatePercent(100, true)).toBe(0);
    expect(getIncomeTaxRatePercent(1000, true)).toBe(0);

    // Tributado
    expect(getIncomeTaxRatePercent(180, false)).toBe(22.5);
    expect(getIncomeTaxRatePercent(181, false)).toBe(20.0);
    expect(getIncomeTaxRatePercent(360, false)).toBe(20.0);
    expect(getIncomeTaxRatePercent(361, false)).toBe(17.5);
    expect(getIncomeTaxRatePercent(720, false)).toBe(17.5);
    expect(getIncomeTaxRatePercent(721, false)).toBe(15.0);
  });

  it('converte taxa anual em taxa mensal composta', () => {
    // 12% a.a. => (1.12)^(1/12) - 1 ~= 0.9488% ao mês
    const mRate = annualRateToMonthlyRate(12);
    expect(mRate).toBeGreaterThan(0.009);
    expect(mRate).toBeLessThan(0.01);
  });

  it('simula investimento com aportes mensais e reinvestimento de rendimentos', () => {
    // R$ 10.000 de entrada + R$ 1.000/mês por 12 meses a 10.65% a.a. (CDB 100% CDI)
    const res = calculateInvestmentSimulation({
      initialAmountCents: 1000000, // R$ 10.000
      monthlyContributionCents: 100000, // R$ 1.000
      periodValue: 12,
      periodUnit: 'months',
      reinvestDividends: true,
      assetId: 'cdb_100',
      institutionId: 'nubank'
    });

    expect(res.totalMonths).toBe(12);
    expect(res.totalInvestedCents).toBe(2200000); // 10k + 12*1k = 22k
    expect(res.grossInterestCents).toBeGreaterThan(120000); // Mais de R$ 1.200 de juros
    expect(res.grossTotalCents).toBe(res.totalInvestedCents + res.grossInterestCents);
    expect(res.incomeTaxRatePercent).toBe(20.0); // 360 dias = 20%
    expect(res.netTotalCents).toBeLessThan(res.grossTotalCents);
    expect(res.finalEstimatedMonthlyPassiveIncomeCents).toBeGreaterThan(0);
    expect(res.timeline.length).toBe(13); // Mês 0 até Mês 12
  });

  it('garante isenção de IR para LCI e LCA', () => {
    const res = calculateInvestmentSimulation({
      initialAmountCents: 500000, // R$ 5.000
      monthlyContributionCents: 50000, // R$ 500
      periodValue: 2,
      periodUnit: 'years',
      reinvestDividends: true,
      assetId: 'lci_lca_90',
      institutionId: 'inter'
    });

    expect(res.incomeTaxRatePercent).toBe(0);
    expect(res.incomeTaxAmountCents).toBe(0);
    expect(res.netInterestCents).toBe(res.grossInterestCents);
    expect(res.netTotalCents).toBe(res.grossTotalCents);
  });

  it('calcula o Modo Meta Financeira Invertida (Tempo e Aporte sugerido)', () => {
    // Meta: R$ 50.000
    // Inicial: R$ 5.000
    // Aporte atual: R$ 1.000/mês a 10.65% a.a.
    const goalRes = calculateGoalMode({
      targetGoalCents: 5000000,
      initialAmountCents: 500000,
      monthlyContributionCents: 100000,
      targetMonths: 24, // Quer atingir em 24 meses
      effectiveAnnualRatePercent: 10.65
    });

    // Em 24 meses com R$ 1k/mês: 5k + 24k = 29k investido + rendimentos ~ 32k < 50k
    // Portanto, tempo necessário deve ser maior que 24 meses (~36-40 meses)
    expect(goalRes.estimatedMonthsToGoal).toBeGreaterThan(30);
    expect(goalRes.estimatedMonthsToGoal).toBeLessThan(45);

    // Aporte sugerido para atingir em 24 meses deve ser maior que R$ 1.500/mês
    expect(goalRes.suggestedMonthlyContributionCents).toBeGreaterThan(150000);
    expect(goalRes.progressPercent).toBe(10); // 5k de 50k = 10%
  });

  it('recomenda a melhor escolha inteligente por prazo', () => {
    // Curto prazo (até 12 meses): LCI do Inter isenta
    const shortRec = getBestInvestmentRecommendation(12, false);
    expect(shortRec.recommendedAsset.category).toBe('lci_lca');
    expect(shortRec.recommendedInstitution.id).toBe('inter');

    // Médio prazo (até 36 meses): CDB 120%
    const medRec = getBestInvestmentRecommendation(24, false);
    expect(medRec.recommendedAsset.id).toBe('cdb_120');

    // Longo prazo (> 36 meses): Tesouro IPCA+
    const longRec = getBestInvestmentRecommendation(60, false);
    expect(longRec.recommendedAsset.id).toBe('tesouro_ipca');
  });

  it('sugere carteiras de diversificação balanceadas conforme o horizonte de tempo', () => {
    const allocShort = getRecommendedPortfolioAllocation(6);
    expect(allocShort.reduce((acc, curr) => acc + curr.percentage, 0)).toBe(100);

    const allocMed = getRecommendedPortfolioAllocation(24);
    expect(allocMed.reduce((acc, curr) => acc + curr.percentage, 0)).toBe(100);

    const allocLong = getRecommendedPortfolioAllocation(60);
    expect(allocLong.reduce((acc, curr) => acc + curr.percentage, 0)).toBe(100);
  });

  it('calcula os ganhos da carteira diversificada para perfil Leve com resgate a qualquer momento', () => {
    const divRes = calculateDiversifiedPortfolio({
      initialAmountCents: 1000000, // R$ 10.000
      monthlyContributionCents: 50000, // R$ 500
      periodMonths: 12,
      riskProfile: 'leve',
      liquidityPreference: 'qualquer_momento',
      reinvestDividends: true
    });

    expect(divRes.allocations.reduce((acc, curr) => acc + curr.percentage, 0)).toBe(100);
    // Deve incluir ativos de liquidez diária como Tesouro Selic e 99Pay
    const has99Pay = divRes.allocations.some((a) => a.id === '99pay');
    expect(has99Pay).toBe(true);

    expect(divRes.netFinalCents).toBeGreaterThan(divRes.totalInvestedCents);
    expect(divRes.poupancaExtraGainCents).toBeGreaterThan(0);
    expect(divRes.monthlyPassiveIncomeCents).toBeGreaterThan(0);
    expect(divRes.diagnosis.title).toContain('Reserva Imediata');
  });

  it('calcula os ganhos da carteira diversificada para perfil Alto Risco com prazo fixo', () => {
    const divRes = calculateDiversifiedPortfolio({
      initialAmountCents: 2000000, // R$ 20.000
      monthlyContributionCents: 100000, // R$ 1.000
      periodMonths: 36,
      riskProfile: 'alto',
      liquidityPreference: 'prazo_fixo',
      reinvestDividends: true
    });

    expect(divRes.allocations.reduce((acc, curr) => acc + curr.percentage, 0)).toBe(100);
    // Deve incluir FIIs e Ações
    const hasAcoes = divRes.allocations.some((a) => a.id === 'acoes');
    const hasFIIs = divRes.allocations.some((a) => a.id === 'fiis');
    expect(hasAcoes).toBe(true);
    expect(hasFIIs).toBe(true);

    expect(divRes.blendedAnnualRatePercent).toBeGreaterThan(11.0);
    expect(divRes.poupancaExtraGainCents).toBeGreaterThan(0);
  });

  it('inclui a instituição 99Pay e o catálogo de dicas de ações e guia fácil', async () => {
    const { INVESTMENT_INSTITUTIONS, SECTOR_STOCK_TIPS, SIMPLE_INVESTMENT_GUIDE, fetchLiveBacenRates } =
      await import('../features/investments/investmentService');

    const p99 = INVESTMENT_INSTITUTIONS.find((i) => i.id === '99pay');
    expect(p99).toBeDefined();
    expect(p99?.name).toBe('99Pay');

    expect(SECTOR_STOCK_TIPS.length).toBeGreaterThanOrEqual(4);
    const hasEletricas = SECTOR_STOCK_TIPS.some((s) => s.id === 'eletricas');
    expect(hasEletricas).toBe(true);

    expect(SIMPLE_INVESTMENT_GUIDE.length).toBeGreaterThanOrEqual(5);

    const rates = await fetchLiveBacenRates();
    expect(rates.selicAnnualPercent).toBeGreaterThan(5);
    expect(rates.cdiAnnualPercent).toBeGreaterThan(5);
  });
});
