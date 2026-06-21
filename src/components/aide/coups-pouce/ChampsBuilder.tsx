import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { ChampPerso, TYPES_CHAMP, ChampType } from "@/lib/aide/coups-pouce-types";

export function ChampsBuilder({
  value,
  onChange,
}: {
  value: ChampPerso[];
  onChange: (v: ChampPerso[]) => void;
}) {
  const update = (i: number, patch: Partial<ChampPerso>) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () =>
    onChange([
      ...value,
      {
        key: `champ_${value.length + 1}`,
        label: "Nouveau champ",
        type: "text" as ChampType,
        remplissable_par: "guichetier",
      },
    ]);

  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="border rounded-md p-3 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Champ #{i + 1}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(i, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(i, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Libellé</Label>
              <Input
                value={c.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Clé interne</Label>
              <Input
                value={c.key}
                onChange={(e) =>
                  update(i, {
                    key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={c.type}
                onValueChange={(v) => update(i, { type: v as ChampType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPES_CHAMP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Rempli par</Label>
              <Select
                value={c.remplissable_par ?? "guichetier"}
                onValueChange={(v) => update(i, { remplissable_par: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guichetier">Guichetier (à la création)</SelectItem>
                  <SelectItem value="partenaire">Partenaire (à la remise)</SelectItem>
                  <SelectItem value="les_deux">Les deux</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {c.type === "select" && (
            <div>
              <Label className="text-xs">Options (une par ligne)</Label>
              <Input
                value={(c.options ?? []).join(", ")}
                placeholder="Ex. Neuf, Bon, Moyen"
                onChange={(e) =>
                  update(i, {
                    options: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={!!c.required}
              onCheckedChange={(v) => update(i, { required: v })}
            />
            <Label className="text-xs">Obligatoire</Label>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} type="button">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Ajouter un champ
      </Button>
    </div>
  );
}
