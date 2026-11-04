import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { db, type CategoryRecord, type TransactionType } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { Button } from '../../components/ui/Button';
import { CategoryFormModal } from './CategoryFormModal';
import {
  countTransactionsInCategory,
  deleteCategoryWithUndo
} from './categoryService';

interface CategoriesManagerProps {
  externalCreateTrigger?: boolean;
  onExternalCreateHandled?: () => void;
}

export const CategoriesManager: React.FC<CategoriesManagerProps> = () => {
  const { activeSpaceId, showUndoToast } = useAppStore();
  const [filterType, setFilterType] = useState<TransactionType>('saida');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryRecord | null>(null);

  const [catToDelete, setCatToDelete] = useState<CategoryRecord | null>(null);
  const [deleteTxCount, setDeleteTxCount] = useState<number>(0);

  const categories = useLiveQuery(
    async () =>
      db.categories
        .where('spaceId')
        .equals(activeSpaceId)
        .and((c) => !c.deletedAt && c.type === filterType)
        .sortBy('sortOrder'),
    [activeSpaceId, filterType],
    []
  );

  const handleOpenCreate = () => {
    setEditingCat(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryRecord) => {
    setEditingCat(cat);
    setModalOpen(true);
  };

  const handleRequestDelete = async (cat: CategoryRecord) => {
    const count = await countTransactionsInCategory(cat.id);
    setDeleteTxCount(count);
    setCatToDelete(cat);
  };

  const handleExecuteDelete = async (moveToOthers: boolean) => {
    if (!catToDelete) return;
    const target = catToDelete;
    const { movedCount, undo } = await deleteCategoryWithUndo(target.id, {
      moveToOthers
    });
    setCatToDelete(null);

    const msg =
      movedCount > 0
        ? `Categoria "${target.name}" apagada (${movedCount} itens movidos para Outros)`
        : `Categoria "${target.name}" apagada!`;
    showUndoToast(msg, undo);
  };

  return (
    <div className="space-y-4">
      {/* Topo da seção Categorias com botão primário "+ Nova categoria" sempre visível */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-1.5 bg-cream dark:bg-blue-deep p-1.5 rounded-pill flex-1 min-w-[240px]">
          <button
            type="button"
            onClick={() => setFilterType('saida')}
            className={`min-h-[46px] px-3 rounded-pill font-bold text-sm whitespace-nowrap transition-colors ${
              filterType === 'saida'
                ? 'bg-blue-royal text-white shadow-xs'
                : 'text-blue-deep dark:text-cream'
            }`}
          >
            Dinheiro que saiu
          </button>
          <button
            type="button"
            onClick={() => setFilterType('entrada')}
            className={`min-h-[46px] px-3 rounded-pill font-bold text-sm whitespace-nowrap transition-colors ${
              filterType === 'entrada'
                ? 'bg-blue-royal text-white shadow-xs'
                : 'text-blue-deep dark:text-cream'
            }`}
          >
            Dinheiro que entrou
          </button>
        </div>

        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>Nova categoria</span>
        </Button>
      </div>

      {/* Lista de Categorias com animação de layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <AnimatePresence initial={false}>
          {categories.map((cat) => (
            <motion.div
              key={cat.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="min-h-[64px] px-4 py-3 rounded-2xl bg-cream/65 dark:bg-blue-deep/65 border border-blue-sky/60 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  <CategoryIcon name={cat.icon} size={22} />
                </div>
                <span className="font-bold text-base truncate">{cat.name}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(cat)}
                  aria-label={`Editar categoria ${cat.name}`}
                  className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-blue-sky/40 flex items-center justify-center text-blue-royal dark:text-sun"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestDelete(cat)}
                  aria-label={`Apagar categoria ${cat.name}`}
                  className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-red-soft/15 flex items-center justify-center text-red-soft"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal de Criar / Editar Categoria */}
      <CategoryFormModal
        open={modalOpen}
        initialType={filterType}
        editingCategory={editingCat}
        onClose={() => setModalOpen(false)}
      />

      {/* Diálogo amigável para arquivar/apagar (oferece mover lançamentos para "Outros") */}
      {catToDelete && (
        <div
          className="fixed inset-0 z-50 bg-blue-deep/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="del-cat-title"
        >
          <div className="bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream w-full max-w-md rounded-card-lg p-6 shadow-soft border-2 border-red-soft space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-soft/15 text-red-soft flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>

            <h3 id="del-cat-title" className="font-serif italic text-2xl font-bold">
              Apagar a categoria &ldquo;{catToDelete.name}&rdquo;?
            </h3>

            {deleteTxCount > 0 ? (
              <p className="text-base leading-relaxed">
                Você tem <strong>{deleteTxCount} lançamento(s)</strong> anotados nesta categoria.
                Deseja mover esses lançamentos para a categoria <strong>&ldquo;Outros&rdquo;</strong> para
                não perder nada?
              </p>
            ) : (
              <p className="text-base leading-relaxed">
                Esta categoria ainda não tem lançamentos anotados. Se mudar de ideia depois de
                apagar, basta tocar em <strong>Desfazer</strong>.
              </p>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              {deleteTxCount > 0 ? (
                <>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleExecuteDelete(true)}
                  >
                    Mover itens para &ldquo;Outros&rdquo; e apagar
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => handleExecuteDelete(false)}
                  >
                    Apenas arquivar a categoria
                  </Button>
                </>
              ) : (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => handleExecuteDelete(false)}
                >
                  Sim, pode apagar
                </Button>
              )}

              <Button
                variant="secondary"
                fullWidth
                onClick={() => setCatToDelete(null)}
              >
                Não, voltar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
