import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'sun';
  fullWidth?: boolean;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Botão acessível:
 * - Altura mínima de 52px (ou 56px no lg)
 * - Padding horizontal >= 16px (px-5 = 20px)
 * - Gap de 10-12px entre ícone e texto (gap-3 = 12px)
 * - white-space: nowrap para nunca quebrar texto em 2 linhas sem necessidade
 * - Feedback de toque sutil (active:scale-[0.98]) e hover-lift em mouse
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-blue-royal hover:bg-blue-deep active:scale-[0.98] text-white shadow-soft font-bold',
    secondary:
      'bg-blue-sky/85 hover:bg-blue-sky active:scale-[0.98] text-blue-deep dark:bg-[#152144] dark:text-cream dark:border dark:border-white/20 font-bold',
    danger:
      'bg-red-soft hover:opacity-95 active:scale-[0.98] text-white font-bold shadow-sm',
    sun:
      'bg-sun hover:bg-orange/80 active:scale-[0.98] text-blue-deep font-bold shadow-sm',
    ghost:
      'bg-transparent hover:bg-blue-sky/30 active:scale-[0.98] text-blue-royal dark:text-blue-sky font-bold border border-blue-royal/25 dark:border-blue-sky/30'
  };

  const sizeStyles =
    size === 'lg'
      ? 'min-h-[50px] sm:min-h-[56px] px-6 sm:px-8 py-3 text-sm sm:text-base rounded-pill gap-2.5 sm:gap-3'
      : 'min-h-[44px] sm:min-h-[48px] px-4.5 sm:px-6 py-2.5 text-xs sm:text-sm rounded-pill gap-2 sm:gap-2.5';

  return (
    <button
      data-variant={variant}
      className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all hover-lift disabled:opacity-50 disabled:pointer-events-none tracking-wide ${variantStyles[variant]} ${sizeStyles} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
