import type { MascotState } from '../../components/mascot/LibertySunMascot';

export interface TutorialStepConfig {
  id: string;
  stepNumber: number;
  title: string;
  route: string;
  targetSelector?: string;
  explanation: string;
  practicalTip: string;
  mascotState: MascotState;
  balloonTitle: string;
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: 'overview',
    stepNumber: 1,
    title: 'Visão Geral & Saldo',
    route: '/',
    targetSelector: '[data-tutorial="dashboard-summary"]',
    balloonTitle: 'Resumo do Mês',
    explanation:
      'Acompanhe o saldo calmo do mês: quanto entrou, quanto saiu e quanto sobrou até agora.',
    practicalTip:
      'Olhar o saldo por 30 segundos ao dia dá clareza total sobre seu bolso.',
    mascotState: 'greeting'
  },
  {
    id: 'add',
    stepNumber: 2,
    title: 'Lançamento em 3 Toques',
    route: '/',
    targetSelector: '[data-tutorial="add-button"]',
    balloonTitle: 'Anotar em Segundos',
    explanation:
      'Toque no "+" azul para registrar: digite o valor, indique se entrou ou saiu e escolha a categoria.',
    practicalTip:
      'Aceita compras à vista, cartão parcelado e até Pix com entrada ou juros.',
    mascotState: 'talking'
  },
  {
    id: 'transactions',
    stepNumber: 3,
    title: 'Lançamentos & Planilha',
    route: '/lancamentos',
    targetSelector: '[data-tutorial="transactions-view"]',
    balloonTitle: 'Histórico & Excel',
    explanation:
      'Veja seus gastos dia a dia. Alterne para a Tabela Excel para editar valores e datas direto na tela.',
    practicalTip:
      'Use a seleção em massa para remover ou ajustar vários lançamentos de uma vez.',
    mascotState: 'thinking'
  },
  {
    id: 'planning',
    stepNumber: 4,
    title: 'Metas & Cofrinhos',
    route: '/planejar?tab=cofrinhos',
    targetSelector: '[data-tutorial="planning-view"]',
    balloonTitle: 'Planejar o Futuro',
    explanation:
      'Defina limites de gastos por categoria e crie Cofrinhos para viagens e reserva de emergência.',
    practicalTip:
      'Ao receber, separe primeiro a parte do cofrinho antes de começar a gastar.',
    mascotState: 'talking'
  },
  {
    id: 'simulation',
    stepNumber: 5,
    title: 'Simulador de Parcelas',
    route: '/planejar?tab=simulador',
    targetSelector: '[data-tutorial="installment-simulator"]',
    balloonTitle: 'Pix x Cartão Sem Juros Abusivos',
    explanation:
      'Descubra o valor real de cada parcela no Nubank, Inter, Itaú, PicPay e outros bancos antes de fechar qualquer compra!',
    practicalTip:
      'Cadastre seus limites para o LibertyBag avisar na hora se uma simulação ultrapassar seu limite disponível.',
    mascotState: 'thinking'
  },
  {
    id: 'investments',
    stepNumber: 6,
    title: 'Simular Investimentos',
    route: '/planejar?tab=investimentos',
    targetSelector: '[data-tutorial="investments-view"]',
    balloonTitle: 'Juros Compostos ao seu Favor',
    explanation:
      'Projete seu dinheiro crescendo no Tesouro Direto, CDBs e LCIs. Use o Modo Meta para calcular quanto guardar por mês ou em quanto tempo alcança seu sonho.',
    practicalTip:
      'Reinvestir os rendimentos todo mês ativa o efeito bola de neve, fazendo seu patrimônio se multiplicar sozinho.',
    mascotState: 'celebrating'
  },
  {
    id: 'analytics',
    stepNumber: 7,
    title: 'Análises Visuais',
    route: '/analises',
    targetSelector: '[data-tutorial="analytics-view"]',
    balloonTitle: 'Para Onde Vai o Dinheiro',
    explanation:
      'Gráficos de pizza mostram quais categorias consomem mais do seu orçamento mensal.',
    practicalTip:
      'Pequenos gastos diários repetidos costumam ser os maiores vilões no fim do mês.',
    mascotState: 'thinking'
  },
  {
    id: 'more',
    stepNumber: 8,
    title: 'Backup & App PWA',
    route: '/mais',
    targetSelector: '[data-tutorial="settings-view"]',
    balloonTitle: 'Dados Seguros & Offline',
    explanation:
      'Importe extratos PDF/CSV com categorias automáticas e instale o app no celular para usar offline.',
    practicalTip:
      'No celular, instale pela barra ou no navegador para abrir direto da tela inicial.',
    mascotState: 'celebrating'
  }
];

export const TUTORIAL_STEP_SIMULATION_INDEX = 4;
export const TUTORIAL_STEP_INVESTMENTS_INDEX = 5;
