import { create } from 'zustand';
import { DEFAULT_SPACE_ID, DEFAULT_USER_ID } from '../../db/seed';

export type ThemeMode = 'praia' | 'noite' | 'sistema';
export type FontSizeScale = 'normal' | 'large' | 'xlarge';

// Remove qualquer estado antigo salvo em localStorage no localhost
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('libertybag-preferences-v1');
  } catch {
    // ignora
  }
}

interface UndoAction {
  id: string;
  message: string;
  onUndo: () => Promise<void>;
}

interface AppState {
  // Preferências visuais
  theme: ThemeMode;
  fontSize: FontSizeScale;
  hasSeenOnboarding: boolean;
  userName: string;
  userEmail: string;
  isAuthenticated: boolean;

  // Contexto de espaço
  activeUserId: string;
  activeSpaceId: string;

  // Estado do modal Adicionar (fluxo de 3 toques acessível de qualquer tela)
  isAddModalOpen: boolean;

  // Toast de "Feito! Desfazer"
  undoAction: UndoAction | null;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: FontSizeScale) => void;
  completeOnboarding: (name?: string) => void;
  reopenOnboarding: () => void;
  setUserName: (name: string) => void;
  loginUser: (payload: { name?: string; email?: string; isFirstLogin?: boolean }) => void;
  logoutUser: () => void;
  setActiveSpaceId: (spaceId: string) => void;
  openAddModal: () => void;
  closeAddModal: () => void;
  showUndoToast: (message: string, onUndo: () => Promise<void>) => void;
  clearUndoToast: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  theme: 'praia',
  fontSize: 'normal',
  hasSeenOnboarding: true,
  userName: '',
  userEmail: '',
  isAuthenticated: false,
  activeUserId: DEFAULT_USER_ID,
  activeSpaceId: DEFAULT_SPACE_ID,
  isAddModalOpen: false,
  undoAction: null,

  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  completeOnboarding: (name) =>
    set((state) => ({
      hasSeenOnboarding: true,
      userName: name !== undefined ? name.trim() : state.userName
    })),
  reopenOnboarding: () => set({ hasSeenOnboarding: false }),
  setUserName: (userName) => set({ userName: userName.trim() }),
  loginUser: ({ name, email, isFirstLogin }) =>
    set((state) => ({
      isAuthenticated: true,
      hasSeenOnboarding: isFirstLogin ? false : true,
      userName: name ? name.trim() : state.userName,
      userEmail: email ? email.trim().toLowerCase() : state.userEmail
    })),
  logoutUser: () =>
    set({
      isAuthenticated: false,
      userName: '',
      userEmail: '',
      isAddModalOpen: false
    }),
  setActiveSpaceId: (activeSpaceId) => set({ activeSpaceId }),
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),
  showUndoToast: (message, onUndo) =>
    set({
      undoAction: {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        message,
        onUndo
      }
    }),
  clearUndoToast: () => set({ undoAction: null })
}));
