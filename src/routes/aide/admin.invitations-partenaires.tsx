import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Copy, Mail } from "lucide-react";
import { formatDateTime } from "@/lib/labels";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const Route = createFileRoute("/aide/admin/invitations-partenaires")({
  component: InvitationsPartenaires,
});

function InvitationsPartenaires() {
  const { isAdmin, hasRole } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [i, s] = await Promise.all([
      supabase
        .from("partenaire_invitations")
        .select("*, partenaire_structures(nom)")
        .order("created_at", { ascending: false }),
      supabase.from("partenaire_structures").select("id, nom").order("nom"),
    ]);
    setItems(i.data ?? []);
    setStructures(s.data ?? []);
    setLoading(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("partenaire_invitations")
      .delete()
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Invitation supprimée");
      refresh();
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (!isAdmin && !hasRole("superviseur")) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Accès réservé aux administrateurs et superviseurs.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Invitations partenaires"
        description="Créez un lien magique d'invitation pour qu'un partenaire crée son compte."
        actions={<NewInvitationDialog structures={structures} onCreated={refresh} />}
      />
      <div className="p-6 space-y-2">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Chargement…</div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucune invitation.
            </CardContent>
          </Card>
        ) : (
          items.map((it) => {
            const url = `${window.location.origin}/invitation/${it.token}`;
            const expired = new Date(it.expire_le) < new Date();
            const status = it.consume_le
              ? { label: "Acceptée", variant: "default" as const }
              : expired
                ? { label: "Expirée", variant: "outline" as const }
                : { label: "En attente", variant: "secondary" as const };
            return (
              <Card key={it.id}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">
                        {it.prenom} {it.nom} — {it.email}
                      </div>
                      {it.partenaire_structures?.nom && (
                        <div className="text-xs text-muted-foreground">
                          {it.partenaire_structures.nom}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Créée {formatDateTime(it.created_at)} · expire{" "}
                        {formatDateTime(it.expire_le)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <ConfirmDelete
                        title="Supprimer l'invitation ?"
                        description="Le lien d'invitation deviendra inutilisable."
                        onConfirm={() => remove(it.id)}
                      />
                    </div>
                  </div>
                  {!it.consume_le && !expired && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                      <span className="truncate flex-1 font-mono">{url}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          toast.success("Lien copié");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function NewInvitationDialog({
  structures,
  onCreated,
}: {
  structures: any[];
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [structureId, setStructureId] = useState<string>("__none__");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      toast.error("Email requis");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("partenaire_invitations").insert({
      email: email.trim().toLowerCase(),
      prenom: prenom.trim() || null,
      nom: nom.trim() || null,
      structure_partenaire_id: structureId === "__none__" ? null : structureId,
      invite_par: profile?.id,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Invitation créée");
      setOpen(false);
      setEmail("");
      setPrenom("");
      setNom("");
      setStructureId("__none__");
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle invitation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle invitation partenaire</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prénom</Label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Structure partenaire</Label>
            <Select value={structureId} onValueChange={setStructureId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucune</SelectItem>
                {structures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            Créer l'invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
