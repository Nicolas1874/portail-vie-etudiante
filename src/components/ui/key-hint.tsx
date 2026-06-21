import { cn } from "@/lib/utils";

interface KeyHintProps {
  /** Raccourci, peut contenir + pour combos (ex: "⌘K", "Shift+N") */
  keys: string;
  label?: string;
  className?: string;
}

/**
 * Badge raccourci clavier. À afficher partout où une action a un raccourci —
 * la productivité clavier doit être visible, pas cachée.
 */
export function KeyHint({ keys, label, className }: KeyHintProps) {
  const parts = keys.split("+").map((s) => s.trim());
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      {label && <span>{label}</span>}
      <span className="inline-flex items-center gap-0.5">
        {parts.map((k, i) => (
          <kbd key={i} className="kbd">
            {k}
          </kbd>
        ))}
      </span>
    </span>
  );
}
