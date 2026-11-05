import type { MascotState } from '../../components/mascot/LibertySunMascot';

export interface TutorialStep {
  id: string;
  title: string;
  route: string; // Rota do React Router para onde o tutorial deve navegar
  targetSelector?: string; // Seletor CSS para spotlight/destaque
  explanation: string;
  practicalTip?: string;
  mascotState: MascotState;
  balloonTitle?: string;
}

export interface ContextualHelpItem {
  id: string;
  title: string;
  explanation: string;
  concept: string;
  tip: string;
}
