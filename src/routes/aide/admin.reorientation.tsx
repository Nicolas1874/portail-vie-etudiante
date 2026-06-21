/**
 * Admin — Paramétrage de la réorientation :
 *   - Onglet "Services / partenaires" : catalogue (coordonnées, message, horaires…)
 *   - Onglet "Modèle de mail" : parties fixes du mail (objet, intro, conclusion, signature, mentions)
 */
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, Info } from "lucide-react";

export const Route = createFileRoute("/_app/admin/reorientation")({
  component: AdminReorientationPage,
});

function AdminReorientationPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="p-8">Chargement…</div>;
  if (!isAdmin) return <Navigate to="/" />;
  return (
    <div>
      <PageHeader
        title="Réorientation — paramétrage"
        description="Gérez le catalogue des services partenaires et le modèle de mail envoyé aux usagers réorientés."
      />
      <div className="p-6">
        <Tabs defaultValue="services" className="space-y-4">
          <TabsList>
            <TabsTrigger value="services">Catalogue services</TabsTrigger>
            <TabsTrigger value="mail">Modèle de mail</TabsTrigger>
          </TabsList>
          <TabsContent value="services"><ServicesTab /></TabsContent>
          <TabsContent value="mail"><MailTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ServicesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const refresh = () => supabase
    .from("reorientation_services" as never)
    .select("*")
    .order("ordre")
    .order("nom")
    .then(({ data }) => setRows((data as any[]) ?? []));

  useEffect(() => { void refresh(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce service du catalogue ?")) return;
    const { error } = await supabase.from("reorientation_services" as never).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); void refresh(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Nouveau service</Button>
          </DialogTrigger>
          <ServiceFormDialog initial={editing} onSaved={() => { setOpen(false); setEditing(null); void refresh(); }} />
        </Dialog>
      </div>

      {rows.length === 0 && <Card className="p-12 text-center text-muted-foreground">Aucun service paramétré.</Card>}

      <div className="grid gap-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold">{r.nom}</h3>
                  {r.categorie && <span className="text-xs px-2 py-0.5 rounded bg-muted">{r.categorie}</span>}
                  {!r.actif && <span className="text-xs text-destructive">Inactif</span>}
                </div>
                {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                  {r.telephone && <span>📞 {r.telephone}</span>}
                  {r.email && <span>✉️ {r.email}</span>}
                  {r.adresse && <span>📍 {r.adresse}</span>}
                  {r.horaires && <span>🕒 {r.horaires}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" onClick={() => { setEditing(r); setOpen(true); }}>Modifier</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ServiceFormDialog({ initial, onSaved }: { initial: any | null; onSaved: () => void }) {
  const [form, setForm] = useState(() => ({
    nom: initial?.nom ?? "",
    description: initial?.description ?? "",
    categorie: initial?.categorie ?? "",
    telephone: initial?.telephone ?? "",
    email: initial?.email ?? "",
    adresse: initial?.adresse ?? "",
    site_web: initial?.site_web ?? "",
    horaires: initial?.horaires ?? "",
    message_specifique: initial?.message_specifique ?? "",
    actif: initial?.actif ?? true,
    ordre: initial?.ordre ?? 0,
  }));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.nom.trim()) return;
    setSaving(true);
    const payload: any = {
      ...form,
      nom: form.nom.trim(),
      description: form.description || null,
      categorie: form.categorie || null,
      telephone: form.telephone || null,
      email: form.email || null,
      adresse: form.adresse || null,
      site_web: form.site_web || null,
      horaires: form.horaires || null,
      message_specifique: form.message_specifique || null,
    };
    const { error } = initial
      ? await supabase.from("reorientation_services" as never).update(payload as never).eq("id", initial.id)
      : await supabase.from("reorientation_services" as never).insert(payload as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial ? "Service mis à jour" : "Service créé");
    onSaved();
  };

  const set = (k: keyof typeof form) => (e: any) => setForm({ ...form, [k]: e?.target ? e.target.value : e });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{initial ? "Modifier le service" : "Nouveau service"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-2"><Label>Nom *</Label><Input value={form.nom} onChange={set("nom")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Catégorie</Label><Input value={form.categorie} onChange={set("categorie")} placeholder="Santé, Logement, Emploi…" /></div>
          <div className="grid gap-2"><Label>Ordre d'affichage</Label><Input type="number" value={form.ordre} onChange={(e) => setForm({ ...form, ordre: parseInt(e.target.value) || 0 })} /></div>
        </div>
        <div className="grid gap-2"><Label>Description courte</Label><Textarea rows={2} value={form.description} onChange={set("description")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Téléphone</Label><Input value={form.telephone} onChange={set("telephone")} /></div>
          <div className="grid gap-2"><Label>Email contact</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
        </div>
        <div className="grid gap-2"><Label>Adresse</Label><Input value={form.adresse} onChange={set("adresse")} /></div>
        <div className="grid gap-2"><Label>Site web</Label><Input value={form.site_web} onChange={set("site_web")} /></div>
        <div className="grid gap-2"><Label>Horaires</Label><Input value={form.horaires} onChange={set("horaires")} placeholder="Lun-Ven 9h-17h" /></div>
        <div className="grid gap-2">
          <Label>Message spécifique (inséré dans le mail)</Label>
          <Textarea rows={3} value={form.message_specifique} onChange={set("message_specifique")} placeholder="Ex. Présentez-vous à l'accueil avec une pièce d'identité…" />
        </div>
        <div className="flex items-center gap-2"><Switch checked={form.actif} onCheckedChange={(v) => setForm({ ...form, actif: v })} /><Label>Service actif</Label></div>
        <div className="flex justify-end gap-2">
          <Button disabled={saving || !form.nom.trim()} onClick={save}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
        </div>
      </div>
    </DialogContent>
  );
}

function MailTab() {
  const [row, setRow] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("reorientation_email_settings" as never)
      .select("*")
      .is("territoire_id", null)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRow(data));
  }, []);

  if (!row) return <Card className="p-6">Chargement…</Card>;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("reorientation_email_settings" as never)
      .update({
        objet_mail: row.objet_mail,
        introduction: row.introduction,
        conclusion: row.conclusion,
        signature: row.signature,
        mentions_legales: row.mentions_legales || null,
      } as never)
      .eq("id", row.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Modèle enregistré");
  };

  const set = (k: string) => (e: any) => setRow({ ...row, [k]: e.target.value });

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-4 bg-info/5 border-info/20 flex gap-2 items-start">
        <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
        <div className="text-sm">
          Variables disponibles : <code>{"{prenom}"}</code>, <code>{"{nom}"}</code>, <code>{"{date_rdv}"}</code>,
          <code>{" {structure}"}</code>, <code>{"{email_structure}"}</code>, <code>{"{telephone_structure}"}</code>,
          <code>{" {service_nom}"}</code>, <code>{"{service_telephone}"}</code>, <code>{"{service_email}"}</code>,
          <code>{" {service_adresse}"}</code>, <code>{"{service_horaires}"}</code>, <code>{"{service_message}"}</code>.
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="grid gap-2"><Label>Objet du mail</Label><Input value={row.objet_mail} onChange={set("objet_mail")} /></div>
        <div className="grid gap-2"><Label>Introduction</Label><Textarea rows={5} value={row.introduction} onChange={set("introduction")} /></div>
        <div className="grid gap-2"><Label>Conclusion (après le bloc service)</Label><Textarea rows={4} value={row.conclusion} onChange={set("conclusion")} /></div>
        <div className="grid gap-2"><Label>Signature</Label><Textarea rows={3} value={row.signature} onChange={set("signature")} /></div>
        <div className="grid gap-2"><Label>Mentions légales / pied de mail</Label><Textarea rows={2} value={row.mentions_legales ?? ""} onChange={set("mentions_legales")} /></div>
        <div className="flex justify-end"><Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />Enregistrer le modèle</Button></div>
      </Card>
    </div>
  );
}
