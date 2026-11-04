import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      // Exibe quando a rolagem ultrapassar 280px do topo
      const scrollY =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setIsVisible(scrollY > 280);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Checagem inicial
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? 'auto' : 'smooth'
    });
    // Garante rolagem em navegadores antigos ou containers body/html
    if (document.documentElement) {
      document.documentElement.scrollTo?.({
        top: 0,
        behavior: shouldReduceMotion ? 'auto' : 'smooth'
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          aria-label="Voltar ao topo da página"
          title="Voltar ao topo"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 12 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          whileHover={shouldReduceMotion ? {} : { scale: 1.08 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 w-12 h-12 rounded-full bg-blue-royal dark:bg-sun text-white dark:text-blue-deep shadow-soft border-2 border-white dark:border-blue-deep flex items-center justify-center cursor-pointer transition-colors hover:bg-blue-deep dark:hover:bg-orange focus:outline-none focus:ring-4 focus:ring-sun/50"
        >
          <ArrowUp size={22} strokeWidth={2.5} aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
