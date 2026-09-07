import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  effect?: 'fade' | 'slide-left' | 'slide-right' | 'zoom';
  duration?: number;
  className?: string;
}

const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  'slide-left': {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  },
  'slide-right': {
    initial: { opacity: 0, x: -40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 40 },
  },
  zoom: {
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.04 },
  },
};

const PageTransition = ({
  children,
  effect = 'fade',
  duration = 0.3,
  className = '',
}: PageTransitionProps) => {
  const location = useLocation();

  // Acessibilidade: respeitar preferência reduced-motion do sistema
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const v = variants[effect];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={reducedMotion ? false : v.initial}
        animate={reducedMotion ? false : v.animate}
        exit={reducedMotion ? false : v.exit}
        transition={{
          duration: reducedMotion ? 0 : duration,
          ease: [0.22, 1, 0.36, 1], // custom easing: cepat no início, lento no fim
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export { PageTransition };
export type { PageTransitionProps };
