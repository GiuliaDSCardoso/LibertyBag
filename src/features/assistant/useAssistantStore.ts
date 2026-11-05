import { create } from 'zustand';
import type { MascotState } from '../../components/mascot/LibertySunMascot';

interface AssistantStore {
  isOpen: boolean;
  isTutorialActive: boolean;
  currentStepIndex: number;
  mascotState: MascotState;
  hasSeenGreeting: boolean;
  tutorialCompleted: boolean;
  isMascotVisible: boolean;
  isCelebrating: boolean;

  openAssistant: (initialState?: MascotState) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  dismissGreeting: () => void;
  startTutorial: (stepIndex?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipTutorial: () => void;
  finishTutorial: () => void;
  setMascotState: (state: MascotState) => void;
  setMascotVisible: (visible: boolean) => void;
}

const GREETING_KEY = 'libertybag_assistant_greeting_seen_v1';
const TUTORIAL_COMPLETED_KEY = 'libertybag_assistant_tutorial_completed_v1';
const VISIBLE_KEY = 'libertybag_assistant_visible_v1';

export const useAssistantStore = create<AssistantStore>((set, get) => ({
  isOpen: false,
  isTutorialActive: false,
  currentStepIndex: 0,
  mascotState: 'idle',
  hasSeenGreeting:
    typeof window !== 'undefined'
      ? localStorage.getItem(GREETING_KEY) === '1'
      : true,
  tutorialCompleted:
    typeof window !== 'undefined'
      ? localStorage.getItem(TUTORIAL_COMPLETED_KEY) === '1'
      : false,
  isMascotVisible:
    typeof window !== 'undefined'
      ? localStorage.getItem(VISIBLE_KEY) !== '0'
      : true,
  isCelebrating: false,

  openAssistant: (initialState = 'talking') => {
    set({ isOpen: true, mascotState: initialState });
  },

  closeAssistant: () => {
    set({ isOpen: false, mascotState: 'idle' });
  },

  toggleAssistant: () => {
    const { isOpen } = get();
    if (isOpen) {
      set({ isOpen: false, mascotState: 'idle' });
    } else {
      set({ isOpen: true, mascotState: 'talking' });
    }
  },

  dismissGreeting: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GREETING_KEY, '1');
    }
    set({ hasSeenGreeting: true, isOpen: false, mascotState: 'idle' });
  },

  startTutorial: (stepIndex = 0) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GREETING_KEY, '1');
    }
    set({
      hasSeenGreeting: true,
      isOpen: false,
      isTutorialActive: true,
      currentStepIndex: stepIndex,
      isCelebrating: false,
      mascotState: 'greeting'
    });
  },

  nextStep: () => {
    const { currentStepIndex } = get();
    set({ currentStepIndex: currentStepIndex + 1 });
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  goToStep: (index: number) => {
    set({ currentStepIndex: index });
  },

  skipTutorial: () => {
    set({
      isTutorialActive: false,
      currentStepIndex: 0,
      isCelebrating: false,
      mascotState: 'idle'
    });
  },

  finishTutorial: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, '1');
      localStorage.setItem(GREETING_KEY, '1');
    }
    set({
      tutorialCompleted: true,
      hasSeenGreeting: true,
      isCelebrating: true,
      mascotState: 'celebrating'
    });
  },

  setMascotState: (state: MascotState) => {
    set({ mascotState: state });
  },

  setMascotVisible: (visible: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VISIBLE_KEY, visible ? '1' : '0');
    }
    set({ isMascotVisible: visible });
  }
}));
