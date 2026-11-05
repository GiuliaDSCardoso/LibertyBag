export interface ContextualHelpData {
  route: string;
  badge: string;
  title: string;
  summary: string;
  conceptTitle: string;
  conceptText: string;
  tipText: string;
}

export const CONTEXTUAL_HELP: Record<string, ContextualHelpData> = {
  '/': {
    route: '/',
    badge: 'Visão Geral',
    title: 'Dica do seu Início',
    summary:
      'Esta tela reúne o coração do seu mês: quanto entrou, quanto saiu e quanto sobrou até agora.',
    conceptTitle: 'Conceito: Sobrou do Mês',
    conceptText:
      'É a diferença entre suas receitas e despesas no período. Quando o número está azul ou positivo, significa que seu mês está equilibrado e você pode poupar!',
    tipText:
      'Tente anotar seus gastos no mesmo dia em que acontecerem. Leva 5 segundos e você nunca mais perde o controle!'
  },
  '/lancamentos': {
    route: '/lancamentos',
    badge: 'Histórico & Planilha',
    title: 'Dica de Lançamentos',
    summary:
      'Aqui estão todas as suas movimentações organizadas por data. Você tem o modo Cartões e o modo Tabela Excel.',
    conceptTitle: 'Conceito: Edição Rápida',
    conceptText:
      'Na Tabela Excel você clica em qualquer valor, data ou categoria para editar instantaneamente, como numa planilha do computador.',
    tipText:
      'Se você repetiu um lançamento por vários meses, mudar a data em um deles sincroniza automaticamente os outros meses!'
  },
  '/planejar': {
    route: '/planejar',
    badge: 'Metas & Cofrinhos',
    title: 'Dica de Planejamento',
    summary:
      'O melhor jeito de realizar planos é dar um destino ao seu dinheiro antes que ele vá embora sozinho.',
    conceptTitle: 'Conceito: Cofrinhos Virtuais',
    conceptText:
      'Separar seu dinheiro por objetivos (ex: Viagem, Reforma, Emergência) evita que você gaste por impulso a reserva guardada.',
    tipText:
      'A regra de ouro: pague a si mesmo primeiro! Ao receber seu salário ou renda, separe logo a fatia do seu cofrinho.'
  },
  '/analises': {
    route: '/analises',
    badge: 'Gráficos & Hábitos',
    title: 'Dica de Análises',
    summary:
      'O gráfico de pizza mostra a porcentagem de cada categoria no seu custo de vida mensal.',
    conceptTitle: 'Conceito: Gastos Invisíveis',
    conceptText:
      'Muitas vezes achamos que as contas grandes são o problema, mas a soma de pequenos cafés, entregas e corridas pode levar 30% da sua renda.',
    tipText:
      'Compare a fatia de Alimentação e Lazer com o mês passado para identificar onde você pode economizar sem sofrimento.'
  },
  '/mais': {
    route: '/mais',
    badge: 'Configurações & Backup',
    title: 'Dica de Configurações',
    summary:
      'Aqui você gerencia espaços compartilhados, importa dados de bancos e personaliza a aparência.',
    conceptTitle: 'Conceito: Importação Inteligente',
    conceptText:
      'Ao importar extratos em PDF ou CSV, o LibertyBag detecta o valor, se entrou ou saiu e atribui categorias automáticas.',
    tipText:
      'Você pode instalar o LibertyBag como aplicativo no seu celular clicando em "Instalar App" no topo ou pelo Safari/Chrome!'
  }
};

export function getContextualHelp(pathname: string): ContextualHelpData {
  if (CONTEXTUAL_HELP[pathname]) {
    return CONTEXTUAL_HELP[pathname];
  }
  // Fallback para qualquer sub-rota
  if (pathname.startsWith('/lancamentos')) return CONTEXTUAL_HELP['/lancamentos'];
  if (pathname.startsWith('/planejar')) return CONTEXTUAL_HELP['/planejar'];
  if (pathname.startsWith('/analises')) return CONTEXTUAL_HELP['/analises'];
  if (pathname.startsWith('/mais')) return CONTEXTUAL_HELP['/mais'];
  return CONTEXTUAL_HELP['/'];
}
