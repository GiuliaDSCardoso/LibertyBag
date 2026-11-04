export interface DailyTip {
  id: string;
  title: string;
  text: string;
}

export const DAILY_TIPS: DailyTip[] = [
  {
    id: 'tip-1',
    title: 'Anote na hora, sem esforço',
    text: 'Anotar os pequenos gastos do dia (como um café ou pão de queijo) ajuda a entender para onde o dinheiro vai no fim do mês.'
  },
  {
    id: 'tip-2',
    title: 'Olhe o que sobrou com carinho',
    text: 'Mesmo R$ 20 guardados no cofrinho já fazem diferença. O mais importante é criar o hábito aos poucos.'
  },
  {
    id: 'tip-3',
    title: 'Use a lista antes de ir ao mercado',
    text: 'Dar uma olhada rápida no que já tem em casa antes de sair evita comprar coisas repetidas.'
  },
  {
    id: 'tip-4',
    title: 'Errou algum valor? Tudo bem!',
    text: 'Aqui tudo pode ser desfeito ou editado com um toque. Você está sempre no controle.'
  },
  {
    id: 'tip-5',
    title: 'Funciona mesmo sem internet',
    text: 'Está na rua ou sem sinal? Pode anotar seus gastos normalmente que tudo fica salvo no seu celular.'
  }
];

export function getTipOfTheDay(date: Date = new Date()): DailyTip {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return DAILY_TIPS[Math.abs(dayOfYear) % DAILY_TIPS.length];
}
