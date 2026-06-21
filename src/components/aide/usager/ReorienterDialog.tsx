/**
 * Dialog "Réorienter l'usager vers un ou plusieurs services / partenaires".
 *
 * - Sélection multiple dans le catalogue admin + un service en saisie libre
 * - Un seul mail composé, listant tous les services choisis
 * - Une ligne de traçabilité par service dans `reorientations`
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";
import { toast } from "sonner";
import { Copy, Mail, Send, AlertCircle } from "lucide-react";
import { buildReorientMail, buildMailtoUrl, type ReorientService } from "@/lib/aide/reorientation-mail";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  usager: { id: string; prenom?: string | null; nom?: string | null; email?: string | null; territoire_id?: string | null };
  suiviId?: string | null;
  dateRdv?: string | null;
  structureId: string;
  onCreated?: () => void;
}

export function ReorienterDialog({ open, onOpenChange, usager, suiviId, dateRdv, structureId, onCreated }: Props) {
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [structure, setStructure] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [serviceLibre, setServiceLibre] = useState<string>("");
  const [motif, setMotif] = useState("");
  const [destinataire, setDestinataire] = useState(usager.email ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestinataire(usager.email ?? "");
    setSelectedIds(new Set());
    setServiceLibre("");
    setMotif("");

    void Promise.all([
      supabase
        .from("reorientation_services" as never)
        .select("*")
        .eq("actif", true)
        .order("ordre")
        .order("nom"),
      supabase
        .from("reorientation_email_settings" as never)
        .select("*")
        .or(`territoire_id.eq.${usager.territoire_id ?? "00000000-0000-0000-0000-000000000000"},territoire_id.is.null`)
        .order("territoire_id", { nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("structures").select("nom, email, telephone").eq("id", structureId).maybeSingle(),
    ]).then(([srv, st, str]) => {
      setServices((srv.data as any[]) ?? []);
      setSettings(st.data ?? null);
      setStructure(str.data ?? null);
    });
  }, [open, usager.email, usager.territoire_id, structureId]);

  const toggle = (id: string) => setSelectedIds((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const chosenServices = useMemo<ReorientService[]>(() => {
    const fromCatalog = services.filter((s) => selectedIds.has(s.id));
    const libre = serviceLibre.trim()
      ? [{ nom: serviceLibre.trim(), telephone: null, email: null, adresse: null, horaires: null, message_specifique: null }]
      : [];
    return [...fromCatalog, ...libre];
  }, [services, selectedIds, serviceLibre]);

  const mail = useMemo(() => {
    if (!settings || chosenServices.length === 0) return null;
    return buildReorientMail({ usager, dateRdv, structure, services: chosenServices, settings });
  }, [settings, chosenServices, usager, dateRdv, structure]);

  const canSubmit = chosenServices.length > 0 && !saving;

  async function save({ markSent }: { markSent: boolean }) {
    if (!canSubmit) return;
    setSaving(true);
    const rows: any[] = [];
    services.filter((s) => selectedIds.has(s.id)).forEach((s) => {
      rows.push({
        usager_id: usager.id,
        suivi_id: suiviId ?? null,
        service_id: s.id,
        service_libre: null,
        motif: motif || null,
        agent_id: user?.id ?? null,
        structure_id: structureId,
        mail_envoye: markSent,
        mail_envoye_at: markSent ? new Date().toISOString() : null,
        mail_destinataire: markSent ? destinataire || null : null,
      });
    });
    if (serviceLibre.trim()) {
      rows.push({
        usager_id: usager.id,
        suivi_id: suiviId ?? null,
        service_id: null,
        service_libre: serviceLibre.trim(),
        motif: motif || null,
        agent_id: user?.id ?? null,
        structure_id: structureId,
        mail_envoye: markSent,
        mail_envoye_at: markSent ? new Date().toISOString() : null,
        mail_destinataire: markSent ? destinataire || null : null,
      });
    }
    const { error } = await supabase.from("reorientations" as never).insert(rows as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(markSent ? "Réorientations enregistrées et mail marqué envoyé" : "Réorientations enregistrées");
    onCreated?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réorienter l'usager</DialogTitle>
          <DialogDescription>
            Sélectionnez un ou plusieurs services partenaires. Un seul mail listera l'ensemble des contacts choisis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Services / partenaires du catalogue</Label>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun service paramétré.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                {services.map((s) => (
                  <label key={s.id} className="flex items-start gap-2 p-2 hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedIds.has(s.id)}
                      onCheckedChange={() => toggle(s.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="font-medium">
                        {s.nom}
                        {s.categorie && <span className="ml-2 text-xs text-muted-foreground">· {s.categorie}</span>}
                      </div>
                      {(s.telephone || s.email) && (
                        <div className="text-xs text-muted-foreground truncate">
                          {[s.telephone, s.email].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedIds.size > 0 && (
              <p className="text-xs text-muted-foreground">{selectedIds.size} service(s) sélectionné(s)</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>… + un service en saisie libre (facultatif)</Label>
            <Input
              placeholder="Nom d'un service hors catalogue"
              value={serviceLibre}
              onChange={(e) => setServiceLibre(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Motif interne (facultatif)</Label>
            <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Pour la traçabilité interne" />
          </div>

          {!settings && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>Aucun paramétrage mail trouvé. Un admin doit créer le modèle dans <strong>Admin → Réorientation</strong>.</div>
            </div>
          )}

          {mail && (
            <div className="space-y-2">
              <div className="grid gap-2">
                <Label>Destinataire</Label>
                <Input type="email" value={destinataire} onChange={(e) => setDestinataire(e.target.value)} placeholder="email@exemple.fr" />
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Aperçu du mail</div>
                <div className="font-mono text-sm font-semibold">{mail.objet}</div>
                <Textarea readOnly rows={14} value={mail.corps} className="font-mono text-xs" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { navigator.clipboard.writeText(`Objet : ${mail.objet}\n\n${mail.corps}`); toast.success("Mail copié"); }}
                >
                  <Copy className="h-4 w-4 mr-2" />Copier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!destinataire}
                  onClick={() => window.open(buildMailtoUrl(destinataire, mail.objet, mail.corps), "_blank")}
                >
                  <Mail className="h-4 w-4 mr-2" />Ouvrir dans mon client mail
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button variant="outline" disabled={!canSubmit} onClick={() => save({ markSent: false })}>
            Enregistrer sans envoi
          </Button>
          <Button disabled={!canSubmit || !destinataire || !mail} onClick={() => save({ markSent: true })}>
            <Send className="h-4 w-4 mr-2" />Marquer envoyé et tracer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
