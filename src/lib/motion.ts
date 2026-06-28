import type { Variants, Transition } from 'motion/react';

/**
 * Shared motion language for DebugToDeploy.
 * Import these instead of hand-rolling transition objects per component —
 * keeps animation feel consistent (same easing curve, same spring) across
 * the whole app instead of every page inventing its own timing.
 */

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 260, damping: 24, mass: 0.7 };
export const SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 400, damping: 28 };

/** Fade + rise — the default entrance for cards, panels, list items. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** Slightly larger rise, for hero/section-level elements. */
export const fadeUpLarge: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

/** Staggered container — wrap a list/grid in this, give children `fadeUp`. */
export const staggerContainer = (stagger = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Clay "press" — for buttons and tappable tiles. Use as whileHover/whileTap. */
export const clayHover = {
  whileHover: { y: -4, transition: SPRING_SOFT },
  whileTap: { scale: 0.96, y: 0, transition: { duration: 0.1 } },
};

/** Subtler clay press for nav items / small controls. */
export const clayHoverSm = {
  whileHover: { y: -2, transition: SPRING_SOFT },
  whileTap: { scale: 0.97, transition: { duration: 0.1 } },
};

/** Scale-in for modals, popovers, dropdowns. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.96, y: 6, transition: { duration: 0.18, ease: EASE_IN } },
};

/** Horizontal slide, used for step-by-step flows (onboarding, lab steps). */
export const slideX: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE_OUT } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.22, ease: EASE_IN } },
};

/** Number/stat count-up helper props for animated counters. */
export const countUpTransition: Transition = { duration: 1.1, ease: EASE_OUT };

/** Icon micro-interaction — small bounce for badges/achievements. */
export const iconPop: Variants = {
  hidden: { scale: 0, rotate: -8 },
  visible: { scale: 1, rotate: 0, transition: SPRING_SOFT },
};
