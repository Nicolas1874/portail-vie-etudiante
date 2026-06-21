import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { getRoleSwitchStorageKey } from "@/lib/role-switch";

/**
 * Permet à un admin de se mettre temporairement à la place d'un partenaire
 * (utilisateur partenaire) rattaché à une structure choisie. La bascule est
 * restaurable depuis le bandeau jaune en haut de l'application.
 */
export function ImpersonateYtineraireButton() {
  const { profile, isAdmin, roles, refresh } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [structures, setStructures] = useState<{ id: string; nom: string }[]>(
    [],
  );
  const [spId, setSpId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("partenaire_structures")
      .select("id, nom")
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => setStructures((data as any) ?? []));
  }, [open]);

  if (!isAdmin) return null;

  const start = async () => {
    if (!spId || !profile?.id) {
      toast.error("Choisissez une structure partenaire");
      return;
    }
    setBusy(true);

    // Mémorise localement avant la bascule pour que le bandeau s'affiche tout de suite
    const storageKey = getRoleSwitchStorageKey(profile.id);
    if (storageKey && typeof window !== "undefined") {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          roles,
          structure_id: profile.structure_id,
        }),
      );
    }

    const { error } = await supabase.rpc("admin_impersonate_partenaire", {
      _structure_partenaire_id: spId,
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    toast.success("Vous êtes maintenant en mode partenaire");
    await refresh();
    setBusy(false);
    setOpen(false);
    navigate({ to: "/partenaire" });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        Se mettre à la place d'un partenaire
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aperçu en tant que partenaire</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Vous serez basculé sur un profil partenaire de la structure choisie.
              Un bandeau orange en haut de l'écran permettra de revenir à votre
              profil administrateur à tout moment.
            </p>
          </DialogHeader>

          <div className="py-2">
            <Label>Structure partenaire</Label>
            <Select value={spId} onValueChange={setSpId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une structure…" />
              </SelectTrigger>
              <SelectContent>
                {structures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {structures.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Aucune structure partenaire active. Créez-en une dans Admin →
                partenaires.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={start} disabled={busy || !spId}>
              Lancer l'aperçu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
