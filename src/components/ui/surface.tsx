import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Niveau d'élévation visuelle */
  level?: 1 | 2 | 3;
  /** Active l'effet hover (lift + ombre) */
  interactive?: boolean;
  /** Padding par défaut */
  padded?: boolean;
}

/**
 * Surface — bloc de contenu stratifié.
 * Remplace progressivement <Card> pour les nouveaux écrans.
 */
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, level = 1, interactive, padded, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border transition-all duration-200",
          level === 1 && "bg-card border-border shadow-[var(--shadow-sm)]",
          level === 2 && "bg-surface-2 border-border/70 shadow-[var(--shadow-xs)]",
          level === 3 && "bg-surface-3 border-border/50",
          interactive && "hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 cursor-pointer",
          padded && "p-5",
          className,
        )}
        {...props}
      />
    );
  },
);
Surface.displayName = "Surface";
