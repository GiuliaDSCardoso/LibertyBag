import React, { useEffect, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  AlertCircle
} from 'lucide-react';
import { type CategoryRecord, type TransactionType } from '../../db/dexie';
import { useAppStore } from '../../app/store/useAppStore';
import {
  AVAILABLE_ICON_NAMES,
  CategoryIcon,
  IDENTITY_COLOR_SWATCHES
} from '../../components/ui/CategoryIcon';
import { Button } from '../../components/ui/Button';
import { ModalShell } from '../../components/ui/ModalShell';
import {
  findSimilarCategory,
  saveCategoryWithUndo
} from './categoryService';

interface CategoryFormModalProps {
  open: boolean;
  initialType?: TransactionType;
  editingCategory?: CategoryRecord | null;
  onClose: () => void;
  onSaved?: (saved: CategoryRecord) => void;
}

/**
 * Modal perfeitamente enquadrado (tanto em celular quanto em desktop) para criar/editar categoria:
 * - Cabeçalho e rodapé fixos (botões nunca cortam na borda direita e o título nunca some no topo)
 * - Sem rolagem horizontal (overflow-x-hidden)
 * - Prévia ao vivo, 8 cores e 24 ícones
 */
export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  initialType = 'saida',
  editingCategory = null,
  onClose,
  onSaved
}) => {
  const { activeSpaceId, activeUserId, showUndoToast } = useAppStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(initialType);
  const [icon, setIcon] = useState('ShoppingBag');
  const [color, setColor] = useState('#2346C8');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [similarCat, setSimilarCat] = useState<CategoryRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingCategory) {
      setName(editingCategory.name);
      setType(editingCategory.type);
      setIcon(editingCategory.icon);
      setColor(editingCategory.color);
    } else {
      setName('');
      setType(initialType);
      setIcon(initialType === 'entrada' ? 'Wallet' : 'ShoppingBag');
      setColor(initialType === 'entrada' ? '#2E9E6B' : '#2346C8');
    }
    setErrorMsg(null);
    setSimilarCat(null);
  }, [open, editingCategory, initialType]);

  // Verifica se já existe categoria com nome parecido enquanto digita
  useEffect(() => {
    let active = true;
    if (!open || !name.trim()) {
      setSimilarCat(null);
      return;
    }

    findSimilarCategory(name, type, activeSpaceId, editingCategory?.id).then((found) => {
      if (active) setSimilarCat(found);
    });

    return () => {
      active = false;
    };
  }, [open, name, type, activeSpaceId, editingCategory?.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setErrorMsg('Por favor, escreva um nome para a categoria (ex.: Farmácia ou Feira).');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    try {
      const { category, undo } = await saveCategoryWithUndo({
        id: editingCategory?.id,
        userId: activeUserId,
        spaceId: activeSpaceId,
        name: clean,
        type,
        icon,
        color
      });

      showUndoToast(
        editingCategory
          ? `Categoria "${category.name}" atualizada!`
          : `Categoria "${category.name}" criada!`,
        undo
      );
      if (onSaved) onSaved(category);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível salvar agora.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={editingCategory ? `Editar "${editingCategory.name}"` : 'Nova categoria'}
      subtitle="Escolha um nome simples, uma cor e um desenho fácil de reconhecer."
      maxWidthClass="max-w-xl"
      zIndexClass="z-50"
      footer={
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            fullWidth
            disabled={isSaving}
            onClick={() => handleSubmit()}
          >
            <Check size={20} />
            <span>{editingCategory ? 'Salvar alterações' : 'Salvar categoria'}</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Prévia ao vivo sempre visível e bem enquadrada */}
        <div className="bg-white dark:bg-[#192B85] rounded-2xl p-4 border border-blue-sky/70 dark:border-blue-sky/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs transition-colors"
              style={{ backgroundColor: color }}
            >
              <CategoryIcon name={icon} size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-royal dark:text-sun block">
                Prévia ao vivo
              </span>
              <p className="font-bold text-lg truncate">
                {name.trim() || 'Nome da categoria'}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-pill text-xs font-bold whitespace-nowrap ${
              type === 'entrada'
                ? 'bg-green-ok/15 text-green-ok'
                : 'bg-red-soft/15 text-red-soft'
            }`}
          >
            {type === 'entrada' ? 'Dinheiro que entrou' : 'Dinheiro que saiu'}
          </span>
        </div>

        {/* 1. Nome + 2. Tipo (lado a lado no desktop para caber tudo sem rolar) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cat-modal-name" className="block font-bold text-base mb-1">
              1. Nome da categoria
            </label>
            <input
              id="cat-modal-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Ex.: Farmácia, Feira..."
              className="w-full min-h-[52px] px-4 rounded-2xl bg-white dark:bg-[#192B85] border-2 border-blue-sky focus:border-blue-royal text-base font-semibold"
            />
          </div>

          <div>
            <span className="block font-bold text-base mb-1">
              2. Tipo de movimento
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('saida')}
                aria-pressed={type === 'saida'}
                className={`min-h-[52px] px-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 border-2 transition-all ${
                  type === 'saida'
                    ? 'bg-red-soft text-white border-red-soft shadow-xs'
                    : 'bg-white dark:bg-[#192B85] border-blue-sky/70'
                }`}
              >
                <ArrowDownCircle size={18} className="shrink-0" />
                <span>Saiu</span>
              </button>

              <button
                type="button"
                onClick={() => setType('entrada')}
                aria-pressed={type === 'entrada'}
                className={`min-h-[52px] px-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 border-2 transition-all ${
                  type === 'entrada'
                    ? 'bg-green-ok text-white border-green-ok shadow-xs'
                    : 'bg-white dark:bg-[#192B85] border-blue-sky/70'
                }`}
              >
                <ArrowUpCircle size={18} className="shrink-0" />
                <span>Entrou</span>
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <p role="alert" className="text-sm font-bold text-red-soft flex items-center gap-1.5">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </p>
        )}

        {similarCat && !errorMsg && (
          <div
            role="status"
            className="p-3.5 rounded-2xl bg-sun/85 text-blue-deep text-sm font-semibold border border-orange flex items-start gap-2"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>
              Você já tem uma categoria parecida chamada{' '}
              <strong>&ldquo;{similarCat.name}&rdquo;</strong>. Se quiser, ainda pode salvar mesmo assim.
            </span>
          </div>
        )}

        {/* 3. Cor (8 cores da identidade) */}
        <div>
          <span className="block font-bold text-base mb-2">
            3. Escolha uma cor
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {IDENTITY_COLOR_SWATCHES.map((swatch) => {
              const selected = color === swatch.hex;
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setColor(swatch.hex)}
                  aria-label={`Cor ${swatch.label}`}
                  aria-pressed={selected}
                  className={`min-h-[46px] rounded-2xl flex items-center justify-center border-2 transition-transform ${
                    selected
                      ? 'border-blue-deep dark:border-white scale-105 ring-2 ring-sun'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                >
                  {selected && <Check size={20} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Ícone (grade de 24 ícones) */}
        <div>
          <span className="block font-bold text-base mb-2">
            4. Escolha um desenho ({AVAILABLE_ICON_NAMES.length} opções)
          </span>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {AVAILABLE_ICON_NAMES.map((iconName) => {
              const selected = icon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  aria-label={`Ícone ${iconName}`}
                  aria-pressed={selected}
                  className={`min-h-[46px] rounded-2xl flex items-center justify-center border-2 transition-all ${
                    selected
                      ? 'bg-blue-royal text-white border-blue-royal shadow-xs'
                      : 'bg-white dark:bg-[#192B85] border-blue-sky/60 hover:border-blue-royal'
                  }`}
                >
                  <CategoryIcon name={iconName} size={20} />
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </ModalShell>
  );
};
