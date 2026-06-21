import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { GraduationCap, Plus, ExternalLink, Copy, Users } from "lucide-react";
import { formatDateTime } from "@/lib/labels";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const Route = createFileRoute("/_app/ateliers")({
  component: AteliersPage,
});

function AteliersPage() {
  const { profile, isAdmin, refresh: refreshAuth } = useAuth();
  const [ateliers, setAteliers] = useState<any[]>([]);
  const [sessionsByAtelier, setSessionsByAtelier] = useState<Record<string, any[]>>({});
  const [lieuxConnus, setLieuxConnus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [a, s] = await Promise.all([
      supabase.from("ateliers").select("*").order("created_at", { ascending: false }),
      supabase
        .from("ateliers_sessions")
        .select("*, ateliers_inscriptions(id, statut)")
        .order("date_debut"),
    ]);
    setAteliers(a.data ?? []);
    const map: Record<string, any[]> = {};
    const lieux = new Set<string>();
    (s.data ?? []).forEach((sess: any) => {
      (map[sess.atelier_id] ??= []).push(sess);
      if (sess.lieu) lieux.add(sess.lieu);
    });
    setSessionsByAtelier(map);
    setLieuxConnus(Array.from(lieux).sort());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    refreshAuth();
  }, []);

  return (
    <div>
      <PageHeader
        title="Ateliers"
        description="Créez des ateliers, planifiez des sessions et partagez le lien d'inscription public."
        actions={<NewAtelierDialog onCreated={refresh} structureId={profile?.structure_id} />}
      />
      <div className="p-6 space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Chargement…</div>
        ) : ateliers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucun atelier pour le moment.
            </CardContent>
          </Card>
        ) : (
          ateliers.map((a) => (
            <AtelierCard
              key={a.id}
              atelier={a}
              sessions={sessionsByAtelier[a.id] ?? []}
              lieuxConnus={lieuxConnus}
              onChanged={refresh}
              canEdit={isAdmin || a.structure_id === profile?.structure_id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AtelierCard({
  atelier,
  sessions,
  lieuxConnus,
  onChanged,
  canEdit,
}: {
  atelier: any;
  sessions: any[];
  lieuxConnus: string[];
  onChanged: () => void;
  canEdit: boolean;
}) {
  const [showInscrits, setShowInscrits] = useState<string | null>(null);

  const togglePublie = async () => {
    const { error } = await supabase
      .from("ateliers")
      .update({ publie: !atelier.publie })
      .eq("id", atelier.id);
    if (error) toast.error(error.message);
    else onChanged();
  };

  const removeAtelier = async () => {
    await supabase.from("ateliers_inscriptions").delete().in(
      "session_id",
      sessions.map((s: any) => s.id),
    );
    await supabase.from("ateliers_sessions").delete().eq("atelier_id", atelier.id);
    const { error } = await supabase.from("ateliers").delete().eq("id", atelier.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Atelier supprimé");
      onChanged();
    }
  };

  const removeSession = async (sessionId: string) => {
    await supabase.from("ateliers_inscriptions").delete().eq("session_id", sessionId);
    const { error } = await supabase.from("ateliers_sessions").delete().eq("id", sessionId);
    if (error) toast.error(error.message);
    else {
      toast.success("Session supprimée");
      onChanged();
    }
  };

  const publicUrl = `${window.location.origin}/inscription-atelier/${atelier.id}`;

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{atelier.titre}</h3>
              {atelier.publie ? (
                <Badge className="bg-success text-success-foreground text-[10px]">Publié</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Brouillon</Badge>
              )}
            </div>
            {atelier.description && (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {atelier.description}
              </p>
            )}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">Publié</span>
              <Switch checked={atelier.publie} onCheckedChange={togglePublie} />
              <ConfirmDelete
                title={`Supprimer « ${atelier.titre} » ?`}
                description="Toutes les sessions et inscriptions liées seront aussi supprimées. Action irréversible."
                onConfirm={removeAtelier}
              />
            </div>
          )}
        </div>

        {atelier.publie && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
            <span className="truncate flex-1 font-mono">{publicUrl}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success("Lien copié");
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sessions ({sessions.length})
            </span>
            {canEdit && (
              <NewSessionDialog
                atelierId={atelier.id}
                lieuxConnus={lieuxConnus}
                onCreated={onChanged}
              />
            )}
          </div>
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Aucune session planifiée.</p>
          ) : (
            <div className="space-y-1.5">
              {sessions.map((s) => {
                const inscrits = s.ateliers_inscriptions?.filter(
                  (i: any) => i.statut === "inscrit",
                ).length ?? 0;
                const total = s.ateliers_inscriptions?.length ?? 0;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted"
                  >
                    <div>
                      <div className="font-medium">{formatDateTime(s.date_debut)}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.lieu ?? "—"} · {formatDuree(s.duree_minutes)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {inscrits} / {s.quota}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowInscrits(s.id)}
                        disabled={total === 0}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Inscrits
                      </Button>
                      {canEdit && (
                        <ConfirmDelete
                          title="Supprimer la session ?"
                          description={`Les inscriptions à la session du ${formatDateTime(s.date_debut)} seront aussi supprimées.`}
                          onConfirm={() => removeSession(s.id)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
      {showInscrits && (
        <InscritsDialog sessionId={showInscrits} onClose={() => setShowInscrits(null)} />
      )}
    </Card>
  );
}

function formatDuree(min: number) {
  const h = Math.floor((min ?? 0) / 60);
  const m = (min ?? 0) % 60;
  if (h && m) return `${h} h ${m.toString().padStart(2, "0")}`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function InscritsDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ateliers_inscriptions")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at");
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [sessionId]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inscriptions à la session</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Aucune inscription pour le moment.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-2 py-2">Nom / Prénom</th>
                <th className="text-left px-2 py-2">N° étudiant</th>
                <th className="text-left px-2 py-2">Email</th>
                <th className="text-left px-2 py-2">Téléphone</th>
                <th className="text-left px-2 py-2">Statut</th>
                <th className="text-center px-2 py-2">Mailing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-2 font-medium">{r.prenom} {r.nom}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.numero_etudiant ?? "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.email ?? "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.telephone ?? "—"}</td>
                  <td className="px-2 py-2">
                    <Badge variant={r.statut === "inscrit" ? "default" : "outline"} className="text-[10px]">
                      {r.statut}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {r.mailing_optin ? (
                      <Badge className="bg-success/15 text-success border-success/30 border text-[10px]" variant="outline">
                        Oui
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">non</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewAtelierDialog({
  onCreated,
  structureId,
}: {
  onCreated: () => void;
  structureId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!titre.trim()) {
      toast.error("Titre requis");
      return;
    }
    let sid = structureId;
    if (!sid) {
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("structure_id")
          .eq("id", u.user.id)
          .maybeSingle();
        sid = p?.structure_id ?? null;
      }
    }
    if (!sid) {
      toast.error("Vous devez être rattaché à une structure (Paramètres → Structure)");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ateliers").insert({
      titre: titre.trim(),
      description: description.trim() || null,
      structure_id: sid,
      publie: false,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Atelier créé");
      setOpen(false);
      setTitre("");
      setDescription("");
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel atelier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel atelier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewSessionDialog({
  atelierId,
  lieuxConnus,
  onCreated,
}: {
  atelierId: string;
  lieuxConnus: string[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dateDebut, setDateDebut] = useState("");
  const [heures, setHeures] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [lieu, setLieu] = useState("");
  const [quota, setQuota] = useState("10");
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => {
    const q = lieu.trim().toLowerCase();
    if (!q) return [];
    return lieuxConnus
      .filter((l) => l.toLowerCase().includes(q) && l.toLowerCase() !== q)
      .slice(0, 5);
  }, [lieu, lieuxConnus]);

  const submit = async () => {
    if (!dateDebut) {
      toast.error("Date requise");
      return;
    }
    const duree = (Number(heures) || 0) * 60 + (Number(minutes) || 0);
    if (duree <= 0) {
      toast.error("Durée invalide");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ateliers_sessions").insert({
      atelier_id: atelierId,
      date_debut: new Date(dateDebut).toISOString(),
      duree_minutes: duree,
      lieu: lieu.trim() || null,
      quota: Number(quota) || 10,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Session créée");
      setOpen(false);
      setDateDebut("");
      setLieu("");
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3 w-3 mr-1" />
          Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle session</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Date et heure</Label>
            <Input
              type="datetime-local"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Heures</Label>
              <Input
                type="number"
                min={0}
                value={heures}
                onChange={(e) => setHeures(e.target.value)}
              />
            </div>
            <div>
              <Label>Minutes</Label>
              <Input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div>
              <Label>Quota</Label>
              <Input
                type="number"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Lieu</Label>
            <Input
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              list="lieux-connus"
              placeholder="Tapez ou choisissez un lieu déjà utilisé"
            />
            <datalist id="lieux-connus">
              {lieuxConnus.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
            {suggestions.length > 0 && (
              <div className="mt-1 border rounded text-xs">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setLieu(s)}
                    className="block w-full text-left px-2 py-1 hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
