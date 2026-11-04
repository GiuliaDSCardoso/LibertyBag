import { db } from '../../db/dexie';
import { DEFAULT_SPACE_ID } from '../../db/seed';
import { calculatePeriodTotals, formatCentsToBRL } from '../../lib/money';

/**
 * Gera conteúdo CSV em português do Brasil (separado por ponto e vírgula para abrir direto no Excel)
 * com todos os lançamentos ativos do espaço.
 */
export async function generateTransactionsCSV(
  spaceId: string = DEFAULT_SPACE_ID
): Promise<string> {
  const [transactions, categories] = await Promise.all([
    db.transactions
      .where('spaceId')
      .equals(spaceId)
      .and((t) => !t.deletedAt)
      .toArray(),
    db.categories.where('spaceId').equals(spaceId).toArray()
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const sorted = transactions.sort((a, b) => b.date.localeCompare(a.date));

  const header = ['Data', 'Tipo', 'Categoria', 'Valor (R$)', 'Observação', 'Forma de Pagamento'];
  const rows = sorted.map((tx) => {
    const tipoLabel = tx.type === 'entrada' ? 'Dinheiro que entrou' : 'Dinheiro que saiu';
    const catName = catMap.get(tx.categoryId) || 'Outros';
    const valorReais = (tx.amountCents / 100).toFixed(2).replace('.', ',');
    const obs = (tx.description || '').replace(/;/g, ',');
    const pm = tx.paymentMethod || 'pix';
    return [tx.date, tipoLabel, catName, valorReais, obs, pm].join(';');
  });

  // BOM UTF-8 para acentos abrirem certinho no Excel
  return '\uFEFF' + [header.join(';'), ...rows].join('\n');
}

/**
 * Faz o download do arquivo CSV no navegador/celular.
 */
export async function downloadTransactionsCSV(spaceId: string = DEFAULT_SPACE_ID): Promise<void> {
  const csv = await generateTransactionsCSV(spaceId);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `libertybag-lancamentos-${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Abre um relatório limpo e legível pronto para Salvar como PDF / Imprimir no celular ou computador.
 */
export async function printTransactionsReportPDF(
  spaceId: string = DEFAULT_SPACE_ID,
  userName?: string
): Promise<void> {
  const [transactions, categories] = await Promise.all([
    db.transactions
      .where('spaceId')
      .equals(spaceId)
      .and((t) => !t.deletedAt)
      .toArray(),
    db.categories.where('spaceId').equals(spaceId).toArray()
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const sorted = transactions.sort((a, b) => b.date.localeCompare(a.date));
  const totals = calculatePeriodTotals(sorted);

  const printWin = window.open('', '_blank', 'width=840,height=900');
  if (!printWin) return;

  const rowsHtml = sorted
    .map(
      (tx) => `
      <tr>
        <td>${tx.date.split('-').reverse().join('/')}</td>
        <td>${tx.type === 'entrada' ? 'Entrou' : 'Saiu'}</td>
        <td>${catMap.get(tx.categoryId) || 'Outros'}</td>
        <td>${tx.description || '-'}</td>
        <td style="text-align:right; font-weight:bold; color:${
          tx.type === 'entrada' ? '#2E9E6B' : '#D9534F'
        }">
          ${tx.type === 'entrada' ? '+' : '-'} ${formatCentsToBRL(tx.amountCents)}
        </td>
      </tr>`
    )
    .join('');

  printWin.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório LibertyBag</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #12206B; padding: 32px; }
          h1 { color: #2346C8; margin-bottom: 4px; }
          .summary { display: flex; gap: 24px; margin: 20px 0; padding: 16px; background: #FBF6EA; border-radius: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 10px 8px; border-bottom: 1px solid #BFD4F2; text-align: left; font-size: 14px; }
          th { background: #BFD4F2; color: #12206B; }
        </style>
      </head>
      <body>
        <h1>LibertyBag — Resumo Financeiro${userName ? ` de ${userName}` : ''}</h1>
        <p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
        <div class="summary">
          <div><strong>Dinheiro que entrou:</strong> ${formatCentsToBRL(totals.entrou)}</div>
          <div><strong>Dinheiro que saiu:</strong> ${formatCentsToBRL(totals.saiu)}</div>
          <div><strong>Sobrou:</strong> ${formatCentsToBRL(totals.sobrou)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Movimento</th>
              <th>Categoria</th>
              <th>Observação</th>
              <th style="text-align:right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5">Nenhum lançamento registrado.</td></tr>'}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}
