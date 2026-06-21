import { AnimatePresence, motion } from "motion/react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CommandHintProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Bandeau contextuel discret en bas de l'écran qui suggère les raccourcis
 * disponibles. Type Linear / Arc.
 */
export function CommandHint({ show, children, className }: CommandHintProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-40",
            "flex items-center gap-3 px-3.5 py-2 rounded-full",
            "bg-foreground/95 text-background backdrop-blur-md",
            "text-xs font-medium shadow-[var(--shadow-lg)]",
            "border border-foreground/10",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
