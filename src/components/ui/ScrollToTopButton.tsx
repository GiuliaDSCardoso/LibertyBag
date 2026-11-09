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
          className="fixed bottom-20 md:bottom-28 left-3.5 sm:left-5 md:left-auto md:right-28 z-40 w-11 h-11 md:w-12 md:h-12 rounded-full bg-blue-royal dark:bg-sun text-white dark:text-blue-deep shadow-[0_4px_16px_rgba(35,70,200,0.35)] dark:shadow-[0_4px_16px_rgba(248,213,107,0.35)] border-2 border-white dark:border-[#0D152D] flex items-center justify-center cursor-pointer transition-all hover:bg-blue-deep dark:hover:bg-orange focus:outline-none focus:ring-4 focus:ring-sun/50 hover-lift"
        >
          <ArrowUp size={22} strokeWidth={2.5} aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
