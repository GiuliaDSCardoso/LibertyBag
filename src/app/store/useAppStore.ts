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
  loginUser: (payload: {
    name?: string;
    email?: string;
    userId?: string;
    spaceId?: string;
    isFirstLogin?: boolean;
  }) => void;
  setActiveUserId: (userId: string) => void;
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
  loginUser: ({ name, email, userId, spaceId, isFirstLogin }) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    // Define IDs padrão seguros se não fornecidos
    const resolvedUserId =
      userId ||
      (cleanEmail.includes('giuli') || cleanEmail === 'local@libertybag.app'
        ? DEFAULT_USER_ID
        : `user-${cleanEmail.replace(/[^a-z0-9]/gi, '').slice(0, 10)}`);
    const resolvedSpaceId =
      spaceId ||
      (resolvedUserId === DEFAULT_USER_ID
        ? DEFAULT_SPACE_ID
        : `space-personal-${resolvedUserId}`);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('libertybag_logged_out_v1');
        sessionStorage.setItem(
          'libertybag_active_session_v1',
          JSON.stringify({
            name: name ? name.trim() : '',
            email: cleanEmail,
            userId: resolvedUserId,
            spaceId: resolvedSpaceId
          })
        );
      } catch {
        // ignora
      }
    }
    set((state) => ({
      isAuthenticated: true,
      hasSeenOnboarding: isFirstLogin ? false : true,
      userName: name ? name.trim() : state.userName,
      userEmail: cleanEmail || state.userEmail,
      activeUserId: resolvedUserId,
      activeSpaceId: resolvedSpaceId
    }));
  },
  setActiveUserId: (activeUserId) => set({ activeUserId }),
  logoutUser: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('libertybag_logged_out_v1', '1');
        sessionStorage.removeItem('libertybag_active_session_v1');
        // Limpa tokens do Supabase no localStorage para segurança financeira total
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth-token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // ignora
      }
    }
    set({
      isAuthenticated: false,
      userName: '',
      userEmail: '',
      activeUserId: DEFAULT_USER_ID,
      activeSpaceId: DEFAULT_SPACE_ID,
      isAddModalOpen: false
    });
  },
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
