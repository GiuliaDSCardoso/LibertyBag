import React from 'react';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

/**
 * Teclado numérico grande (alvos >= 54px) para digitar valores em reais/centavos
 * sem precisar abrir o teclado miúdo do celular.
 */
export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onDigit,
  onBackspace,
  onClear
}) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="grid grid-cols-3 gap-2.5 select-none" role="group" aria-label="Teclado de valor">
      {digits.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onDigit(d)}
          className="min-h-[56px] rounded-2xl bg-white dark:bg-[#1E349E] hover:bg-blue-sky/60 active:scale-95 text-blue-deep dark:text-white font-sans font-bold text-2xl shadow-card border border-blue-sky/60 dark:border-blue-sky/25 transition-all"
        >
          {d}
        </button>
      ))}

      <button
        type="button"
        onClick={onClear}
        className="min-h-[56px] rounded-2xl bg-blue-sky/45 dark:bg-[#192B85] hover:bg-blue-sky text-blue-deep dark:text-cream font-bold text-sm shadow-card border border-blue-sky/50 transition-all"
      >
        Limpar
      </button>

      <button
        type="button"
        onClick={() => onDigit('0')}
        className="min-h-[56px] rounded-2xl bg-white dark:bg-[#1E349E] hover:bg-blue-sky/60 active:scale-95 text-blue-deep dark:text-white font-sans font-bold text-2xl shadow-card border border-blue-sky/60 dark:border-blue-sky/25 transition-all"
      >
        0
      </button>

      <button
        type="button"
        onClick={onBackspace}
        aria-label="Apagar último número"
        className="min-h-[56px] rounded-2xl bg-blue-sky/45 dark:bg-[#192B85] hover:bg-blue-sky text-blue-deep dark:text-cream font-bold flex items-center justify-center shadow-card border border-blue-sky/50 transition-all"
      >
        <Delete size={24} />
      </button>
    </div>
  );
};
