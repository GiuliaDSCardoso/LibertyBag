import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ensureInitialDataSeeded } from '../db/seed';
import { syncAllWithSupabase } from '../features/sync/syncService';
import { useAppStore } from './store/useAppStore';
import { NavigationBars } from '../components/ui/NavigationBars';
import { UndoToast } from '../components/ui/UndoToast';
import { OnboardingModal } from '../features/onboarding/OnboardingModal';
import { AddTransactionModal } from '../features/transactions/AddTransactionModal';
import { HomePage } from '../features/home/HomePage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { PlanningPage } from '../features/planning/PlanningPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { LobbyAuthPage } from '../features/auth/LobbyAuthPage';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/lancamentos" element={<TransactionsPage />} />
          <Route path="/planejar" element={<PlanningPage />} />
          <Route path="/analises" element={<AnalyticsPage />} />
          <Route path="/mais" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export const App: React.FC = () => {
  const { theme, fontSize, isAuthenticated } = useAppStore();
  const [isReady, setIsReady] = useState(false);

  // Semeia categorias padrão, usuário local e espaço pessoal no IndexedDB
  useEffect(() => {
    ensureInitialDataSeeded()
      .catch(() => {
        // Silencioso: nunca mostrar erro técnico
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  // Só sincroniza com o Supabase DEPOIS que o usuário estiver autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    void syncAllWithSupabase();

    const handleOnline = () => {
      void syncAllWithSupabase();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isAuthenticated]);

  // Aplica Tema (Praia = claro, Noite = escuro, ou Sistema)
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark =
        theme === 'noite' || (theme === 'sistema' && mediaQuery.matches);
      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  // Aplica escala de tamanho da letra (normal, large, xlarge)
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  // Skeleton simples enquanto carrega o banco local, nunca tela piscando
  if (!isReady) {
    return (
      <div className="min-h-screen bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream p-6">
        <div className="max-w-[1240px] mx-auto space-y-6 animate-pulse">
          <div className="h-10 w-48 rounded-2xl bg-blue-sky/50 dark:bg-white/10" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-40 rounded-card bg-white/80 dark:bg-white/10" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-32 rounded-card bg-white/80 dark:bg-white/10" />
                <div className="h-32 rounded-card bg-white/80 dark:bg-white/10" />
              </div>
            </div>
            <div className="lg:col-span-5 h-72 rounded-card bg-white/80 dark:bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LobbyAuthPage />
        <UndoToast />
      </>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream transition-colors">
        <NavigationBars />

        {/* Container principal: largura máxima 1240px centralizado e padding lateral fluido (clamp) */}
        <main className="md:pl-[272px] pb-28 md:pb-12">
          <div className="max-w-[1240px] mx-auto px-[clamp(16px,3.5vw,48px)] pt-4 md:pt-6">
            <AnimatedRoutes />
          </div>
        </main>

        {/* Modal de Adicionar em 3 Toques */}
        <AddTransactionModal />

        {/* Onboarding de 3 telas */}
        <OnboardingModal />

        {/* Aviso flutuante "Feito! Desfazer" */}
        <UndoToast />
      </div>
    </BrowserRouter>
  );
};

export default App;
