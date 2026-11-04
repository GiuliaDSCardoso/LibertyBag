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

// Paleta de 8 cores da identidade visual
// eslint-disable-next-line react-refresh/only-export-components
export const IDENTITY_COLOR_SWATCHES = [
  { hex: '#2346C8', label: 'Azul Royal' },
  { hex: '#12206B', label: 'Azul Profundo' },
  { hex: '#F89C3D', label: 'Laranja Sol' },
  { hex: '#2E9E6B', label: 'Verde Folha' },
  { hex: '#D9534F', label: 'Coral Suave' },
  { hex: '#E6A82E', label: 'Amarelo Ouro' },
  { hex: '#3B6EE8', label: 'Azul Céu Forte' },
  { hex: '#E5486D', label: 'Rosa Praia' }
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
  return <IconComponent size={size} className={className} aria-hidden="true" />;
};
