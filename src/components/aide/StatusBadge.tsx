import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANTS: Record<string, string> = {
  // Statuts demandes
  nouvelle: "bg-info/10 text-info border-info/30",
  en_cours: "bg-warning/15 text-warning-foreground border-warning/40",
  orientee: "bg-accent text-accent-foreground border-border",
  cloturee: "bg-success/10 text-success border-success/30",
  abandonnee: "bg-muted text-muted-foreground border-border",
  // Statuts RDV
  planifie: "bg-info/10 text-info border-info/30",
  confirme: "bg-success/10 text-success border-success/30",
  realise: "bg-success/15 text-success border-success/40",
  annule: "bg-destructive/10 text-destructive border-destructive/30",
  absent: "bg-warning/15 text-warning-foreground border-warning/40",
  // Priorités
  basse: "bg-muted text-muted-foreground border-border",
  normale: "bg-secondary text-secondary-foreground border-border",
  haute: "bg-warning/15 text-warning-foreground border-warning/40",
  urgente: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", VARIANTS[value] ?? "bg-muted text-muted-foreground")}
    >
      {label}
    </Badge>
  );
}
