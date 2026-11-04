import { beforeEach, describe, expect, it } from 'vitest';
import { db, type BaseEntity, type TransactionRecord } from '../db/dexie';
import { ensureInitialDataSeeded } from '../db/seed';
import {
  calculateInstallmentPlan,
  createTransactionWithUndo
} from '../features/transactions/transactionService';
import { createSpaceWithUndo } from '../features/spaces/spacesService';
import { resolveConflictLWW } from '../features/sync/syncService';
import {
  evaluatePasswordStrength,
  generateSixDigitCode,
  registerUserAccount,
  sendVerificationCodeEmail,
  signInUserAccount,
  validateAuthForm,
  verifySixDigitCode
} from '../features/auth/authService';

describe('LibertyBag — Parcelamento Completo (Entrada, Juros, Crédito/Pix Parcelado) & Fase 3 (Espaços e Sync LWW)', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.recurrences.clear();
    await db.categories.clear();
    await db.spaces.clear();
    await db.space_members.clear();
    await db.accounts.clear();
    await db.users.clear();
    await ensureInitialDataSeeded();
  });

  it('calcula parcelamento com entrada e com juros (informando valor da parcela)', () => {
    // Compra de R$ 1.000,00 -> Deu R$ 200,00 de entrada e parcelou o restante (R$ 800) em 5x de R$ 180,00 (com juros)
    const plan = calculateInstallmentPlan({
      baseAmountCents: 100000,
      installmentsCount: 5,
      hasDownPayment: true,
      downPaymentCents: 20000,
      hasInterest: true,
      interestMode: 'installment_value',
      customInstallmentCents: 18000
    });

    expect(plan.downPaymentCents).toBe(20000);
    expect(plan.principalToFinanceCents).toBe(80000);
    expect(plan.financedTotalCents).toBe(90000); // 5 * R$ 180,00
    expect(plan.finalTotalCents).toBe(110000); // R$ 200 entrada + R$ 900 parcelas = R$ 1.100,00
    expect(plan.interestCents).toBe(10000); // R$ 100,00 de juros
    expect(plan.hasInterest).toBe(true);
    expect(plan.summaryText).toContain('Entrada hoje');
    expect(plan.summaryText).toContain('5x de');
  });

  it('cria no banco a Entrada hoje (current=0) e as parcelas nos meses seguintes no Pix Parcelado / Crédito', async () => {
    const res = await createTransactionWithUndo({
      amountCents: 100000,
      type: 'saida',
      categoryId: 'cat-casa',
      date: '2026-11-10',
      description: 'Fogão novo',
      paymentMethod: 'pix_parcelado',
      installmentsCount: 3,
      hasDownPayment: true,
      downPaymentCents: 25000,
      hasInterest: true,
      interestMode: 'total_with_interest',
      totalWithInterestCents: 106000 // R$ 1.060,00 no total (R$ 250 entrada + R$ 810 em 3x de R$ 270)
    });

    // 1 entrada + 3 parcelas = 4 lançamentos criados
    expect(res.createdIds).toHaveLength(4);

    const txs = await db.transactions.bulkGet(res.createdIds);
    const validTxs = txs.filter((t): t is TransactionRecord => Boolean(t));
    expect(validTxs).toHaveLength(4);

    const entrada = validTxs.find((t) => t.installment?.current === 0)!;
    expect(entrada.amountCents).toBe(25000);
    expect(entrada.date).toBe('2026-11-10');
    expect(entrada.description).toContain('Entrada');

    const p1 = validTxs.find((t) => t.installment?.current === 1)!;
    const p2 = validTxs.find((t) => t.installment?.current === 2)!;
    const p3 = validTxs.find((t) => t.installment?.current === 3)!;

    expect(p1.amountCents).toBe(27000);
    expect(p1.date).toBe('2026-12-10');
    expect(p2.date).toBe('2027-01-10');
    expect(p3.date).toBe('2027-02-10');
    expect(p1.paymentMethod).toBe('pix_parcelado');
  });

  it('repete um lançamento por X meses quando ativado "Repete outros meses -> Por X meses"', async () => {
    const res = await createTransactionWithUndo({
      amountCents: 8990,
      type: 'saida',
      categoryId: 'cat-educacao',
      date: '2026-11-05',
      description: 'Curso de Inglês',
      paymentMethod: 'credito',
      repeatMonthly: true,
      repeatMonthsCount: 4
    });

    expect(res.createdIds).toHaveLength(4);
    expect(res.recurrenceId).toBeTruthy();
  });

  it('cria um Espaço Compartilhado com código de convite de 6 caracteres e categorias isoladas', async () => {
    const { space, undo } = await createSpaceWithUndo({
      name: 'Casa com a Mamãe',
      type: 'compartilhado'
    });

    expect(space.name).toBe('Casa com a Mamãe');
    expect(space.type).toBe('compartilhado');
    expect(space.inviteCode).toMatch(/^[A-Z]{4}[0-9]{2}$/);

    const spaceCats = await db.categories.where('spaceId').equals(space.id).toArray();
    expect(spaceCats.length).toBe(17);

    await undo();
    const afterUndo = await db.spaces.get(space.id);
    expect(afterUndo).toBeUndefined();
    const catsAfterDelete = await db.categories.where('spaceId').equals(space.id).count();
    expect(catsAfterDelete).toBe(0);
  });

  it('resolve conflitos de sincronização via Last-Write-Wins (updatedAt) respeitando deletedAt', () => {
    const olderLocal: BaseEntity = {
      id: 'tx-1',
      createdAt: '2026-11-04T10:00:00.000Z',
      updatedAt: '2026-11-04T10:00:00.000Z',
      deletedAt: null
    };

    const newerRemoteDeleted: BaseEntity = {
      id: 'tx-1',
      createdAt: '2026-11-04T10:00:00.000Z',
      updatedAt: '2026-11-04T12:00:00.000Z',
      deletedAt: '2026-11-04T12:00:00.000Z'
    };

    const winner = resolveConflictLWW(olderLocal, newerRemoteDeleted);
    expect(winner.deletedAt).toBe('2026-11-04T12:00:00.000Z');
  });

  it('avalia a força da senha em 4 níveis e fornece dica amigável', () => {
    const weak = evaluatePasswordStrength('12345');
    expect(weak.score).toBe(1);

    const strong = evaluatePasswordStrength('Praia@2026');
    expect(strong.score).toBe(4);
    expect(strong.checks.minLength).toBe(true);
    expect(strong.checks.hasUpperAndLower).toBe(true);
    expect(strong.checks.hasNumber).toBe(true);
    expect(strong.checks.hasSpecial).toBe(true);
    expect(strong.label).toContain('Super segura');
  });

  it('gera código de 6 dígitos e valida confirmação de login/cadastro', async () => {
    const sample = generateSixDigitCode();
    expect(sample).toMatch(/^\d{6}$/);

    const sent = await sendVerificationCodeEmail({
      email: 'mamae@familia.com',
      name: 'Dona Maria',
      purpose: 'signup'
    });

    expect(sent.code).toMatch(/^\d{6}$/);
    expect(sent.confirmLink).toContain('confirm_email=mamae%40familia.com');
    expect(sent.confirmLink).toContain(`code=${sent.code}`);

    const wrongCheck = await verifySixDigitCode('mamae@familia.com', '000000');
    if (sent.code !== '000000') {
      expect(wrongCheck.valid).toBe(false);
    }

    const rightCheck = await verifySixDigitCode('mamae@familia.com', sent.code);
    expect(rightCheck.valid).toBe(true);
    expect(rightCheck.name).toBe('Dona Maria');
  });

  it('valida todos os campos, impede criar conta duplicada e só permite login se a conta existir', async () => {
    localStorage.clear();

    // 1. Validação de campos inválidos
    const invalidSignup = validateAuthForm({
      mode: 'signup',
      name: 'A',
      email: 'email-invalido',
      password: '123'
    });
    expect(invalidSignup.valid).toBe(false);
    expect(invalidSignup.fieldErrors.name).toBeTruthy();
    expect(invalidSignup.fieldErrors.email).toBeTruthy();
    expect(invalidSignup.fieldErrors.password).toBeTruthy();

    // 2. Tentativa de login de uma conta que NÃO existe no banco -> deve ser bloqueada!
    const nonExistentLogin = await signInUserAccount({
      email: 'naoexiste@libertybag.com',
      password: 'SenhaForte123'
    });
    expect(nonExistentLogin.ok).toBe(false);
    expect(nonExistentLogin.fieldErrors?.email).toContain('Não encontramos nenhuma conta');

    // 3. Cadastro válido da primeira conta
    const firstSignup = await registerUserAccount({
      name: 'Giulia Cardoso',
      email: 'giulia@libertybag.com',
      password: 'Praia2026!'
    });
    expect(firstSignup.ok).toBe(true);

    // 4. Tentativa de cadastrar de novo o MESMO e-mail -> deve bloquear duplicação!
    const duplicateSignup = await registerUserAccount({
      name: 'Giulia Duplicada',
      email: 'GIULIA@libertybag.com',
      password: 'OutraSenha2026!'
    });
    expect(duplicateSignup.ok).toBe(false);
    expect(duplicateSignup.fieldErrors?.email).toContain('Já existe uma conta cadastrada');

    // 5. Login com senha errada -> bloqueado!
    const wrongPassLogin = await signInUserAccount({
      email: 'giulia@libertybag.com',
      password: 'SenhaErrada123'
    });
    expect(wrongPassLogin.ok).toBe(false);
    expect(wrongPassLogin.fieldErrors?.password).toContain('Senha incorreta');

    // 6. Primeiro login antes da verificação no dispositivo -> pede confirmação de 6 dígitos
    const validLogin = await signInUserAccount({
      email: 'giulia@libertybag.com',
      password: 'Praia2026!'
    });
    expect(validLogin.ok).toBe(true);
    expect(validLogin.name).toBe('Giulia Cardoso');
    expect(validLogin.requiresDeviceVerification).toBe(true);

    // 7. Confirma o código de 6 dígitos no dispositivo -> próximos logins no mesmo dispositivo não pedem mais confirmação!
    const codeSent = await sendVerificationCodeEmail({
      email: 'giulia@libertybag.com',
      name: 'Giulia Cardoso',
      purpose: 'signup'
    });
    const verified = await verifySixDigitCode('giulia@libertybag.com', codeSent.code);
    expect(verified.valid).toBe(true);

    const secondLoginSameDevice = await signInUserAccount({
      email: 'giulia@libertybag.com',
      password: 'Praia2026!'
    });
    expect(secondLoginSameDevice.ok).toBe(true);
    expect(secondLoginSameDevice.requiresDeviceVerification).toBe(false);
  });
});
