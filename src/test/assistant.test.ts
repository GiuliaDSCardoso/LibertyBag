import { describe, it, expect, beforeEach } from 'vitest';
import {
  TUTORIAL_STEPS,
  TUTORIAL_STEP_SIMULATION_INDEX,
  TUTORIAL_STEP_INVESTMENTS_INDEX
} from '../features/assistant/tutorialSteps';
import { getContextualHelp } from '../features/assistant/contextualHelp';
import { useAssistantStore } from '../features/assistant/useAssistantStore';

describe('Mascot Assistant & Guided Tour Enhancements', () => {
  beforeEach(() => {
    useAssistantStore.setState({
      isOpen: false,
      isTutorialActive: false,
      currentStepIndex: 0,
      mascotState: 'idle',
      isCelebrating: false
    });
  });

  it('contains 8 complete steps in TUTORIAL_STEPS covering new simulation and investment features', () => {
    expect(TUTORIAL_STEPS.length).toBe(8);

    const simulationStep = TUTORIAL_STEPS[TUTORIAL_STEP_SIMULATION_INDEX];
    expect(simulationStep.id).toBe('simulation');
    expect(simulationStep.route).toContain('tab=simulador');
    expect(simulationStep.title).toBe('Simulador de Parcelas');
    expect(simulationStep.explanation.toLowerCase()).toContain('parcela');

    const investmentStep = TUTORIAL_STEPS[TUTORIAL_STEP_INVESTMENTS_INDEX];
    expect(investmentStep.id).toBe('investments');
    expect(investmentStep.route).toContain('tab=investimentos');
    expect(investmentStep.title).toBe('Simular Investimentos');
    expect(investmentStep.explanation.toLowerCase()).toContain('tesouro');
  });

  it('guarantees unique and sequential step numbers from 1 to 8', () => {
    TUTORIAL_STEPS.forEach((step, index) => {
      expect(step.stepNumber).toBe(index + 1);
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.explanation.trim().length).toBeGreaterThan(15);
      expect(step.practicalTip.trim().length).toBeGreaterThan(10);
    });
  });

  it('provides dedicated contextual help for Installment Simulation', () => {
    const helpSimQuery = getContextualHelp('/planejar', '?tab=simulador');
    expect(helpSimQuery.badge).toBe('Simulação Inteligente');
    expect(helpSimQuery.summary.toLowerCase()).toContain('pix');
    expect(helpSimQuery.conceptText).toContain('Tabela Price');

    const helpSimRoute = getContextualHelp('/simulador');
    expect(helpSimRoute.badge).toBe('Simulação Inteligente');
  });

  it('provides dedicated contextual help for Investments Simulation & Goal Mode', () => {
    const helpInvQuery = getContextualHelp('/planejar', '?tab=investimentos');
    expect(helpInvQuery.badge).toBe('Inteligência Financeira');
    expect(helpInvQuery.summary.toLowerCase()).toContain('juros compostos');
    expect(helpInvQuery.conceptTitle).toContain('Bola de Neve');

    const helpInvRoute = getContextualHelp('/investimentos');
    expect(helpInvRoute.badge).toBe('Inteligência Financeira');
  });

  it('allows starting tutorial directly at the Simulation step', () => {
    const store = useAssistantStore.getState();
    store.startTutorial(TUTORIAL_STEP_SIMULATION_INDEX);

    const updated = useAssistantStore.getState();
    expect(updated.isTutorialActive).toBe(true);
    expect(updated.currentStepIndex).toBe(TUTORIAL_STEP_SIMULATION_INDEX);
  });

  it('allows starting tutorial directly at the Investments step', () => {
    const store = useAssistantStore.getState();
    store.startTutorial(TUTORIAL_STEP_INVESTMENTS_INDEX);

    const updated = useAssistantStore.getState();
    expect(updated.isTutorialActive).toBe(true);
    expect(updated.currentStepIndex).toBe(TUTORIAL_STEP_INVESTMENTS_INDEX);
  });
});
