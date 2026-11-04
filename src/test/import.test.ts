import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/dexie';
import { DEFAULT_SPACE_ID, ensureInitialDataSeeded } from '../db/seed';
import {
  inferCategoryAndTypeAutomatically,
  parseCSVTransactions,
  parsePDFTransactions,
  parseSignedMoneyValue,
  saveImportedTransactionsWithUndo
} from '../features/settings/importService';
import {
  bulkSoftDeleteTransactionsWithUndo,
  createTransactionWithUndo
} from '../features/transactions/transactionService';

describe('LibertyBag — Importação Automática de CSV e PDF', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.categories.clear();
    await db.spaces.clear();
    await db.users.clear();
    await ensureInitialDataSeeded();
  });

  it('analisa valores com sinal positivo e negativo e valores monetários brasileiros', () => {
    const valNeg = parseSignedMoneyValue('-45,90');
    expect(valNeg?.amountCents).toBe(4590);
    expect(valNeg?.hasNegativeSign).toBe(true);

    const valPos = parseSignedMoneyValue('+1.250,00');
    expect(valPos?.amountCents).toBe(125000);
    expect(valPos?.hasPositiveSign).toBe(true);

    const valPar = parseSignedMoneyValue('(120,50)');
    expect(valPar?.amountCents).toBe(12050);
    expect(valPar?.hasNegativeSign).toBe(true);

    // Números soltos como IDs, anos ou contadores (ex.: '151') NÃO viram valor monetário sem moeda ou decimais
    expect(parseSignedMoneyValue('151')).toBeNull();
    expect(parseSignedMoneyValue('2026')).toBeNull();
    expect(parseSignedMoneyValue('151', { isExplicitColumn: true })?.amountCents).toBe(15100);
  });

  it('infere automaticamente o tipo (entrada/saida) e a categoria correta baseado na descrição', async () => {
    const categories = await db.categories.where('spaceId').equals(DEFAULT_SPACE_ID).toArray();

    // Mercado (negativo / saida)
    const resMercado = inferCategoryAndTypeAutomatically({
      rawDescription: 'Supermercado Carrefour compra semanal',
      amountCents: 18550,
      categories
    });
    expect(resMercado.type).toBe('saida');
    expect(resMercado.categoryName.toLowerCase()).toContain('mercado');

    // Salário (positivo / entrada)
    const resSalario = inferCategoryAndTypeAutomatically({
      rawDescription: 'Salario referente ao mes',
      amountCents: 350000,
      categories
    });
    expect(resSalario.type).toBe('entrada');
    expect(resSalario.categoryName.toLowerCase()).toContain('salário');

    // Farmácia / Saúde (saída)
    const resFarmacia = inferCategoryAndTypeAutomatically({
      rawDescription: 'Drogasil compra de remedio',
      amountCents: 4200,
      categories
    });
    expect(resFarmacia.type).toBe('saida');
    expect(resFarmacia.categoryName.toLowerCase()).toContain('saúde');
  });

  it('importa arquivo CSV com cabeçalho de banco, categoriza sozinho e permite desfazer com 1 toque', async () => {
    const categories = await db.categories.where('spaceId').equals(DEFAULT_SPACE_ID).toArray();

    const sampleCsv = `Data;Tipo;Categoria;Valor (R$);Observação;Forma de Pagamento
2026-11-02;Dinheiro que saiu;Mercado;150,00;Feira da semana;pix
2026-11-03;Dinheiro que entrou;Salário;2.500,00;Pagamento da empresa;ted
2026-11-04;Dinheiro que saiu;Contas;89,90;Conta de Luz Enel;debito`;

    const parsed = parseCSVTransactions(sampleCsv, categories);
    expect(parsed).toHaveLength(3);

    expect(parsed[0].amountCents).toBe(15000);
    expect(parsed[0].type).toBe('saida');
    expect(parsed[0].date).toBe('2026-11-02');

    expect(parsed[1].amountCents).toBe(250000);
    expect(parsed[1].type).toBe('entrada');
    expect(parsed[1].date).toBe('2026-11-03');

    expect(parsed[2].amountCents).toBe(8990);
    expect(parsed[2].type).toBe('saida');

    // Salva no banco e testa Desfazer
    const saveRes = await saveImportedTransactionsWithUndo(parsed);
    expect(saveRes.importedCount).toBe(3);

    const activeTxs = await db.transactions.where('spaceId').equals(DEFAULT_SPACE_ID).and((t) => !t.deletedAt).toArray();
    expect(activeTxs.length).toBeGreaterThanOrEqual(3);

    await saveRes.undo();
    const afterUndoTxs = await db.transactions.where('spaceId').equals(DEFAULT_SPACE_ID).and((t) => !t.deletedAt).toArray();
    expect(afterUndoTxs).toHaveLength(0);
  });

  it('extrai linhas de extrato em texto de PDF com sinais e valores', async () => {
    const categories = await db.categories.where('spaceId').equals(DEFAULT_SPACE_ID).toArray();

    const samplePdfText = `
      EXTRATO DA CONTA CORRENTE
      05/11/2026 UBER VIAGENS -25,40
      06/11/2026 PIX RECEBIDO JOAO +300,00
      07/11/2026 IFOOD RESTAURANTE -64,90
    `;

    const parsed = parsePDFTransactions(samplePdfText, categories);
    expect(parsed.length).toBeGreaterThanOrEqual(3);

    const uber = parsed.find((p) => p.description.includes('UBER'));
    expect(uber).toBeDefined();
    expect(uber?.type).toBe('saida');
    expect(uber?.amountCents).toBe(2540);

    const pix = parsed.find((p) => p.description.includes('PIX RECEBIDO'));
    expect(pix).toBeDefined();
    expect(pix?.type).toBe('entrada');
    expect(pix?.amountCents).toBe(30000);
  });

  it('lê e importa o arquivo extrato-teste.pdf gerado identificando exatamente os 10 lançamentos', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { extractTextFromPDFBuffer } = await import('../features/settings/importService');
    const categories = await db.categories.where('spaceId').equals(DEFAULT_SPACE_ID).toArray();

    const pdfBuffer = fs.readFileSync(path.join(process.cwd(), 'extrato-teste.pdf'));
    const text = await extractTextFromPDFBuffer(pdfBuffer.buffer);
    const parsed = parsePDFTransactions(text, categories);

    expect(parsed).toHaveLength(10);
    expect(parsed[0].amountCents).toBe(350000);
    expect(parsed[0].type).toBe('entrada');
    expect(parsed[1].amountCents).toBe(21540);
    expect(parsed[1].type).toBe('saida');
  });

  it('permite selecionar lançamentos específicos ou todos para remover em massa com opção de desfazer', async () => {
    const t1 = await createTransactionWithUndo({
      amountCents: 1000,
      type: 'saida',
      categoryId: 'cat-mercado',
      date: '2026-11-04'
    });
    const t2 = await createTransactionWithUndo({
      amountCents: 2000,
      type: 'saida',
      categoryId: 'cat-mercado',
      date: '2026-11-04'
    });
    const t3 = await createTransactionWithUndo({
      amountCents: 3000,
      type: 'saida',
      categoryId: 'cat-mercado',
      date: '2026-11-04'
    });

    const allCreated = [t1.createdIds[0], t2.createdIds[0], t3.createdIds[0]];

    // 1. Remove apenas 2 selecionados
    const toDeleteSpecific = [allCreated[0], allCreated[1]];
    const bulkRes = await bulkSoftDeleteTransactionsWithUndo(toDeleteSpecific);
    expect(bulkRes.deletedCount).toBe(2);

    const activeAfterDelete = await db.transactions
      .where('spaceId')
      .equals(DEFAULT_SPACE_ID)
      .and((t) => !t.deletedAt)
      .toArray();
    expect(activeAfterDelete).toHaveLength(1);
    expect(activeAfterDelete[0].id).toBe(allCreated[2]);

    // 2. Desfaz e restaura todos os removidos
    await bulkRes.undo();
    const restored = await db.transactions
      .where('spaceId')
      .equals(DEFAULT_SPACE_ID)
      .and((t) => !t.deletedAt)
      .toArray();
    expect(restored).toHaveLength(3);
  });
});
