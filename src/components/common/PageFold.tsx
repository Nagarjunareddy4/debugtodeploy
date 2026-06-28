import React from 'react';
import { motion, type Variants } from 'motion/react';
import { useLocation } from 'react-router-dom';

/**
 * PageFold — macOS-style window open/close transition.
 *
 * Mimics the genie/fold effect: the incoming page unfolds open from a
 * slightly collapsed, perspective-skewed state (like a window restoring
 * from the Dock), and the outgoing page folds shut the same way in reverse.
 *
 * Usage: wrap a <Routes> block's matched element, keyed by location.pathname,
 * inside an <AnimatePresence mode="wait"> in the parent.
 */

const foldVariants: Variants = {
  initial: {
    opacity: 0,
    scaleY: 0.92,
    scaleX: 0.985,
    y: 18,
    transformOrigin: 'top center',
    filter: 'blur(2px)',
  },
  animate: {
    opacity: 1,
    scaleY: 1,
    scaleX: 1,
    y: 0,
    transformOrigin: 'top center',
    filter: 'blur(0px)',
    transition: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
      opacity: { duration: 0.28 },
    },
  },
  exit: {
    opacity: 0,
    scaleY: 0.94,
    scaleX: 0.99,
    y: -10,
    transformOrigin: 'top center',
    filter: 'blur(1.5px)',
    transition: {
      duration: 0.22,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export default function PageFold({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      variants={foldVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ perspective: 1200, willChange: 'transform, opacity, filter' }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
