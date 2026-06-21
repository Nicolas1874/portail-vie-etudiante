import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChampPerso, DispositifPartenairePermission } from "@/lib/aide/coups-pouce-types";
import { PartenairePreviewDialog } from "./PartenairePreviewDialog";

const PERMS: { key: keyof DispositifPartenairePermission; label: string }[] = [
  { key: "peut_voir", label: "Voir les coups de pouce" },
  { key: "peut_confirmer_passage", label: "Confirmer le passage / utilisation" },
  { key: "peut_remplir_fiche", label: "Remplir les champs de la fiche" },
  { key: "peut_imprimer", label: "Imprimer la fiche" },
  { key: "peut_changer_statut", label: "Changer le statut (accordé/refusé/clôturé)" },
];

export function DispositifPartenairesEditor({
  value,
  onChange,
  dispositifLibelle = "ce dispositif",
  champs = [],
}: {
  value: DispositifPartenairePermission[];
  onChange: (v: DispositifPartenairePermission[]) => void;
  dispositifLibelle?: string;
  champs?: ChampPerso[];
}) {
  const [structures, setStructures] = useState<any[]>([]);
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("partenaire_structures")
      .select("id, nom")
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => setStructures(data ?? []));
  }, []);

  const add = () => {
    onChange([
      ...value,
      {
        structure_partenaire_id: "",
        peut_voir: true,
        peut_confirmer_passage: false,
        peut_remplir_fiche: false,
        peut_imprimer: true,
        peut_changer_statut: false,
      },
    ]);
  };

  const update = (i: number, patch: Partial<DispositifPartenairePermission>) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  const used = new Set(value.map((v) => v.structure_partenaire_id).filter(Boolean));

  return (
    <div className="space-y-2">
      {value.map((p, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Label className="text-xs">Structure partenaire</Label>
              <Select
                value={p.structure_partenaire_id}
                onValueChange={(v) => update(i, { structure_partenaire_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {structures
                    .filter(
                      (s) =>
                        s.id === p.structure_partenaire_id || !used.has(s.id),
                    )
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 mt-5"
              type="button"
              disabled={!p.structure_partenaire_id}
              onClick={() => setPreview(i)}
              title="Aperçu de ce que verra cette structure"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Aperçu
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 text-destructive mt-5"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
            {PERMS.map((perm) => (
              <label
                key={perm.key}
                className="flex items-center gap-2 text-xs cursor-pointer"
              >
                <Switch
                  checked={!!(p as any)[perm.key]}
                  onCheckedChange={(v) => update(i, { [perm.key]: v } as any)}
                />
                {perm.label}
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} type="button">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Ajouter un partenaire
      </Button>
      {structures.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aucune structure partenaire active. Créez-en une dans Admin → Partenaires.
        </p>
      )}
      {preview !== null && value[preview] && (
        <PartenairePreviewDialog
          open={preview !== null}
          onClose={() => setPreview(null)}
          dispositifLibelle={dispositifLibelle}
          structureNom={
            structures.find(
              (s) => s.id === value[preview]!.structure_partenaire_id,
            )?.nom ?? "structure"
          }
          permissions={value[preview]!}
          champs={champs}
        />
      )}
    </div>
  );
}
