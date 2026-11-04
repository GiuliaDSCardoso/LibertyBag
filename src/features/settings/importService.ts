import {
  db,
  type CategoryRecord,
  type PaymentMethod,
  type TransactionRecord,
  type TransactionType
} from '../../db/dexie';
import { DEFAULT_SPACE_ID, DEFAULT_USER_ID } from '../../db/seed';
import { getTodayISO } from '../../lib/dates';
import { getSupabaseClient } from '../../lib/supabase';
import { syncAllWithSupabase } from '../sync/syncService';

export interface ParsedImportItem {
  date: string; // YYYY-MM-DD
  amountCents: number; // sempre positivo em centavos
  type: TransactionType; // 'entrada' (positivo) | 'saida' (negativo)
  categoryId: string;
  categoryName: string;
  description: string;
  paymentMethod: PaymentMethod;
}

function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const KEYWORD_RULES: {
  type: TransactionType;
  categoryNameNormalized: string;
  fallbackId: string;
  keywords: string[];
}[] = [
  // Entradas (Positivo)
  {
    type: 'entrada',
    categoryNameNormalized: 'salario',
    fallbackId: 'cat-salario',
    keywords: [
      'salario',
      'remuneracao',
      'vencimento',
      'pro-labore',
      'prolabore',
      'holerite',
      'adiantamento salarial',
      '13o',
      'decimo terceiro',
      'folha de pagamento',
      'aposentadoria',
      'inss'
    ]
  },
  {
    type: 'entrada',
    categoryNameNormalized: 'trabalho extra',
    fallbackId: 'cat-extra',
    keywords: [
      'freela',
      'freelance',
      'servico prestado',
      'comissao',
      'venda',
      'pix recebido',
      'transferencia recebida',
      'ted recebida',
      'doc recebido',
      'reembolso',
      'cashback',
      'estorno',
      'rendimento',
      'dividendo',
      'deposito'
    ]
  },
  {
    type: 'entrada',
    categoryNameNormalized: 'ajuda da familia',
    fallbackId: 'cat-ajuda-familia',
    keywords: ['ajuda', 'mesada', 'pensao', 'doacao recebida', 'presente recebido']
  },

  // Saídas (Negativo)
  {
    type: 'saida',
    categoryNameNormalized: 'mercado',
    fallbackId: 'cat-mercado',
    keywords: [
      'mercado',
      'supermercado',
      'hipermercado',
      'atacadao',
      'atacadista',
      'assai',
      'carrefour',
      'pao de acucar',
      'extra',
      'hortifruti',
      'sacolao',
      'feira',
      'acougue',
      'padaria',
      'panificadora',
      'mercearia',
      'guanabara',
      'mundial',
      'zaffari',
      'angeloni',
      'condor',
      'mateus',
      'dia %',
      'minuto pao',
      'oxxo'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'comida fora',
    fallbackId: 'cat-comida-fora',
    keywords: [
      'ifood',
      'ifd*',
      'rappi',
      'ze delivery',
      'restaurante',
      'lanchonete',
      'lanche',
      'burger',
      'hamburgueria',
      'mcdonalds',
      'mc donalds',
      'bk ',
      'burger king',
      'pizza',
      'pizzaria',
      'sushi',
      'japones',
      'cafe',
      'cafeteria',
      'starbucks',
      'padoca',
      'churrascaria',
      'sorvete',
      'sorveteria',
      'acai',
      'outback',
      'habibs',
      'subway',
      'bar ',
      'boteco',
      'almoco',
      'jantar'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'transporte',
    fallbackId: 'cat-transporte',
    keywords: [
      'uber',
      '99app',
      '99 pop',
      '99*',
      '99 tecnologia',
      'taxi',
      'posto',
      'combustivel',
      'gasolina',
      'etanol',
      'ipiranga',
      'shell',
      'petrobras',
      'ale ',
      'estacionamento',
      'park',
      'pedagio',
      'sem parar',
      'veloe',
      'conectcar',
      'taggy',
      'metro',
      'onibus',
      'bilhete unico',
      'top ',
      'riocard',
      'oficina',
      'mecanico',
      'pneu'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'contas',
    fallbackId: 'cat-contas',
    keywords: [
      'conta de luz',
      'energia',
      'enel',
      'cemig',
      'copel',
      'celpe',
      'neoenergia',
      'cpfl',
      'equatorial',
      'light',
      'eletropaulo',
      'agua',
      'sabesp',
      'copasa',
      'sanepar',
      'cedae',
      'cagece',
      'embasa',
      'corsan',
      'saneago',
      'internet',
      'vivo',
      'claro',
      'tim',
      'oi ',
      'net ',
      'algar',
      'brisanet',
      'gas de cozinha',
      'botijao de gas',
      'ultragaz',
      'supergasbras',
      'comgas',
      'naturgy',
      'condominio',
      'iptu',
      'ipva',
      'darf',
      'imposto',
      'taxa',
      'tarifa',
      'boleto'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'casa',
    fallbackId: 'cat-casa',
    keywords: [
      'aluguel',
      'quintoandar',
      'imobiliaria',
      'leroy',
      'telhanorte',
      'c&c',
      'camicado',
      'tokstok',
      'madeiramadeira',
      'reforma',
      'material de construcao',
      'manutencao',
      'faxina',
      'diarista',
      'eletro',
      'geladeira',
      'fogao',
      'maquina de lavar',
      'colchao',
      'moveis',
      'utilidades'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'saude',
    fallbackId: 'cat-saude',
    keywords: [
      'farmacia',
      'drogaria',
      'drogasil',
      'droga raia',
      'raia',
      'pague menos',
      'panvel',
      'araujo',
      'pacheco',
      'sao paulo',
      'ultrafarma',
      'remedio',
      'medicamento',
      'consulta',
      'medico',
      'dentista',
      'odonto',
      'exame',
      'laboratorio',
      'fleury',
      'delboni',
      'hermes pardini',
      'sabin',
      'lavoisier',
      'hospital',
      'clinica',
      'psicologo',
      'terapia',
      'unimed',
      'amil',
      'bradesco saude',
      'sulamerica',
      'hapvida',
      'notredame',
      'plano de saude'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'educacao',
    fallbackId: 'cat-educacao',
    keywords: [
      'escola',
      'colegio',
      'faculdade',
      'universidade',
      'curso',
      'mensalidade escolar',
      'livro',
      'livraria',
      'leitura',
      'saraiva',
      'papelaria',
      'kalunga',
      'udemy',
      'alura',
      'ingles',
      'idiomas',
      'matricula'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'assinaturas',
    fallbackId: 'cat-assinaturas',
    keywords: [
      'netflix',
      'spotify',
      'amazon prime',
      'prime video',
      'disney',
      'hbo',
      'max',
      'globoplay',
      'youtube',
      'apple.com/bill',
      'icloud',
      'google *',
      'chatgpt',
      'openai',
      'canva',
      'microsoft',
      'playstation',
      'xbox',
      'steam',
      'nintendo',
      'meli+',
      'gympass',
      'wellhub',
      'totalpass',
      'smartfit',
      'bluefit',
      'academia',
      'assinatura',
      'mensalidade'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'lazer',
    fallbackId: 'cat-lazer',
    keywords: [
      'cinema',
      'cinemark',
      'kinoplex',
      'uci',
      'ingresso',
      'sympla',
      'eventim',
      'ticketmaster',
      'show',
      'teatro',
      'parque',
      'viagem',
      'hotel',
      'pousada',
      'airbnb',
      'booking',
      'decolar',
      'latam',
      'gol ',
      'azul ',
      'passagem aerea',
      'praia',
      'passeio',
      'festa',
      'jogos'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'roupas',
    fallbackId: 'cat-roupas',
    keywords: [
      'renner',
      'riachuelo',
      'cea',
      'c&a',
      'zara',
      'shein',
      'shopee',
      'hering',
      'marisa',
      'pernambucanas',
      'centauro',
      'netshoes',
      'decathlon',
      'nike',
      'adidas',
      'arezzo',
      'melissa',
      'roupa',
      'calcado',
      'sapato',
      'tenis',
      'vestido',
      'camisa',
      'loja'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'cuidados pessoais',
    fallbackId: 'cat-cuidados',
    keywords: [
      'salao',
      'cabeleireiro',
      'barbearia',
      'cabelo',
      'manicure',
      'unha',
      'estetica',
      'depilacao',
      'perfumaria',
      'perfume',
      'boticario',
      'natura',
      'eudora',
      'sephora',
      'epocacosmeticos',
      'cosmetico',
      'maquiagem'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'familia e presentes',
    fallbackId: 'cat-familia',
    keywords: [
      'presente',
      'brinquedo',
      'ri happy',
      'pbkids',
      'pet',
      'petshop',
      'cobasi',
      'petz',
      'petlove',
      'veterinario',
      'racao',
      'filho',
      'bebe',
      'fralda',
      'floricultura',
      'cacau show',
      'kopenhagen'
    ]
  },
  {
    type: 'saida',
    categoryNameNormalized: 'pequenos gastos',
    fallbackId: 'cat-pequenos-gastos',
    keywords: ['cafezinho', 'banca', 'loterica', 'pix enviado', 'transferencia enviada']
  }
];

/**
 * Descobre automaticamente se o item é positivo ('entrada') ou negativo ('saida')
 * e qual é a categoria mais adequada no espaço ativo.
 */
export function inferCategoryAndTypeAutomatically(params: {
  rawDescription: string;
  rawCategoryName?: string;
  explicitType?: TransactionType | null;
  hasNegativeSign?: boolean;
  hasPositiveSign?: boolean;
  amountCents: number;
  categories: CategoryRecord[];
}): {
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  paymentMethod: PaymentMethod;
} {
  const normDesc = normalizeText(params.rawDescription || '');
  const normCat = normalizeText(params.rawCategoryName || '');
  const combinedText = `${normCat} ${normDesc}`.trim();

  // 1. Determina se é entrada (positivo) ou saída (negativo)
  let inferredType: TransactionType | null = params.explicitType || null;

  if (!inferredType) {
    if (params.hasNegativeSign) {
      inferredType = 'saida';
    } else if (params.hasPositiveSign) {
      inferredType = 'entrada';
    }
  }

  // Verifica se o texto bate exatamente com o nome de alguma categoria cadastrada pelo usuário
  if (normCat) {
    const exactCat = params.categories.find(
      (c) =>
        !c.deletedAt &&
        normalizeText(c.name) === normCat &&
        (!inferredType || c.type === inferredType)
    );
    if (exactCat) {
      return {
        type: exactCat.type,
        categoryId: exactCat.id,
        categoryName: exactCat.name,
        paymentMethod: inferPaymentMethod(combinedText)
      };
    }
  }

  // Verifica palavras-chave para inferir categoria e tipo
  for (const rule of KEYWORD_RULES) {
    if (inferredType && rule.type !== inferredType) continue;
    const matched = rule.keywords.some((kw) => {
      const cleanKw = kw.trim();
      if (!cleanKw) return false;
      if (cleanKw.length <= 3) {
        const regex = new RegExp(`(^|\\s|[^a-z0-9])${cleanKw}($|\\s|[^a-z0-9])`, 'i');
        return regex.test(combinedText);
      }
      return combinedText.includes(cleanKw);
    });
    if (matched) {
      const finalType = inferredType || rule.type;
      const foundCat =
        params.categories.find(
          (c) =>
            !c.deletedAt &&
            c.type === finalType &&
            normalizeText(c.name) === rule.categoryNameNormalized
        ) ||
        params.categories.find((c) => !c.deletedAt && c.id === rule.fallbackId);

      if (foundCat) {
        return {
          type: finalType,
          categoryId: foundCat.id,
          categoryName: foundCat.name,
          paymentMethod: inferPaymentMethod(combinedText)
        };
      }
    }
  }

  // Se ainda não definiu o tipo, verifica palavras gerais de entrada vs saída
  if (!inferredType) {
    if (
      /\b(recebid[oa]|salario|deposito|rendimento|credito em conta|reembolso|estorno|entrada|entrou)\b/.test(
        combinedText
      )
    ) {
      inferredType = 'entrada';
    } else {
      inferredType = 'saida';
    }
  }

  // Procura também se o nome de alguma categoria do usuário aparece na descrição
  const matchedUserCat = params.categories.find(
    (c) =>
      !c.deletedAt &&
      c.type === inferredType &&
      normalizeText(c.name).length >= 3 &&
      normalizeText(c.name) !== 'outros' &&
      combinedText.includes(normalizeText(c.name))
  );
  if (matchedUserCat) {
    return {
      type: inferredType,
      categoryId: matchedUserCat.id,
      categoryName: matchedUserCat.name,
      paymentMethod: inferPaymentMethod(combinedText)
    };
  }

  // Fallback para "Outros" do tipo correspondente
  const fallbackOthers =
    params.categories.find(
      (c) => !c.deletedAt && c.type === inferredType && normalizeText(c.name) === 'outros'
    ) ||
    params.categories.find((c) => !c.deletedAt && c.type === inferredType) ||
    params.categories[0];

  return {
    type: inferredType,
    categoryId:
      fallbackOthers?.id ||
      (inferredType === 'entrada' ? 'cat-outros-entrada' : 'cat-outros-saida'),
    categoryName: fallbackOthers?.name || 'Outros',
    paymentMethod: inferPaymentMethod(combinedText)
  };
}

function inferPaymentMethod(normText: string): PaymentMethod {
  if (normText.includes('pix parcelado')) return 'pix_parcelado';
  if (normText.includes('pix')) return 'pix';
  if (normText.includes('credito') || normText.includes('fatura') || normText.includes('cartao')) {
    return 'credito';
  }
  if (normText.includes('debito')) return 'debito';
  if (normText.includes('dinheiro') || normText.includes('especie') || normText.includes('saque')) {
    return 'dinheiro';
  }
  return 'pix';
}

/**
 * Converte datas em formatos variados (DD/MM/YYYY, YYYY-MM-DD, DD/MM/YY, DD/MM) para YYYY-MM-DD.
 */
export function parseFlexibleDateToISO(raw: string): string | null {
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  if (!clean) return null;

  // YYYY-MM-DD
  const isoMatch = clean.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const brFullMatch = clean.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (brFullMatch) {
    const d = brFullMatch[1].padStart(2, '0');
    const m = brFullMatch[2].padStart(2, '0');
    const y = brFullMatch[3];
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // DD/MM/YY
  const brShortYearMatch = clean.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/);
  if (brShortYearMatch) {
    const d = brShortYearMatch[1].padStart(2, '0');
    const m = brShortYearMatch[2].padStart(2, '0');
    const y = `20${brShortYearMatch[3]}`;
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // DD/MM (assume o ano atual)
  const brDayMonthMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (brDayMonthMatch) {
    const d = brDayMonthMatch[1].padStart(2, '0');
    const m = brDayMonthMatch[2].padStart(2, '0');
    const y = new Date().getFullYear();
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

/**
 * Extrai o valor em centavos e se possui sinal negativo ou positivo explícito.
 */
export function parseSignedMoneyValue(
  raw: string,
  options?: { isExplicitColumn?: boolean }
): {
  amountCents: number;
  hasNegativeSign: boolean;
  hasPositiveSign: boolean;
} | null {
  const clean = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (!clean) return null;

  // Ignora strings que são claramente datas completas
  if (/^\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?$/.test(clean) || /^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return null;
  }

  // Ignora números longos sem pontuação decimal (ex.: CPF, CNPJ, códigos de barras, IDs de transação)
  const digitsOnly = clean.replace(/\D/g, '');
  if (
    !options?.isExplicitColumn &&
    digitsOnly.length >= 6 &&
    !clean.includes(',') &&
    !clean.includes('.')
  ) {
    return null;
  }

  const hasNegativeSign =
    clean.includes('-') ||
    /^\(.*\)$/.test(clean) ||
    /\bD$/i.test(clean) ||
    /\bdeb(ito)?\b/i.test(clean);
  const hasPositiveSign =
    clean.includes('+') || /\bC$/i.test(clean) || /\bcred(ito)?\b/i.test(clean);
  const hasCurrencySymbol = /R\$|\$|BRL/i.test(clean);
  const hasDecimals = /,\d{1,2}$|\.\d{2}$/.test(clean);

  // Se NÃO for uma coluna rotulada explicitamente como valor,
  // exige que a string tenha formato de moeda (símbolo, sinal negativo/positivo, ou centavos decimais)
  // Isso impede que números soltos de linha, IDs ou índices (como "151" ou "2026") virem lançamentos.
  if (
    !options?.isExplicitColumn &&
    !hasCurrencySymbol &&
    !hasNegativeSign &&
    !hasPositiveSign &&
    !hasDecimals
  ) {
    return null;
  }

  // Remove R$, espaços, sinais e letras D/C
  const numericPart = clean.replace(/[R$\s+()DCdcA-Za-z_-]/g, '').trim();
  if (!numericPart || !/\d/.test(numericPart)) return null;

  let normalizedNumber = numericPart;
  if (numericPart.includes(',') && numericPart.includes('.')) {
    if (numericPart.lastIndexOf(',') > numericPart.lastIndexOf('.')) {
      // Formato brasileiro: 1.234,56
      normalizedNumber = numericPart.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato inglês: 1,234.56
      normalizedNumber = numericPart.replace(/,/g, '');
    }
  } else if (numericPart.includes(',')) {
    normalizedNumber = numericPart.replace(',', '.');
  }

  const parsed = Number(normalizedNumber);
  if (Number.isNaN(parsed) || parsed <= 0) return null;

  const amountCents = Math.round(Math.abs(parsed) * 100);
  if (amountCents <= 0) return null;

  return {
    amountCents,
    hasNegativeSign,
    hasPositiveSign
  };
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result.map((col) => col.replace(/^["']|["']$/g, '').trim());
}

/**
 * Analisa qualquer arquivo CSV (do próprio LibertyBag ou extratos do Nubank, Inter, Itaú, Bradesco, Santander, etc.)
 * e retorna os lançamentos prontos com valor, positivo/negativo e categoria automática.
 */
export function parseCSVTransactions(
  csvText: string,
  categories: CategoryRecord[]
): ParsedImportItem[] {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  const rawLines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  // Detecta o separador predominante (; ou , ou \t)
  const firstLine = rawLines[0];
  const delimiter =
    firstLine.split(';').length >= firstLine.split(',').length
      ? ';'
      : firstLine.includes('\t')
        ? '\t'
        : ',';

  const rows = rawLines.map((line) => splitCSVLine(line, delimiter));
  const headerCols = rows[0].map((c) => normalizeText(c));

  const isHeaderRow = headerCols.some((c) =>
    [
      'data',
      'date',
      'valor',
      'amount',
      'value',
      'descricao',
      'historico',
      'title',
      'lancamento',
      'categoria',
      'tipo'
    ].some((h) => c.includes(h))
  );

  const dataRows = isHeaderRow ? rows.slice(1) : rows;

  // Mapeia índices de colunas se houver cabeçalho
  const dateIdx = isHeaderRow
    ? headerCols.findIndex((c) => c.includes('data') || c.includes('date'))
    : -1;
  const typeIdx = isHeaderRow
    ? headerCols.findIndex(
        (c) => c === 'tipo' || c.includes('movimento') || c.includes('natureza')
      )
    : -1;
  const catIdx = isHeaderRow
    ? headerCols.findIndex((c) => c.includes('categoria') || c.includes('category'))
    : -1;
  const valIdx = isHeaderRow
    ? headerCols.findIndex(
        (c) => c.includes('valor') || c.includes('amount') || c.includes('value') || c.includes('quantia')
      )
    : -1;
  const descIdx = isHeaderRow
    ? headerCols.findIndex(
        (c) =>
          c.includes('observacao') ||
          c.includes('descricao') ||
          c.includes('historico') ||
          c.includes('title') ||
          c.includes('estabelecimento') ||
          c.includes('lancamento') ||
          c.includes('detalhe')
      )
    : -1;

  // Verifica se é um extrato bancário onde despesas vêm com sinal "-" e entradas vêm positivas sem sinal "+"
  const hasAnyNegativeRow = dataRows.some((cols) =>
    cols.some((cell) => /^[-]\s*(R\$\s*)?\d/.test(cell.trim()))
  );

  const parsedItems: ParsedImportItem[] = [];
  const todayISO = getTodayISO();

  for (const cols of dataRows) {
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    // 1. Data
    let dateISO: string | null = null;
    if (dateIdx >= 0 && cols[dateIdx]) {
      dateISO = parseFlexibleDateToISO(cols[dateIdx]);
    }
    if (!dateISO) {
      for (let i = 0; i < cols.length; i++) {
        if (i === valIdx) continue;
        const d = parseFlexibleDateToISO(cols[i]);
        if (d) {
          dateISO = d;
          break;
        }
      }
    }

    // 2. Valor e Sinal
    let moneyParsed: ReturnType<typeof parseSignedMoneyValue> = null;
    if (valIdx >= 0 && cols[valIdx]) {
      moneyParsed = parseSignedMoneyValue(cols[valIdx], { isExplicitColumn: true });
    }
    if (!moneyParsed) {
      for (let i = cols.length - 1; i >= 0; i--) {
        if (i === dateIdx || i === descIdx || i === catIdx || i === typeIdx) continue;
        const candidate = parseSignedMoneyValue(cols[i]);
        if (candidate) {
          moneyParsed = candidate;
          break;
        }
      }
    }
    if (!moneyParsed) continue;

    // Se a linha não tem data válida e o valor não veio de uma coluna explícita, ignora
    if (!dateISO) {
      if (valIdx >= 0) {
        dateISO = todayISO;
      } else {
        continue;
      }
    }

    // 3. Tipo explícito (se houver coluna Tipo)
    let explicitType: TransactionType | null = null;
    if (typeIdx >= 0 && cols[typeIdx]) {
      const normType = normalizeText(cols[typeIdx]);
      if (
        normType.includes('entrou') ||
        normType.includes('entrada') ||
        normType.includes('receita') ||
        normType === 'c' ||
        normType === 'credito'
      ) {
        explicitType = 'entrada';
      } else if (
        normType.includes('saiu') ||
        normType.includes('saida') ||
        normType.includes('despesa') ||
        normType.includes('gasto') ||
        normType === 'd' ||
        normType === 'debito'
      ) {
        explicitType = 'saida';
      }
    }

    // Se o extrato usa números negativos para saídas (ex.: -45,90) e positivos para entradas (ex.: 1500,00)
    const effectivePositiveSign =
      moneyParsed.hasPositiveSign ||
      (hasAnyNegativeRow && !moneyParsed.hasNegativeSign && !explicitType);

    // 4. Categoria e Descrição
    const rawCat = catIdx >= 0 && cols[catIdx] ? cols[catIdx] : '';
    let rawDesc = descIdx >= 0 && cols[descIdx] ? cols[descIdx] : '';
    if (!rawDesc) {
      rawDesc = cols
        .filter(
          (col, idx) =>
            idx !== dateIdx &&
            idx !== valIdx &&
            idx !== typeIdx &&
            idx !== catIdx &&
            !parseFlexibleDateToISO(col) &&
            !parseSignedMoneyValue(col)
        )
        .join(' - ');
    }

    // Ignora linhas de saldo, limites ou resumos de extrato bancário
    if (/\b(saldo|total geral|limite|disponivel|subtotal)\b/i.test(rawDesc)) {
      continue;
    }

    const inferred = inferCategoryAndTypeAutomatically({
      rawDescription: rawDesc,
      rawCategoryName: rawCat,
      explicitType,
      hasNegativeSign: moneyParsed.hasNegativeSign,
      hasPositiveSign: effectivePositiveSign,
      amountCents: moneyParsed.amountCents,
      categories
    });

    parsedItems.push({
      date: dateISO,
      amountCents: moneyParsed.amountCents,
      type: inferred.type,
      categoryId: inferred.categoryId,
      categoryName: inferred.categoryName,
      description: rawDesc || inferred.categoryName,
      paymentMethod: inferred.paymentMethod
    });
  }

  return parsedItems;
}

/**
 * Descomprime streams FlateDecode de um arquivo PDF usando DecompressionStream nativo do navegador
 * e extrai todos os blocos de texto legíveis.
 */
export async function extractTextFromPDFBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const latin1 = new TextDecoder('latin1').decode(bytes);

  // Se o arquivo for um HTML ou texto salvo com extensão .pdf, extrai direto
  if (!latin1.startsWith('%PDF-')) {
    return new TextDecoder('utf-8', { fatal: false })
      .decode(bytes)
      .replace(/<[^>]+>/g, ' ');
  }

  const extractedChunks: string[] = [];

  // Percorre os streams do PDF (incluindo FlateDecode comprimidos)
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(latin1)) !== null) {
    const rawStreamContent = match[1];
    let decodedStream = rawStreamContent;

    // Tenta descomprimir caso seja um stream comprimido (zlib / deflate)
    if (typeof DecompressionStream !== 'undefined') {
      const streamBytes = new Uint8Array(rawStreamContent.length);
      for (let i = 0; i < rawStreamContent.length; i++) {
        streamBytes[i] = rawStreamContent.charCodeAt(i) & 0xff;
      }

      for (const format of ['deflate', 'deflate-raw'] as const) {
        try {
          const ds = new DecompressionStream(format);
          const writer = ds.writable.getWriter();
          void writer.write(streamBytes);
          void writer.close();
          const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
          const text = new TextDecoder('utf-8', { fatal: false }).decode(decompressedBuffer);
          if (text && (text.includes('Tj') || text.includes('TJ') || /\d/.test(text))) {
            decodedStream = text;
            break;
          }
        } catch {
          // tenta próximo formato ou mantém texto bruto
        }
      }
    }

    // Extrai strings entre parênteses de operadores PDF: (texto) Tj ou [(texto)] TJ
    const literalStrings: string[] = [];
    const parenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = parenRegex.exec(decodedStream)) !== null) {
      const str = pMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (str.trim()) {
        literalStrings.push(str);
      }
    }

    if (literalStrings.length > 0) {
      extractedChunks.push(literalStrings.join(' '));
    }
  }

  return extractedChunks.join('\n');
}

/**
 * Analisa o texto extraído de um PDF de extrato/fatura/relatório e identifica automaticamente
 * cada lançamento com data, valor, se é entrada (positivo) ou saída (negativo) e categoria.
 */
export function parsePDFTransactions(
  pdfText: string,
  categories: CategoryRecord[]
): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];
  const todayISO = getTodayISO();

  // Procura padrões de linha de extrato: Data (DD/MM/YYYY ou DD/MM) + Texto + Valor em Reais (ex.: -R$ 45,90 ou 1.250,00)
  const lineRegex =
    /(\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b)\s+([^\n\r]{2,90}?)\s+([+-]?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}\b|[+-]?\s*(?:R\$\s*)?\d+\.\d{2}\b)(?:\s*([DCdc]))?/g;

  const matches: {
    dateISO: string;
    middleText: string;
    rawAmount: string;
  }[] = [];

  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(pdfText)) !== null) {
    const dateISO = parseFlexibleDateToISO(m[1]) || todayISO;
    const middleText = m[2].replace(/\s+/g, ' ').trim();
    const rawAmount = `${m[3]} ${m[4] || ''}`.trim();
    matches.push({ dateISO, middleText, rawAmount });
  }

  const hasAnyNegativeInPDF = matches.some((item) => item.rawAmount.includes('-'));

  for (const row of matches) {
    const money = parseSignedMoneyValue(row.rawAmount);
    if (!money) continue;

    const normMid = normalizeText(row.middleText);
    let explicitType: TransactionType | null = null;
    if (/\b(entrou|entrada|receita|pix recebido|salario)\b/.test(normMid)) {
      explicitType = 'entrada';
    } else if (/\b(saiu|saida|despesa|pagamento|compra)\b/.test(normMid)) {
      explicitType = 'saida';
    }

    const cleanedDescription = row.middleText
      .replace(/\b(Entrou|Saiu|Dinheiro que entrou|Dinheiro que saiu)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Ignora linhas de saldo, limites ou resumos de extrato bancário
    if (/\b(saldo|total geral|limite|disponivel|subtotal)\b/i.test(cleanedDescription)) {
      continue;
    }

    const inferred = inferCategoryAndTypeAutomatically({
      rawDescription: cleanedDescription,
      explicitType,
      hasNegativeSign: money.hasNegativeSign,
      hasPositiveSign:
        money.hasPositiveSign || (hasAnyNegativeInPDF && !money.hasNegativeSign && !explicitType),
      amountCents: money.amountCents,
      categories
    });

    items.push({
      date: row.dateISO,
      amountCents: money.amountCents,
      type: inferred.type,
      categoryId: inferred.categoryId,
      categoryName: inferred.categoryName,
      description: cleanedDescription || inferred.categoryName,
      paymentMethod: inferred.paymentMethod
    });
  }

  return items;
}

/**
 * Salva os lançamentos importados no banco (Dexie + Supabase) e retorna função `undo()` para desfazer com 1 toque.
 */
export async function saveImportedTransactionsWithUndo(
  items: ParsedImportItem[],
  options?: { spaceId?: string; userId?: string }
): Promise<{
  importedCount: number;
  createdIds: string[];
  undo: () => Promise<void>;
}> {
  const spaceId = options?.spaceId || DEFAULT_SPACE_ID;
  const userId = options?.userId || DEFAULT_USER_ID;
  const now = new Date().toISOString();

  const records: TransactionRecord[] = items.map((item, idx) => ({
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    spaceId,
    amountCents: item.amountCents,
    type: item.type,
    categoryId: item.categoryId,
    date: item.date,
    description: item.description,
    paymentMethod: item.paymentMethod,
    recurrenceId: null,
    installment: null,
    origin: 'importado',
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }));

  if (records.length > 0) {
    await db.transactions.bulkPut(records);
    void syncAllWithSupabase();
  }

  const createdIds = records.map((r) => r.id);

  return {
    importedCount: records.length,
    createdIds,
    undo: async () => {
      if (createdIds.length > 0) {
        await db.transactions.bulkDelete(createdIds);
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase.from('transactions').delete().in('id', createdIds);
          } catch {
            // Silencioso se estiver offline
          }
        }
      }
    }
  };
}

/**
 * Lê um arquivo `.csv` ou `.pdf` selecionado pelo usuário, identifica automaticamente
 * os valores, se são positivos (entrada) ou negativos (saída), as categorias e datas,
 * e salva tudo no espaço ativo.
 */
export async function importTransactionsFromFileWithUndo(
  file: File,
  options?: { spaceId?: string; userId?: string }
): Promise<{
  importedCount: number;
  items: ParsedImportItem[];
  undo: () => Promise<void>;
}> {
  const spaceId = options?.spaceId || DEFAULT_SPACE_ID;
  const categories = await db.categories
    .where('spaceId')
    .equals(spaceId)
    .and((c) => !c.deletedAt)
    .toArray();

  const fileName = file.name.toLowerCase();
  let parsedItems: ParsedImportItem[] = [];

  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    const buffer = await file.arrayBuffer();
    const text = await extractTextFromPDFBuffer(buffer);
    parsedItems = parsePDFTransactions(text, categories);
  } else {
    const text = await file.text();
    parsedItems = parseCSVTransactions(text, categories);
    if (parsedItems.length === 0) {
      parsedItems = parsePDFTransactions(text, categories);
    }
  }

  const saved = await saveImportedTransactionsWithUndo(parsedItems, options);
  return {
    importedCount: saved.importedCount,
    items: parsedItems,
    undo: saved.undo
  };
}
