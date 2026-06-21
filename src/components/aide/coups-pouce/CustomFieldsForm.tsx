import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChampPerso } from "@/lib/aide/coups-pouce-types";

export function CustomFieldsForm({
  champs,
  values,
  onChange,
  audience = "guichetier",
  readOnly = false,
}: {
  champs: ChampPerso[];
  values: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  audience?: "guichetier" | "partenaire";
  readOnly?: boolean;
}) {
  const set = (k: string, v: any) => onChange({ ...values, [k]: v });
  const visible = champs.filter((c) => {
    const r = c.remplissable_par ?? "guichetier";
    if (audience === "guichetier") return r !== "partenaire";
    return r !== "guichetier";
  });
  if (visible.length === 0) return null;
  return (
    <div className="space-y-3">
      {visible.map((c) => {
        const v = values[c.key];
        const lbl = (
          <Label className="text-xs">
            {c.label}
            {c.required && <span className="text-destructive"> *</span>}
          </Label>
        );
        if (readOnly) {
          return (
            <div key={c.key}>
              {lbl}
              <div className="text-sm py-1.5">
                {c.type === "checkbox"
                  ? v
                    ? "Oui"
                    : "Non"
                  : v != null && v !== ""
                    ? String(v)
                    : "—"}
              </div>
            </div>
          );
        }
        return (
          <div key={c.key}>
            {lbl}
            {c.type === "textarea" ? (
              <Textarea
                value={v ?? ""}
                onChange={(e) => set(c.key, e.target.value)}
                placeholder={c.placeholder}
                rows={3}
              />
            ) : c.type === "number" ? (
              <Input
                type="number"
                value={v ?? ""}
                onChange={(e) =>
                  set(c.key, e.target.value === "" ? null : Number(e.target.value))
                }
              />
            ) : c.type === "date" ? (
              <Input
                type="date"
                value={v ?? ""}
                onChange={(e) => set(c.key, e.target.value)}
              />
            ) : c.type === "select" ? (
              <Select value={v ?? ""} onValueChange={(val) => set(c.key, val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {(c.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : c.type === "checkbox" ? (
              <div className="pt-1">
                <Switch checked={!!v} onCheckedChange={(val) => set(c.key, val)} />
              </div>
            ) : (
              <Input
                value={v ?? ""}
                onChange={(e) => set(c.key, e.target.value)}
                placeholder={c.placeholder}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
