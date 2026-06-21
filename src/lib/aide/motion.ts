/**
 * Motion presets — langage de mouvement « Chaleur numérique ».
 * Toutes les transitions du produit doivent passer par ici pour rester cohérentes.
 */
import type { Transition, Variants } from "motion/react";

export const ease = {
  outQuart: [0.25, 1, 0.5, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const duration = {
  fast: 0.15,
  base: 0.22,
  slow: 0.38,
};

export const spring = {
  soft: { type: "spring", stiffness: 260, damping: 28, mass: 0.9 } as Transition,
  snappy: { type: "spring", stiffness: 420, damping: 32, mass: 0.6 } as Transition,
  gentle: { type: "spring", stiffness: 180, damping: 26, mass: 1 } as Transition,
};

/** Apparition de page (fade + slight rise) */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.outQuart } },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast, ease: ease.outQuart } },
};

/** Liste en cascade (parent) */
export const staggerParent = (stagger = 0.04, delay = 0): Variants => ({
  initial: {},
  animate: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Enfant de liste en cascade */
export const staggerChild: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.outQuart } },
};

/** Lift au survol */
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: duration.fast, ease: ease.outQuart } },
  whileTap: { y: 0, scale: 0.98 },
};

/** Compteur qui s'incrémente */
export function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}
