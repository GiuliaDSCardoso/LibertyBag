const fs = require('fs');
const path = require('path');

function generatePdf(lines) {
  let content = 'BT\n/F1 12 Tf\n50 770 Td\n18 TL\n';
  content += '(EXTRATO BANCARIO - LIBERTYBAG) Tj T*\n';
  content += '(Periodo: Novembro de 2026) Tj T*\n';
  content += '(----------------------------------------------------------------------) Tj T*\n';

  for (const l of lines) {
    const escaped = l
      .split('\\').join('\\\\')
      .split('(').join('\\(')
      .split(')').join('\\)');
    content += '(' + escaped + ') Tj T*\n';
  }
  content += 'ET\n';

  const streamLength = Buffer.byteLength(content, 'utf8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  // obj 1: Catalog
  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // obj 2: Pages
  offsets.push(pdf.length);
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // obj 3: Page
  offsets.push(pdf.length);
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';

  // obj 4: Contents (Stream)
  offsets.push(pdf.length);
  pdf += '4 0 obj\n<< /Length ' + streamLength + ' >>\nstream\n' + content + '\nendstream\nendobj\n';

  // obj 5: Font
  offsets.push(pdf.length);
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const startxref = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (const o of offsets) {
    pdf += String(o).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + startxref + '\n%%EOF\n';

  return Buffer.from(pdf, 'utf8');
}

const sampleLines = [
  '01/11/2026 Salario Mensal Empresa +R$ 3.500,00',
  '02/11/2026 Supermercado Carrefour Alimentos -R$ 215,40',
  '03/11/2026 Enel Conta de Luz Energia -R$ 89,90',
  '04/11/2026 Drogasil Farmacia Remedios -R$ 45,50',
  '04/11/2026 Uber Viagens Transporte -R$ 28,90',
  '05/11/2026 Ifood Restaurante Almoco -R$ 54,00',
  '05/11/2026 Netflix Assinaturas Mensalidade -R$ 39,90',
  '06/11/2026 Pix Recebido Trabalho Extra +R$ 450,00',
  '07/11/2026 Posto Ipiranga Gasolina Combustivel -R$ 120,00',
  '08/11/2026 Padaria Cafe da Manha Pao -R$ 18,50'
];

const buf = generatePdf(sampleLines);

const paths = [
  path.join(process.cwd(), 'public', 'extrato-teste.pdf'),
  path.join(process.cwd(), 'extrato-teste.pdf'),
  path.join('C:', 'Users', 'giuli', 'Downloads', 'extrato-teste.pdf')
];

for (const p of paths) {
  try {
    fs.writeFileSync(p, buf);
    console.log('Arquivo salvo em:', p);
  } catch (err) {
    console.warn('Nao foi possivel salvar em:', p, err.message);
  }
}
