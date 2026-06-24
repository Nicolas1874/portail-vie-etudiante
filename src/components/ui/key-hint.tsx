import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface KeyHintProps extends HTMLAttributes<HTMLSpanElement> {
  keys: string | string[];
  label?: string;
}

export function KeyHint({ keys, label, className }: KeyHintProps) {
  const k = Array.isArray(keys) ? keys : [keys];
  return (
    <span
      className={cn(
        "inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100",
        className,
      )}
    >
      {k.map((key) => (
        <kbd key={key} className="kbd">
          {key}
        </kbd>
      ))}
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}
