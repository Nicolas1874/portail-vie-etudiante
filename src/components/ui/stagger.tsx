import { motion, type MotionProps } from "motion/react";
import type { ReactNode } from "react";
import { staggerParent, staggerChild } from "@/lib/aide/motion";

interface StaggerProps extends MotionProps {
  children: ReactNode;
  className?: string;
  /** Délai entre enfants en secondes (défaut 0.04s) */
  delay?: number;
  /** Délai initial avant le premier enfant */
  initialDelay?: number;
}

/** Conteneur d'animation en cascade pour listes/grilles. */
export function Stagger({ children, className, delay = 0.04, initialDelay = 0, ...rest }: StaggerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerParent(delay, initialDelay)}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends MotionProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className, ...rest }: StaggerItemProps) {
  return (
    <motion.div variants={staggerChild} className={className} {...rest}>
      {children}
    </motion.div>
  );
}
