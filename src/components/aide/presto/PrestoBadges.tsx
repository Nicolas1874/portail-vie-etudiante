import { Badge } from "@/components/ui/badge";
import {
  PRESTO_STATUTS,
  PRESTO_STATUT_TONE,
  PRESTO_URGENCES,
  type PrestoStatut,
} from "@/lib/aide/presto-labels";
import { cn } from "@/lib/aide/utils";

export function PrestoStatutBadge({ statut }: { statut: PrestoStatut }) {
  return (
    <Badge variant="outline" className={cn("border", PRESTO_STATUT_TONE[statut])}>
      {PRESTO_STATUTS[statut]}
    </Badge>
  );
}

export function PrestoUrgenceBadge({ niveau }: { niveau: number }) {
  const u = PRESTO_URGENCES[niveau] ?? PRESTO_URGENCES[1];
  return (
    <Badge variant="outline" className={cn("border", u.tone)}>
      {u.label}
    </Badge>
  );
}
