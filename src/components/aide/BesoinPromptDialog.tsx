import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Prompt, PromptResponses } from "@/lib/besoins-correspondance";

/**
 * Popup qui pose les questions liées à un besoin source.
 * - yes_no : 1 case "oui" par question
 * - multi_choice : N cases (au moins une, ou "Aucun")
 */
export function BesoinPromptDialog({
  open,
  prompts,
  besoinLibelle,
  initial,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  prompts: Prompt[];
  besoinLibelle: string;
  initial?: PromptResponses;
  onCancel: () => void;
  onConfirm: (resp: PromptResponses) => void;
}) {
  const [resp, setResp] = useState<PromptResponses>({});

  useEffect(() => {
    if (open) setResp(initial ?? {});
  }, [open, initial]);

  if (!open) return null;

  const setYesNo = (label: string, v: boolean) =>
    setResp((r) => ({ ...r, [label]: v }));
  const toggleMulti = (label: string, mid: string) =>
    setResp((r) => {
      const cur = Array.isArray(r[label]) ? (r[label] as string[]) : [];
      const next = cur.includes(mid) ? cur.filter((x) => x !== mid) : [...cur, mid];
      return { ...r, [label]: next };
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Précisions — {besoinLibelle}</DialogTitle>
          <DialogDescription>
            Vos réponses peuvent compter ce besoin dans d'autres publics
            (PIJ / PAEJ) en plus du public principal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {prompts.map((p) => (
            <div key={p.label} className="space-y-2">
              <Label className="font-medium">{p.label}</Label>
              {p.mode === "yes_no" ? (
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={resp[p.label] === true}
                      onCheckedChange={(v) => setYesNo(p.label, v === true)}
                    />
                    Oui
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={resp[p.label] === false}
                      onCheckedChange={(v) => setYesNo(p.label, !(v === true))}
                    />
                    Non
                  </label>
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  {p.options.map((o) => {
                    const arr = Array.isArray(resp[p.label])
                      ? (resp[p.label] as string[])
                      : [];
                    const checked = arr.includes(o.mirror_besoin_id);
                    return (
                      <label
                        key={o.mirror_besoin_id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            toggleMulti(p.label, o.mirror_besoin_id)
                          }
                        />
                        {o.label}
                      </label>
                    );
                  })}
                  <p className="text-xs text-muted-foreground pt-1">
                    Ne cochez rien si « aucun ».
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} type="button">
            Annuler
          </Button>
          <Button onClick={() => onConfirm(resp)} type="button">
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
