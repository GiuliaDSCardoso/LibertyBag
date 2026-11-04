let activeModalsCount = 0;

/**
 * Bloqueia a rolagem do corpo da página (body/html) enquanto um ou mais modais estiverem abertos,
 * impedindo que a página de trás se mova ao rolar o conteúdo do modal no celular ou computador.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  activeModalsCount++;
  if (activeModalsCount === 1) {
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'contain';
  }
  return () => {
    activeModalsCount = Math.max(0, activeModalsCount - 1);
    if (activeModalsCount === 0) {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    }
  };
}
