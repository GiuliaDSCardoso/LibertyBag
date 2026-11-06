import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  color?: string;
  description?: string;
}

export interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

/**
 * Dropdown Personalizado do LibertyBag:
 * Substitui o select nativo do navegador por um componente tátil,
 * com identidade visual consistente nos temas Claro e Escuro,
 * fechamento ao clicar fora e suporte total a ícones, cores e badges.
 */
export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'md',
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'min-h-[38px] px-3 py-1.5 text-xs rounded-xl',
    md: 'min-h-[46px] px-4 py-2 text-sm rounded-xl',
    lg: 'min-h-[52px] px-4 py-2.5 text-base rounded-2xl'
  }[size];

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-left ${className}`}
    >
      {/* Botão Gatilho Personalizado */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 font-bold transition-all text-left border-2 focus:outline-none focus:border-blue-royal ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-cream dark:bg-[#0D152D] border-blue-sky/40 text-blue-deep/60 dark:text-cream/60'
            : 'bg-white dark:bg-[#152144] hover:bg-blue-sky/20 dark:hover:bg-[#1E2E5E] border-blue-sky/70 dark:border-white/15 text-blue-deep dark:text-cream shadow-xs cursor-pointer'
        } ${sizeClasses} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedOption?.color && (
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0 text-blue-royal dark:text-sun">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate block">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0">{selectedOption.badge}</span>
          )}
        </div>

        <ChevronDown
          size={18}
          className={`shrink-0 text-blue-deep/60 dark:text-cream/60 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-royal dark:text-sun' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Popover Lista de Opções */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            role="listbox"
            tabIndex={-1}
            className={`absolute z-[70] left-0 right-0 mt-2 max-h-[420px] overflow-y-auto bg-white dark:bg-[#152144] border-2 border-blue-sky/80 dark:border-white/20 rounded-2xl p-2 shadow-2xl shadow-blue-deep/20 dark:shadow-black/70 space-y-1 overscroll-contain ${menuClassName}`}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-sky/40 dark:bg-blue-royal/30 text-blue-royal-ink dark:text-sun'
                      : 'text-blue-deep dark:text-cream hover:bg-blue-sky/20 dark:hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {opt.color && (
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    {opt.icon && (
                      <span className="shrink-0 text-blue-royal dark:text-sun">
                        {opt.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="truncate block">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[11px] font-normal text-blue-deep/70 dark:text-cream/70 block truncate">
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {opt.badge && <span>{opt.badge}</span>}
                    {isSelected && (
                      <Check
                        size={16}
                        strokeWidth={2.75}
                        className="text-blue-royal dark:text-sun"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
