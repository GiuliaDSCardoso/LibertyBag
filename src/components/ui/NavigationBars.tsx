import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, useReducedMotion } from 'motion/react';
import { Home, ListOrdered, Compass, PieChart, Menu, Plus, Users, LogOut, Sun, Moon } from 'lucide-react';
import { db } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import { getSupabaseClient } from '../../lib/supabase';
import { MatisseFlower } from '../illustrations/BeachIllustrations';
import { CustomSelect } from './CustomSelect';

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/lancamentos', label: 'Lançamentos', icon: ListOrdered },
  { to: '/planejar', label: 'Planejar', icon: Compass },
  { to: '/analises', label: 'Análises', icon: PieChart },
  { to: '/mais', label: 'Mais', icon: Menu }
];

/**
 * Navegação Responsiva:
 * - Em telas >= 768px: Menu lateral com largura confortável (272px), itens com mais respiro vertical
 *   e botão "Novo lançamento" com white-space: nowrap, gap de 12px, padding horizontal >= 16px e min-h-[52px].
 * - Em telas < 768px: Barra inferior com 5 itens (sem truncar "Lançamentos") e botão central "+" animado.
 */
export const NavigationBars: React.FC = () => {
  const {
    openAddModal,
    isAddModalOpen,
    activeSpaceId,
    setActiveSpaceId,
    logoutUser,
    userName,
    theme,
    setTheme,
    showUndoToast
  } = useAppStore();
  const shouldReduceMotion = useReducedMotion();

  const isDark =
    theme === 'noite' ||
    (theme === 'sistema' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleToggleTheme = () => {
    setTheme(isDark ? 'praia' : 'noite');
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    logoutUser();
  };

  const spaces = useLiveQuery(
    async () => db.spaces.filter((s) => !s.deletedAt).toArray(),
    [],
    []
  );

  return (
    <>
      {/* Botão Flutuante de Tema em Telas Menores (< 768px) no topo direito da tela */}
      <div className="md:hidden fixed top-3 right-3 z-40">
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          className="h-9 px-3 rounded-full bg-white/95 dark:bg-[#152144]/95 backdrop-blur-md border-2 border-blue-royal/40 dark:border-white/25 text-blue-deep dark:text-cream shadow-card flex items-center gap-1.5 text-xs font-extrabold transition-all active:scale-95 hover-lift"
        >
          {isDark ? (
            <>
              <Sun size={16} className="text-sun animate-spin-slow" />
              <span className="text-sun">Claro</span>
            </>
          ) : (
            <>
              <Moon size={16} className="text-blue-royal" />
              <span className="text-blue-deep">Escuro</span>
            </>
          )}
        </button>
      </div>

      {/* Barra Lateral Desktop/Tablet (largura confortável 272px = 17rem) */}
      <aside
        aria-label="Menu principal lateral"
        className="hidden md:flex md:flex-col md:w-[272px] md:fixed md:inset-y-0 bg-white dark:bg-[#0D152D] border-r border-blue-sky/60 dark:border-white/10 p-6 z-30 justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-8 px-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-royal flex items-center justify-center shrink-0 shadow-xs">
              <MatisseFlower size={36} />
            </div>
            <div className="min-w-0">
              <span className="font-serif italic text-2xl font-bold text-blue-royal dark:text-sun block leading-none">
                LibertyBag
              </span>
              <span className="text-sm text-blue-deep/80 dark:text-cream/80 block mt-1">
                Finanças simples
              </span>
            </div>
          </div>

          {/* Botão principal do menu lateral: rótulo curto, nowrap, gap 12px, px >= 16px, min-h 52px */}
          <button
            type="button"
            data-tutorial="add-button"
            onClick={openAddModal}
            className="w-full min-h-[54px] px-5 mb-8 rounded-pill bg-blue-royal hover:bg-blue-deep active:scale-[0.98] text-white font-bold text-base shadow-soft inline-flex items-center justify-center gap-3 whitespace-nowrap transition-all hover-lift"
          >
            <motion.span
              animate={
                !shouldReduceMotion && isAddModalOpen
                  ? { rotate: 90, scale: 1.1 }
                  : { rotate: 0, scale: 1 }
              }
              transition={{ duration: 0.2 }}
              className="inline-flex items-center justify-center shrink-0"
            >
              <Plus size={22} strokeWidth={2.75} aria-hidden="true" />
            </motion.span>
            <span>Novo lançamento</span>
          </button>

          <nav className="space-y-2.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `min-h-[52px] px-4 py-3 rounded-2xl flex items-center gap-3.5 font-bold text-base whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-royal text-white shadow-sm'
                      : 'text-blue-deep dark:text-cream hover:bg-blue-sky/40 dark:hover:bg-blue-royal/30'
                  }`
                }
              >
                <Icon size={22} aria-hidden="true" className="shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-3">
          {/* Botão de Trocar Tema Retrô (Modo Claro / Modo Escuro) */}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            className="w-full min-h-[46px] px-3.5 rounded-2xl bg-cream dark:bg-[#152144] hover:bg-blue-sky/40 dark:hover:bg-[#1B2A54] border border-blue-sky/70 dark:border-white/15 text-blue-deep dark:text-cream font-bold text-xs flex items-center justify-between transition-all shadow-xs"
          >
            <div className="flex items-center gap-2">
              {isDark ? (
                <Sun size={18} className="text-sun animate-spin-slow" />
              ) : (
                <Moon size={18} className="text-blue-royal" />
              )}
              <span>{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-pill bg-white dark:bg-[#0D152D] border border-blue-sky/60 dark:border-white/20 text-blue-deep dark:text-sun font-extrabold uppercase tracking-wider">
              {isDark ? 'Noite' : 'Praia'}
            </span>
          </button>

          {spaces.length > 1 && (
            <div className="p-3 rounded-2xl bg-cream dark:bg-[#152144] border border-blue-sky/60 dark:border-white/10">
              <label
                htmlFor="sidebar-space-select"
                className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-blue-royal dark:text-sun mb-1.5"
              >
                <Users size={14} />
                <span>Espaço ativo</span>
              </label>
              <CustomSelect
                id="sidebar-space-select"
                value={activeSpaceId}
                onChange={(newId) => {
                  setActiveSpaceId(newId);
                  const found = spaces.find((s) => s.id === newId);
                  if (found) {
                    showUndoToast(`Mudou para o espaço "${found.name}"`, async () => {});
                  }
                }}
                size="sm"
                options={spaces.map((s) => ({
                  value: s.id,
                  label: s.name,
                  badge: (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-sky/40 dark:bg-white/10 text-blue-deep dark:text-cream">
                      {s.type === 'compartilhado' ? 'Compartilhado' : 'Pessoal'}
                    </span>
                  )
                }))}
              />
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-cream dark:bg-[#152144] text-sm text-blue-deep/90 dark:text-cream/90 border border-blue-sky/60 dark:border-white/10 space-y-2.5">
            <div>
              <p className="font-bold text-blue-royal dark:text-sun text-xs">
                {userName ? `Conectado: ${userName}` : '100% salvo no aparelho'}
              </p>
              <p className="text-xs leading-snug mt-0.5">
                Funciona mesmo sem internet.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full min-h-[42px] px-3 rounded-xl bg-white dark:bg-[#0D152D] hover:bg-red-soft/15 text-red-soft border border-red-soft/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={16} />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Barra Inferior Mobile (< 768px) */}
      <nav
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0D152D]/95 backdrop-blur-md border-t border-blue-sky/70 dark:border-white/10 pb-safe"
      >
        <div className="max-w-lg mx-auto px-1 py-1.5 flex items-center justify-between">
          {/* 2 primeiros itens: Início, Lançamentos */}
          {NAV_ITEMS.slice(0, 2).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `min-h-[52px] flex-1 rounded-2xl flex flex-col items-center justify-center px-1 py-1 transition-colors ${
                  isActive
                    ? 'text-blue-royal dark:text-sun font-bold bg-blue-sky/35 dark:bg-blue-royal/40'
                    : 'text-blue-deep/85 dark:text-cream/85 font-semibold'
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              <span className="text-[12px] leading-tight mt-1 whitespace-nowrap">{label}</span>
            </NavLink>
          ))}

          {/* Botão Central Grande "+" para Adicionar */}
          <div data-tutorial="add-button" className="flex flex-col items-center justify-center px-1.5 -mt-5 shrink-0">
            <motion.button
              type="button"
              onClick={openAddModal}
              aria-label="Adicionar lançamento"
              whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
              animate={
                !shouldReduceMotion && isAddModalOpen
                  ? { rotate: 90 }
                  : { rotate: 0 }
              }
              transition={{ duration: 0.2 }}
              className="w-14 h-14 rounded-full bg-blue-royal hover:bg-blue-deep text-white shadow-soft border-4 border-cream dark:border-blue-deep flex items-center justify-center"
            >
              <Plus size={28} strokeWidth={2.75} aria-hidden="true" />
            </motion.button>
            <span className="text-[12px] font-bold text-blue-royal dark:text-sun mt-0.5 whitespace-nowrap">
              Adicionar
            </span>
          </div>

          {/* 3 últimos itens: Planejar, Análises, Mais */}
          {NAV_ITEMS.slice(2).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `min-h-[52px] flex-1 rounded-2xl flex flex-col items-center justify-center px-1 py-1 transition-colors ${
                  isActive
                    ? 'text-blue-royal dark:text-sun font-bold bg-blue-sky/35 dark:bg-blue-royal/40'
                    : 'text-blue-deep/85 dark:text-cream/85 font-semibold'
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              <span className="text-[12px] leading-tight mt-1 whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};
