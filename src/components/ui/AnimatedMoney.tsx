import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { formatCentsToBRL } from '../../lib/money';

interface AnimatedMoneyProps {
  cents: number;
  className?: string;
  prefix?: string;
}

/**
 * Exibe valores monetários em centavos com contagem suave (240ms) ao carregar ou mudar,
 * respeitando `prefers-reduced-motion`.
 */
export const AnimatedMoney: React.FC<AnimatedMoneyProps> = ({
  cents,
  className = '',
  prefix = ''
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [displayCents, setDisplayCents] = useState(cents);
  const prevCentsRef = useRef(cents);

  useEffect(() => {
    if (shouldReduceMotion || prevCentsRef.current === cents) {
      setDisplayCents(cents);
      prevCentsRef.current = cents;
      return;
    }

    const startValue = prevCentsRef.current;
    const endValue = cents;
    const durationMs = 240;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayCents(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevCentsRef.current = endValue;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cents, shouldReduceMotion]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatCentsToBRL(displayCents)}
    </span>
  );
};
