import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  Cloud,
  RefreshCw,
  Plus,
  Check,
  KeyRound,
  Copy,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { db, type SpaceRecord, type SpaceType } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import { getSupabaseConfig } from '../../lib/supabase';
import {
  createSpaceWithUndo,
  deleteSpaceCompletely,
  joinSharedSpaceByCode
} from './spacesService';
import { getLastSyncAt, syncAllWithSupabase } from '../sync/syncService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ModalShell } from '../../components/ui/ModalShell';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export const SpacesAndSyncCard: React.FC = () => {
  const { activeSpaceId, activeUserId, userName, userEmail, setActiveSpaceId, showUndoToast } =
    useAppStore();

  const spaces = useLiveQuery(
    async () => db.spaces.filter((s) => !s.deletedAt).toArray(),
    [],
    []
  );

  const configState = getSupabaseConfig();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string>(() => {
    const last = getLastSyncAt();
    return last
      ? `Última sincronização: ${new Date(last).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`
      : 'Conectado ao banco de dados';
  });

  // Modais de Criar Espaço / Entrar com Código / Confirmar Exclusão de Espaço
  const [newSpaceModalOpen, setNewSpaceModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceType, setNewSpaceType] = useState<SpaceType>('compartilhado');
  const [spaceNameError, setSpaceNameError] = useState<string | null>(null);

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const [spaceToDelete, setSpaceToDelete] = useState<SpaceRecord | null>(null);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusText('Sincronizando com a nuvem...');
    try {
      const res = await syncAllWithSupabase();
      setSyncStatusText(res.message);
      if (res.ok) {
        showUndoToast(res.message, async () => {});
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSpace = async () => {
    setSpaceNameError(null);
    const trimmed = newSpaceName.trim();

    if (!trimmed || trimmed.length < 2) {
      setSpaceNameError('Digite um nome para o espaço (pelo menos 2 letras).');
      return;
    }

    const duplicate = spaces.find(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setSpaceNameError(`Já existe um espaço chamado "${duplicate.name}".`);
      return;
    }

    const { space, undo } = await createSpaceWithUndo({
      name: trimmed,
      type: newSpaceType,
      userId: activeUserId
    });
    setActiveSpaceId(space.id);
    setNewSpaceModalOpen(false);
    setNewSpaceName('');
    void handleSyncNow();
    showUndoToast(`Espaço "${space.name}" criado e selecionado!`, undo);
  };

  const handleConfirmDeleteSpace = async () => {
    if (!spaceToDelete) return;
    const deletedName = spaceToDelete.name;
    const targetId = spaceToDelete.id;
    setSpaceToDelete(null);

    const { nextActiveSpaceId } = await deleteSpaceCompletely(targetId);
    setActiveSpaceId(nextActiveSpaceId);
    showUndoToast(
      `Espaço "${deletedName}" e todos os seus dados foram apagados.`,
      async () => {}
    );
  };

  const handleJoinByCode = async () => {
    setJoinError(null);
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setJoinError('Digite o código completo do espaço compartilhado.');
      return;
    }

    try {
      const { space } = await joinSharedSpaceByCode(cleanCode, activeUserId);
      setActiveSpaceId(space.id);
      setJoinModalOpen(false);
      setJoinCodeInput('');
      void handleSyncNow();
      showUndoToast(`Você entrou no espaço "${space.name}"!`, async () => {});
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Código não encontrado.');
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Card de Espaços (Pessoal + Compartilhado entre você, sua mãe e seu namorado) */}
      <Card variant="white" className="space-y-5 p-6 sm:p-7">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FEE180] to-[#F9B249] text-blue-deep flex items-center justify-center shrink-0 shadow-xs border border-white/40">
            <Users size={22} />
          </div>
          <div className="space-y-1">
            <h2 className="title-section">Espaços da Família</h2>
            <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85 leading-relaxed">
              Alterne entre o seu dinheiro pessoal e os espaços compartilhados, ou exclua um espaço.
            </p>
          </div>
        </div>

        {/* Lista de Espaços disponíveis */}
        <div className="space-y-3 pt-1">
          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId;
            return (
              <div
                key={space.id}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-wrap items-center justify-between gap-4 shadow-xs ${
                  isActive
                    ? 'bg-blue-royal text-white border-blue-royal shadow-soft'
                    : 'bg-cream dark:bg-[#0D152D] text-blue-deep dark:text-cream border-blue-sky/70 dark:border-white/10'
                }`}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base sm:text-lg truncate">{space.name}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-pill font-bold ${
                        isActive
                          ? 'bg-sun text-blue-deep shadow-xs'
                          : 'bg-blue-sky/50 text-blue-deep dark:bg-white/10 dark:text-cream border border-blue-sky/40 dark:border-white/10'
                      }`}
                    >
                      {space.type === 'compartilhado' ? 'Compartilhado' : 'Pessoal'}
                    </span>
                  </div>
                  {space.inviteCode && (
                    <div className="flex items-center gap-2 text-xs opacity-90">
                      <span>
                        Código: <strong>{space.inviteCode}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            void navigator.clipboard.writeText(space.inviteCode || '');
                            showUndoToast(`Código ${space.inviteCode} copiado!`, async () => {});
                          }
                        }}
                        className="inline-flex items-center gap-1 font-bold underline hover:opacity-80 transition-opacity"
                      >
                        <Copy size={13} />
                        <span>Copiar</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-pill bg-white/20 text-white border border-white/30 shadow-xs">
                      <Check size={14} strokeWidth={3} />
                      <span>Em uso</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSpaceId(space.id);
                        showUndoToast(`Mudou para "${space.name}"`, async () => {});
                      }}
                      className="min-h-[40px] px-3.5 rounded-pill text-xs font-bold inline-flex items-center gap-1.5 text-white bg-blue-royal hover:bg-blue-deep transition-all shadow-xs"
                    >
                      Abrir
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSpaceToDelete(space)}
                    aria-label={`Apagar espaço ${space.name}`}
                    title={`Apagar espaço ${space.name}`}
                    className="min-h-[40px] px-3.5 rounded-pill text-xs font-bold inline-flex items-center gap-1.5 text-white bg-red-soft hover:opacity-90 transition-all shadow-xs"
                  >
                    <Trash2 size={14} />
                    <span>Apagar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3.5 pt-4 border-t border-blue-sky/40 dark:border-white/10">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSpaceNameError(null);
              setNewSpaceModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Criar espaço</span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setJoinError(null);
              setJoinModalOpen(true);
            }}
          >
            <KeyRound size={16} />
            <span>Entrar com código</span>
          </Button>
        </div>
      </Card>

      {/* 2. Card de Sincronização Segura com a Nuvem */}
      <Card variant="white" className="space-y-6 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-royal text-white flex items-center justify-center shrink-0">
              <Cloud size={20} />
            </div>
            <div className="space-y-1">
              <h2 className="title-section">Nuvem e Sincronização</h2>
              <p className="text-xs sm:text-sm text-blue-deep/85 dark:text-cream/85">
                {syncStatusText}
              </p>
              {userEmail && (
                <p className="text-xs font-bold text-green-ok">
                  Conta: {userName || 'Família'} ({userEmail})
                </p>
              )}
            </div>
          </div>

          <span
            className={`min-h-[32px] px-2.5 rounded-pill text-xs font-extrabold inline-flex items-center gap-1 shrink-0 ${
              configState.isConfigured
                ? 'bg-green-ok/15 text-green-ok border border-green-ok/35'
                : 'bg-blue-sky/50 text-blue-deep'
            }`}
          >
            {configState.isConfigured ? 'Nuvem Ativa' : 'Modo Local'}
          </span>
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleSyncNow}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            <span>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar agora com a nuvem'}
            </span>
          </Button>
        </div>
      </Card>

      {/* Modal: Criar Novo Espaço */}
      <ModalShell
        open={newSpaceModalOpen}
        onClose={() => setNewSpaceModalOpen(false)}
        title="Novo espaço da família"
        subtitle="Crie um espaço separado para dividir contas com sua mãe ou com seu namorado."
        maxWidthClass="max-w-lg"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setNewSpaceModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleCreateSpace}>
              <Check size={18} />
              <span>Criar espaço</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="space-name-input" className="block font-bold text-sm mb-1.5">
              Nome do espaço
            </label>
            <input
              id="space-name-input"
              type="text"
              value={newSpaceName}
              onChange={(e) => {
                setNewSpaceName(e.target.value);
                if (spaceNameError) setSpaceNameError(null);
              }}
              placeholder="Ex.: Casa com a Mamãe, Eu e Meu Amor..."
              className={`w-full min-h-[50px] px-4 rounded-xl bg-white dark:bg-[#152144] border-2 font-bold ${
                spaceNameError ? 'border-red-soft' : 'border-blue-sky'
              }`}
            />
            {spaceNameError && (
              <p className="mt-1.5 text-xs font-bold text-red-soft flex items-center gap-1.5">
                <AlertCircle size={15} className="shrink-0" />
                <span>{spaceNameError}</span>
              </p>
            )}
          </div>

          <div>
            <span className="block font-bold text-sm mb-1.5">Tipo de espaço</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setNewSpaceType('compartilhado')}
                className={`min-h-[50px] rounded-xl font-bold text-xs px-3 border-2 ${
                  newSpaceType === 'compartilhado'
                    ? 'bg-blue-royal text-white border-blue-royal'
                    : 'bg-white dark:bg-[#152144] border-blue-sky'
                }`}
              >
                Compartilhado (gera código de convite)
              </button>
              <button
                type="button"
                onClick={() => setNewSpaceType('pessoal')}
                className={`min-h-[50px] rounded-xl font-bold text-xs px-3 border-2 ${
                  newSpaceType === 'pessoal'
                    ? 'bg-blue-royal text-white border-blue-royal'
                    : 'bg-white dark:bg-[#152144] border-blue-sky'
                }`}
              >
                Pessoal (só meu)
              </button>
            </div>
          </div>
        </div>
      </ModalShell>

      {/* Modal: Entrar com Código de Convite */}
      <ModalShell
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title="Entrar em espaço compartilhado"
        subtitle="Digite o código de 6 letras/números que sua mãe ou seu namorado enviou para você."
        maxWidthClass="max-w-md"
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => setJoinModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleJoinByCode}>
              <Check size={18} />
              <span>Entrar no espaço</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {joinError && (
            <p className="p-3 rounded-xl bg-red-soft/15 text-red-soft text-xs font-bold flex items-center gap-1.5">
              <AlertCircle size={15} className="shrink-0" />
              <span>{joinError}</span>
            </p>
          )}
          <div>
            <label htmlFor="join-code-input" className="block font-bold text-sm mb-1">
              Código do espaço
            </label>
            <input
              id="join-code-input"
              type="text"
              value={joinCodeInput}
              onChange={(e) => {
                setJoinCodeInput(e.target.value.toUpperCase());
                if (joinError) setJoinError(null);
              }}
              placeholder="Ex.: CASA26"
              className={`w-full min-h-[52px] px-4 rounded-xl bg-white dark:bg-[#152144] border-2 font-extrabold text-xl uppercase tracking-widest text-center ${
                joinError ? 'border-red-soft' : 'border-blue-sky'
              }`}
            />
          </div>
        </div>
      </ModalShell>

      {/* Confirmação de Exclusão Total do Espaço */}
      <ConfirmDialog
        open={Boolean(spaceToDelete)}
        title={`Apagar o espaço "${spaceToDelete?.name || ''}"?`}
        description="Atenção: apagar este espaço vai excluir permanentemente TODOS os dados ligados a ele no banco de dados (todos os lançamentos, parcelamentos, cofrinhos, viagens, planejamentos e categorias deste espaço). Tem certeza que deseja apagar tudo deste espaço?"
        confirmLabel="Sim, apagar "
        cancelLabel="Não, cancelar"
        onConfirm={handleConfirmDeleteSpace}
        onCancel={() => setSpaceToDelete(null)}
      />
    </div>
  );
};
