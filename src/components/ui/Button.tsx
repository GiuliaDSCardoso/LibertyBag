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
      'bg-blue-sky/85 hover:bg-blue-sky active:scale-[0.98] text-blue-deep dark:bg-[#2339A8] dark:text-white font-bold',
    danger:
      'bg-red-soft hover:opacity-95 active:scale-[0.98] text-white font-bold shadow-sm',
    sun: 'bg-sun hover:bg-orange/80 active:scale-[0.98] text-blue-deep font-bold shadow-sm',
    ghost:
      'bg-transparent hover:bg-blue-sky/30 active:scale-[0.98] text-blue-royal dark:text-blue-sky font-bold border border-blue-royal/25 dark:border-blue-sky/30'
  };

  const sizeStyles =
    size === 'lg'
      ? 'min-h-[56px] px-6 py-3 text-lg rounded-pill'
      : 'min-h-[52px] px-5 py-2.5 text-base rounded-pill';

  return (
    <button
      data-variant={variant}
      className={`inline-flex items-center justify-center gap-3 whitespace-nowrap shrink-0 transition-all hover-lift disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
