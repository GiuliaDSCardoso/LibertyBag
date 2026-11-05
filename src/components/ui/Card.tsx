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
 * - Padding interno: 16px–20px no celular, 24px no desktop (compacto e elegante)
 * - Cantos grandes arredondados (24px–28px)
 * - Altura natural (abraça o conteúdo sem sobras de espaço vazias)
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
    framed: 'bg-blue-royal p-1.5 sm:p-2 text-blue-deep shadow-soft rounded-card-lg'
  };

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

  const isExplicitFullHeight = className.includes('h-full');

  if (variant === 'framed') {
    return (
      <motion.div
        {...motionProps}
        className={`${variantClasses.framed} ${onClick ? 'cursor-pointer hover-lift' : ''} ${className}`}
        onClick={onClick}
      >
        <div
          className={`bg-cream dark:bg-blue-deep dark:text-cream rounded-[20px] p-4 sm:p-5 lg:p-6 relative overflow-hidden ${
            isExplicitFullHeight ? 'h-full' : ''
          }`}
        >
          {withFlowerWatermark && (
            <div className="pointer-events-none select-none absolute -right-12 -bottom-12 opacity-10">
              <MatisseFlower size={136} />
            </div>
          )}
          <div className="relative z-10">{children}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...motionProps}
      onClick={onClick}
      className={`rounded-card p-4 sm:p-5 lg:p-6 relative overflow-hidden transition-colors ${
        onClick ? 'cursor-pointer hover-lift' : ''
      } ${variantClasses[variant]} ${className}`}
    >
      {withFlowerWatermark && (
        <div className="pointer-events-none select-none absolute -right-12 -bottom-12 opacity-10">
          <MatisseFlower size={136} />
        </div>
      )}
      <div className={`relative z-10 ${isExplicitFullHeight ? 'h-full' : ''}`}>{children}</div>
    </motion.div>
  );
};
