import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MatisseFlower } from '../illustrations/BeachIllustrations';

interface CardProps {
  children: React.ReactNode;
  variant?: 'white' | 'sky' | 'royal' | 'sun' | 'framed';
  withFlowerWatermark?: boolean;
  className?: string;
  onClick?: () => void;
  staggerIndex?: number;
}

/**
 * Cartão estilo "Rayo":
 * - Padding interno: 20px (p-5) no celular, 28px (lg:p-7) no desktop
 * - Cantos grandes arredondados (24px–28px)
 * - Marca d'água sutil posicionada para nunca atrapalhar texto/botões
 * - Entrada escalonada sutil (~40ms) respeitando prefers-reduced-motion
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'white',
  withFlowerWatermark = false,
  className = '',
  onClick,
  staggerIndex = 0
}) => {
  const shouldReduceMotion = useReducedMotion();

  const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
    white:
      'bg-white dark:bg-[#192B85] text-blue-deep dark:text-cream border border-blue-sky/60 dark:border-blue-sky/20 shadow-card',
    sky: 'bg-blue-sky/75 dark:bg-[#1E349E] text-blue-deep dark:text-cream border border-blue-royal/15',
    royal: 'bg-blue-royal text-white shadow-soft',
    sun: 'bg-sun/90 dark:bg-sun text-blue-deep border border-orange/30 shadow-card',
    framed: 'bg-blue-royal p-2.5 text-blue-deep shadow-soft rounded-card-lg'
  };

  // Separa classes de layout interno (space-y, flex, grid, gap, items, justify)
  // para que funcionem diretamente no container que envolve {children}
  const tokens = className.split(/\s+/).filter(Boolean);
  const innerLayoutTokens = tokens.filter((t) =>
    /^(space-[xy]-|flex|grid|items-|justify-|content-|gap-)/.test(t)
  );
  const innerClassName = innerLayoutTokens.join(' ');

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: 0.22,
          delay: Math.min(staggerIndex * 0.04, 0.2),
          ease: 'easeOut' as const
        }
      };

  if (variant === 'framed') {
    return (
      <motion.div
        {...motionProps}
        className={`${variantClasses.framed} ${onClick ? 'cursor-pointer hover-lift' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="bg-cream dark:bg-blue-deep dark:text-cream rounded-[20px] p-5 lg:p-7 relative overflow-hidden h-full">
          {withFlowerWatermark && (
            <div className="pointer-events-none select-none absolute -right-12 -bottom-12 opacity-10">
              <MatisseFlower size={136} />
            </div>
          )}
          <div className={`relative z-10 h-full ${innerClassName}`}>{children}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...motionProps}
      onClick={onClick}
      className={`rounded-card p-5 lg:p-7 relative overflow-hidden transition-colors ${
        onClick ? 'cursor-pointer hover-lift' : ''
      } ${variantClasses[variant]} ${className}`}
    >
      {withFlowerWatermark && (
        <div className="pointer-events-none select-none absolute -right-12 -bottom-12 opacity-10">
          <MatisseFlower size={136} />
        </div>
      )}
      <div className={`relative z-10 h-full ${innerClassName}`}>{children}</div>
    </motion.div>
  );
};
