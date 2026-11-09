import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Palette,
  Tags,
  Trash2,
  Info,
  Sun,
  Moon,
  Monitor,
  Type,
  User,
  Check,
  Plus,
  Download,
  Upload,
  FileText,
  LogOut,
  Compass,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { useAssistantStore } from '../assistant/useAssistantStore';
import {
  useAppStore,
  type FontSizeScale,
  type ThemeMode
} from '../../app/store/useAppStore';
import { db } from '../../db/dexie';
import { DEFAULT_SPACE_ID, DEFAULT_USER_ID } from '../../db/seed';
import { getSupabaseClient } from '../../lib/supabase';
import { wipeAllDatabaseData } from '../spaces/spacesService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpButton } from '../../components/ui/HelpButton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CategoriesManager } from '../categories/CategoriesManager';
import { CategoryFormModal } from '../categories/CategoryFormModal';
import {
  downloadTransactionsCSV,
  printTransactionsReportPDF
} from './exportService';
import { importTransactionsFromFileWithUndo } from './importService';
import { SpacesAndSyncCard } from '../spaces/SpacesAndSyncCard';
import { PwaSettingsCard } from '../../components/pwa/PwaSettingsCard';
import { ResetAllMonthsModal } from '../transactions/ResetAllMonthsModal';

export const SettingsPage: React.FC = () => {
  const { startTutorial, isMascotVisible, setMascotVisible } = useAssistantStore();
  const {
    theme,
    fontSize,
    userName,
    userEmail,
    activeSpaceId,
    activeUserId,
    setActiveSpaceId,
    setTheme,
    setFontSize,
    setUserName,
    logoutUser,
    reopenOnboarding,
    showUndoToast
  } = useAppStore();

  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImportingFile(true);
    try {
      const res = await importTransactionsFromFileWithUndo(file, {
        spaceId: activeSpaceId,
        userId: activeUserId
      });

      if (res.importedCount > 0) {
        showUndoToast(
          `${res.importedCount} lançamento(s) importado(s) com categoria e tipo automáticos!`,
          res.undo
        );
      } else {
        showUndoToast(
          'Não encontramos lançamentos válidos nesse arquivo CSV ou PDF.',
          async () => {}
        );
      }
    } catch {
      showUndoToast('Não foi possível importar o arquivo selecionado.', async () => {});
    } finally {
      setIsImportingFile(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    logoutUser();
  };

  const [nameDraft, setNameDraft] = useState(userName);
  const [showCategories, setShowCategories] = useState(false);
  const [quickCreateCatOpen, setQuickCreateCatOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetMonthsModalOpen, setResetMonthsModalOpen] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameDraft.trim();
    setUserName(clean);
    await db.users.update(DEFAULT_USER_ID, {
      name: clean,
      updatedAt: new Date().toISOString()
    });
    showUndoToast('Seu nome foi salvo!', async () => {});
  };

  const handleWipeAllData = async () => {
    await wipeAllDatabaseData();
    setActiveSpaceId(DEFAULT_SPACE_ID);
    setConfirmResetOpen(false);
    showUndoToast('Todos os dados foram apagados do banco de dados.', async () => {});
  };

  return (
    <div className="space-y-8 pb-12" data-tutorial="settings-view">
      <header className="flex items-start justify-between gap-4 pt-2">
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="title-page text-blue-royal dark:text-sun">
            Mais opções
          </h1>
          <p className="text-sm sm:text-base text-blue-deep/85 dark:text-cream/85 mt-1 sm:mt-2">
            Deixe o aplicativo do jeito mais confortável para você.
          </p>
        </div>

        <HelpButton
          title="Ajustes e Ajuda"
          explanation="Nesta tela você pode aumentar o tamanho da letra, mudar entre o tema claro (Praia) e escuro (Noite), criar novas categorias ou rever a explicação inicial do aplicativo."
          example="Se a letra estiver pequena para ler sem óculos, escolha 'Grande' ou 'Bem grande' logo abaixo."
        />
      </header>

      {/* Grid de 2 colunas com respiro generoso e Soft UI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda (6 colunas): Tour com Mascote + Como usar + Aparência e Leitura + Nome */}
        <div className="lg:col-span-6 space-y-8">
          {/* Assistente & Tutorial Guiado */}
          <Card variant="framed" withFlowerWatermark staggerIndex={0}>
            <div className="space-y-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sun text-blue-deep flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="title-section text-blue-royal dark:text-sun">
                    Mascote & Tour Guiado
                  </h2>
                  <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-0.5">
                    Faça o passeio guiado de 6 etapas pelo sistema com o Solzinho ou ajuste sua visibilidade.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button variant="primary" size="md" onClick={() => startTutorial(0)}>
                  <Compass size={18} />
                  <span>Iniciar tour guiado</span>
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setMascotVisible(!isMascotVisible)}
                >
                  <span>{isMascotVisible ? 'Ocultar mascote' : 'Mostrar mascote'}</span>
                </Button>
              </div>
            </div>
          </Card>
          {/* 1. Como usar (Reabrir Onboarding) — título e texto com 100% de largura, botão abaixo sem espremer */}
          <Card variant="framed" withFlowerWatermark staggerIndex={0}>
            <div className="space-y-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sun text-blue-deep flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="title-section text-blue-royal dark:text-sun">
                    Como usar o LibertyBag
                  </h2>
                  <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-1 leading-relaxed">
                    Reveja a explicação passo a passo de 3 telinhas sempre que quiser.
                  </p>
                </div>
              </div>

              <div className="pt-2 sm:pt-3">
                <Button variant="primary" size="md" onClick={reopenOnboarding}>
                  Ver explicação
                </Button>
              </div>
            </div>
          </Card>

          {/* 1.1 Aplicativo no Celular / PWA */}
          <PwaSettingsCard />

          {/* 2. Aparência: Tamanho da Letra e Tema (Praia / Noite) com espaçamento otimizado */}
          <Card variant="white" staggerIndex={1} className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Palette size={22} className="text-blue-royal dark:text-sun shrink-0" />
              <h2 className="title-section">Aparência e Leitura</h2>
            </div>

            {/* Tamanho do texto */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-bold text-base">
                <Type size={18} className="text-blue-royal dark:text-sun shrink-0" />
                <span>Tamanho da letra</span>
              </label>
              <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85">
                Aumente se preferir letras maiores e mais fáceis de enxergar em todas as telas.
              </p>
              <div className="grid grid-cols-3 gap-2.5 pt-3">
                {(
                  [
                    { id: 'normal', label: 'Normal' },
                    { id: 'large', label: 'Grande' },
                    { id: 'xlarge', label: 'Bem grande' }
                  ] as { id: FontSizeScale; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFontSize(opt.id)}
                    aria-pressed={fontSize === opt.id}
                    className={`min-h-[46px] px-3 rounded-xl font-bold text-xs sm:text-sm border-2 whitespace-nowrap transition-all flex items-center justify-center ${
                      fontSize === opt.id
                        ? 'bg-blue-royal text-white border-blue-royal shadow-xs'
                        : 'bg-cream dark:bg-blue-deep border-blue-sky'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tema Claro (Praia) / Escuro (Noite) / Sistema */}
            <div className="pt-5 border-t border-blue-sky/60 dark:border-blue-sky/20 space-y-2.5">
              <span className="block font-bold text-base">Cores da tela (Tema)</span>
              <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85">
                O tema Praia usa fundo creme claro; o tema Noite usa azul escuro para descansar a vista.
              </p>
              <div className="grid grid-cols-3 gap-2.5 pt-3">
                {(
                  [
                    { id: 'praia', label: 'Praia', icon: Sun },
                    { id: 'noite', label: 'Noite', icon: Moon },
                    { id: 'sistema', label: 'Auto', icon: Monitor }
                  ] as { id: ThemeMode; label: string; icon: typeof Sun }[]
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    aria-pressed={theme === id}
                    className={`min-h-[52px] p-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                      theme === id
                        ? 'bg-blue-royal text-white border-blue-royal shadow-xs'
                        : 'bg-cream dark:bg-blue-deep border-blue-sky'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* 3. Como você quer ser chamado */}
          <Card variant="white" staggerIndex={2}>
            <form onSubmit={handleSaveName} className="space-y-3">
              <div className="flex items-center gap-2.5">
                <User size={22} className="text-blue-royal dark:text-sun shrink-0" />
                <label htmlFor="settings-user-name" className="title-section">
                  Seu nome na tela inicial
                </label>
              </div>
              <p className="text-sm text-blue-deep/85 dark:text-cream/85">
                É assim que damos bom dia para você na tela Início.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <input
                  id="settings-user-name"
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Ex.: Maria"
                  className="flex-1 min-w-[170px] min-h-[52px] px-4 rounded-2xl bg-cream dark:bg-blue-deep border-2 border-blue-sky font-bold"
                />
                <Button type="submit">
                  <Check size={18} />
                  <span>Salvar</span>
                </Button>
              </div>
            </form>

            {/* Botão de Logout claro e acessível */}
            <div className="pt-4 mt-4 border-t border-blue-sky/60 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-blue-deep/80 dark:text-cream/80">
                <span className="font-bold block">Sua sessão ativa</span>
                <span>{userEmail || 'Conta conectada neste aparelho'}</span>
              </div>
              <Button variant="danger" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Sair da conta</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Coluna Direita (6 colunas): Espaços/Nuvem + Categorias + Exportar + Apagar dados + Sobre */}
        <div className="lg:col-span-6 space-y-8">
          {/* 4. Espaços da Família e Sincronização com a Nuvem (Fase 3) */}
          <SpacesAndSyncCard />

          {/* 5. Categorias — com botão primário "Nova categoria" visível direto no card */}
          <Card variant="white" staggerIndex={3} className="space-y-3.5">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-sky/70 dark:bg-blue-royal/50 text-blue-royal dark:text-sun flex items-center justify-center shrink-0">
                  <Tags size={20} />
                </div>
                <div>
                  <h2 className="title-section">Categorias</h2>
                  <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85 mt-0.5">
                    Crie categorias novas ou mude nomes, desenhos e cores.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 sm:pt-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setQuickCreateCatOpen(true)}
                >
                  <Plus size={16} />
                  <span>Nova categoria</span>
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowCategories((v) => !v)}
                >
                  {showCategories ? 'Fechar lista' : 'Ver categorias'}
                </Button>
              </div>
            </div>

            {showCategories && (
              <div className="pt-3 border-t border-blue-sky/60">
                <CategoriesManager />
              </div>
            )}
          </Card>

          {/* 6. Importar e Exportar meus dados (CSV / PDF) */}
          <Card variant="white" staggerIndex={4} className="space-y-4">
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,.pdf,text/csv,application/pdf"
              onChange={handleImportFile}
              className="hidden"
              aria-label="Selecionar arquivo CSV ou PDF para importar"
            />

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-sky/70 dark:bg-blue-royal/50 text-blue-royal dark:text-sun flex items-center justify-center shrink-0">
                <Download size={20} />
              </div>
              <div>
                <h2 className="title-section">Importar ou Guardar dados (CSV e PDF)</h2>
                <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85 mt-1 leading-relaxed">
                  Importe extratos/planilhas em CSV ou PDF (com categoria automática) ou baixe uma cópia dos seus dados.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 sm:pt-5">
              <Button
                variant="primary"
                size="md"
                disabled={isImportingFile}
                title="Importar extrato CSV ou PDF"
                onClick={() => importFileInputRef.current?.click()}
              >
                <Upload size={18} />
                <span>{isImportingFile ? 'Lendo...' : 'Importar'}</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                title="Exportar dados em formato CSV"
                onClick={async () => {
                  await downloadTransactionsCSV(activeSpaceId);
                  showUndoToast('Planilha CSV baixada!', async () => {});
                }}
              >
                <Download size={18} />
                <span>Exportar</span>
              </Button>

              <Button
                variant="ghost"
                size="md"
                title="Visualizar e imprimir relatório PDF"
                onClick={async () => {
                  await printTransactionsReportPDF(activeSpaceId, userName);
                }}
              >
                <FileText size={18} />
                <span>Relatório</span>
              </Button>
            </div>
          </Card>

          {/* 6. Resetar Lançamentos de Todos os Meses */}
          <Card variant="white" staggerIndex={5} className="space-y-4 border-orange/40">
            <div className="flex items-center gap-2.5 text-orange">
              <RotateCcw size={22} className="shrink-0" />
              <h2 className="title-section text-blue-deep dark:text-cream">Resetar Todos os Meses</h2>
            </div>
            <p className="text-sm text-blue-deep/85 dark:text-cream/85 leading-relaxed">
              Limpe todas as entradas e saídas de todos os meses de uma vez só (mantendo seu usuário, espaços e categorias intactos). Possui opção de Desfazer imediata.
            </p>
            <div className="pt-2">
              <Button
                variant="sun"
                onClick={() => setResetMonthsModalOpen(true)}
                className="inline-flex items-center gap-2 shadow-sm"
              >
                <RotateCcw size={18} />
                <span>Resetar lançamentos de todos os meses</span>
              </Button>
            </div>
          </Card>

          {/* 7. Apagar todos os dados */}
          <Card variant="white" staggerIndex={6} className="space-y-4 border-red-soft/30">
            <div className="flex items-center gap-2.5 text-red-soft">
              <Trash2 size={22} className="shrink-0" />
              <h2 className="title-section">Apagar todos os dados</h2>
            </div>
            <p className="text-sm text-blue-deep/85 dark:text-cream/85 leading-relaxed">
              Atenção: se apagar os dados, apaga tudo do banco de dados (todos os espaços, lançamentos, categorias, cofrinhos, viagens e planejamentos).
            </p>
            <div className="pt-4 sm:pt-5">
              <Button variant="danger" onClick={() => setConfirmResetOpen(true)}>
                Apagar todos os dados
              </Button>
            </div>
          </Card>

          {/* 7. Sobre */}
          <Card variant="sky" staggerIndex={6}>
            <div className="flex items-start gap-3.5">
              <Info size={24} className="text-blue-royal dark:text-sun shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold text-base">Sobre o LibertyBag</p>
                <p className="text-sm leading-relaxed">
                  Feito com carinho para cuidar do dinheiro da família sem complicação. Funciona no
                  celular e no computador, mesmo quando você está sem internet.
                </p>
                <p className="text-xs text-blue-deep/80 dark:text-cream/80 font-semibold">
                  Versão 1.2 (Fase 2 — Planejamento e Análises)
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal rápido de "+ Nova categoria" acionado direto pelo botão do card da tela Mais */}
      <CategoryFormModal
        open={quickCreateCatOpen}
        onClose={() => setQuickCreateCatOpen(false)}
      />

      <ConfirmDialog
        open={confirmResetOpen}
        title="Tem certeza que deseja apagar TODOS os dados?"
        description="Atenção: se apagar os dados, apaga TUDO permanentemente do banco de dados (todos os espaços criados, gastos, entradas, parcelamentos, cofrinhos, viagens, categorias e planejamentos). Tem certeza que deseja continuar?"
        confirmLabel="Sim, apagar"
        cancelLabel="Não, cancelar"
        onConfirm={handleWipeAllData}
        onCancel={() => setConfirmResetOpen(false)}
      />

      <ResetAllMonthsModal
        open={resetMonthsModalOpen}
        onClose={() => setResetMonthsModalOpen(false)}
        spaceId={activeSpaceId}
        onResetComplete={(res) => {
          showUndoToast(
            `Todos os meses foram resetados com sucesso! (${res.transactionsCount} lançamentos apagados)`,
            res.undo
          );
        }}
      />
    </div>
  );
};
