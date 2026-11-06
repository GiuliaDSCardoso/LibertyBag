import React from 'react';
import {
  ShoppingCart,
  Utensils,
  Bus,
  Home,
  FileText,
  HeartPulse,
  Sun,
  Shirt,
  BookOpen,
  Gift,
  Plane,
  Coffee,
  MoreHorizontal,
  Wallet,
  Sparkles,
  PlusCircle,
  PiggyBank,
  ShoppingBag,
  Wrench,
  Music,
  Smartphone,
  PawPrint,
  Car,
  Stethoscope,
  Dumbbell,
  Tv,
  Baby,
  Scissors,
  type LucideIcon
} from 'lucide-react';

// 24 ícones claros do dia a dia para categorias
// eslint-disable-next-line react-refresh/only-export-components
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  ShoppingCart,
  Utensils,
  Bus,
  Car,
  Home,
  FileText,
  HeartPulse,
  Stethoscope,
  Sun,
  Shirt,
  BookOpen,
  Gift,
  Plane,
  Coffee,
  ShoppingBag,
  PiggyBank,
  Wallet,
  Sparkles,
  Wrench,
  Music,
  Smartphone,
  PawPrint,
  Dumbbell,
  Tv,
  Baby,
  Scissors,
  PlusCircle,
  MoreHorizontal
};

// Lista de 24 ícones para o seletor de criação/edição de categoria
// eslint-disable-next-line react-refresh/only-export-components
export const AVAILABLE_ICON_NAMES = [
  'ShoppingCart',
  'Utensils',
  'Coffee',
  'ShoppingBag',
  'Bus',
  'Car',
  'Home',
  'FileText',
  'HeartPulse',
  'Stethoscope',
  'Sun',
  'Shirt',
  'BookOpen',
  'Gift',
  'Plane',
  'PiggyBank',
  'Wallet',
  'Sparkles',
  'Wrench',
  'Music',
  'Smartphone',
  'PawPrint',
  'Dumbbell',
  'Scissors'
];

// Paleta retrô de cores da identidade visual (Royal #2346C8 / Dark #0D152D)
// eslint-disable-next-line react-refresh/only-export-components
export const IDENTITY_COLOR_SWATCHES = [
  { hex: '#2346C8', label: 'Azul Royal' },
  { hex: '#0D152D', label: 'Azul Meia-Noite' },
  { hex: '#F89C3D', label: 'Laranja Sol' },
  { hex: '#2E9E6B', label: 'Verde Folha' },
  { hex: '#D9534F', label: 'Coral Suave' },
  { hex: '#E6A82E', label: 'Amarelo Ouro' },
  { hex: '#527FB6', label: 'Azul Clássico' },
  { hex: '#E5486D', label: 'Rosa Vintage' }
];

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  className = '',
  size = 24
}) => {
  const IconComponent = CATEGORY_ICONS[name] || MoreHorizontal;
  return <IconComponent size={size} strokeWidth={2.4} className={className} aria-hidden="true" />;
};

/**
 * Selo Retrô Estilo Anos 30 / Postal Coin Stamp:
 * Transforma o ícone de categoria em um medalhão de cunho vintage,
 * com borda dupla concêntrica, cantos talhados e efeito de carimbo manual.
 */
interface CategoryStampBadgeProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CategoryStampBadge: React.FC<CategoryStampBadgeProps> = ({
  name,
  color = '#2346C8',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl'
  }[size];

  const iconSizes = {
    sm: 15,
    md: 22,
    lg: 26
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 border-2 border-[#0D152D]/80 dark:border-white/30 shadow-[2px_2px_0px_rgba(13,21,45,0.7)] dark:shadow-[2px_2px_0px_rgba(107,159,216,0.35)] transition-transform hover:rotate-2 ${sizeClasses} ${className}`}
      style={{ backgroundColor: color }}
    >
      {/* Anel concêntrico vintage de cunho retrô */}
      <span className="absolute inset-0.5 rounded-[10px] border border-white/35 pointer-events-none" />
      <span className="relative z-10 text-white drop-shadow-sm">
        <CategoryIcon name={name} size={iconSizes} />
      </span>
    </div>
  );
};
