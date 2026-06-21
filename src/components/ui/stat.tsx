import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { easeOutQuart } from "@/lib/aide/motion";
import type { LucideIcon } from "lucide-react";

interface StatProps {
  label: string;
  value: number | string;
  /** Variation par rapport à période précédente (ex: +12, -3) */
  delta?: number;
  /** Suffixe (€, %, etc.) */
  suffix?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
  /** Désactive l'animation de comptage */
  static?: boolean;
}

/** Carte de statistique avec compteur animé. */
export function Stat({
  label,
  value,
  delta,
  suffix,
  icon: Icon,
  tone = "default",
  static: isStatic,
}: StatProps) {
  const numeric = typeof value === "number" ? value : null;
  const [display, setDisplay] = useState<number | string>(
    numeric != null && !isStatic ? 0 : value,
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (numeric == null || isStatic || startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    const target = numeric;
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = easeOutQuart(t);
      setDisplay(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric, isStatic]);

  const toneRing = {
    default: "from-muted/60 to-transparent",
    primary: "from-primary/15 to-transparent",
    success: "from-success/15 to-transparent",
    warning: "from-warning/20 to-transparent",
    destructive: "from-destructive/15 to-transparent",
  }[tone];

  const iconColor = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5",
        "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", toneRing)} />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {Icon && <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />}
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-semibold tabular text-foreground">
            {display}
          </span>
          {suffix && (
            <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
          )}
        </div>
        {delta != null && (
          <div className="mt-1.5 text-xs tabular">
            <span
              className={cn(
                "font-medium",
                delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
            <span className="text-muted-foreground ml-1">vs période précédente</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
