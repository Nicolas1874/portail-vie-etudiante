import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { HandCoins, Plus, Printer, Ticket as TicketIcon } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/labels";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  TYPES_DISPOSITIF,
  DispositifType,
  ChampPerso,
  STATUTS_TICKET,
} from "@/lib/coups-pouce-types";
import { CustomFieldsForm } from "@/components/coups-pouce/CustomFieldsForm";
import { renderDocumentTemplate, openPrintWindow } from "@/lib/coups-pouce-print";
import { logSollicitationBesoin } from "@/lib/presto-sollicitation";

const STATUTS: Record<string, string> = {
  en_attente: "En attente",
  accorde: "Accordé",
  refuse: "Refusé",
  cloture: "Clôturé",
};

function genTicketNumero() {
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${r}`;
}

export function CoupsPouceTab({
  usagerId,
  structureId,
}: {
  usagerId: string;
  structureId: string;
}) {
  const { profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [dispositifs, setDispositifs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [usager, setUsager] = useState<any | null>(null);
  const [structureNom, setStructureNom] = useState<string>("");

  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});

  const refresh = async () => {
    setLoading(true);
    const [c, d, u, s] = await Promise.all([
      supabase
        .from("coups_pouce")
        .select("*, coups_pouce_dispositifs(libelle, type, montant_unitaire, document_titre, document_template, champs_personnalises)")
        .eq("usager_id", usagerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("coups_pouce_dispositifs")
        .select("*")
        .eq("actif", true)
        .order("ordre"),
      supabase.from("usagers").select("*").eq("id", usagerId).maybeSingle(),
      supabase.from("structures").select("nom, territoire_id").eq("id", structureId).maybeSingle(),
    ]);
    setItems(c.data ?? []);
    const territoireId = (s.data as any)?.territoire_id ?? null;
    const filtered = (d.data ?? []).filter(
      (x: any) => x.territoire_id == null || x.territoire_id === territoireId,
    );
    setDispositifs(filtered);
    setUsager(u.data ?? null);
    setStructureNom(s.data?.nom ?? "");

    const cpIds = (c.data ?? []).map((x: any) => x.id);
    if (cpIds.length) {
      const { data: tk } = await supabase
        .from("coups_pouce_tickets")
        .select("*")
        .in("coup_pouce_id", cpIds)
        .order("numero");
      const map: Record<string, any[]> = {};
      (tk ?? []).forEach((t: any) => {
        (map[t.coup_pouce_id] = map[t.coup_pouce_id] ?? []).push(t);
      });
      setTickets(map);
    } else {
      setTickets({});
    }

    const ids = Array.from(new Set((c.data ?? []).map((x: any) => x.cree_par).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, prenom, nom, email, fonction").in("id", ids);
      const m: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => (m[p.id] = p));
      setProfilesMap(m);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [usagerId]);

  const setStatut = async (id: string, statut: string) => {
    const { error } = await (supabase
      .from("coups_pouce") as any)
      .update({
        statut,
        date_decision:
          statut === "accorde" || statut === "refuse"
            ? new Date().toISOString().slice(0, 10)
            : null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Mis à jour");
      refresh();
    }
  };

  const printTicket = (c: any, ticket?: any, idx?: number, total?: number) => {
    const disp = c.coups_pouce_dispositifs;
    if (!disp?.document_template) {
      toast.error("Aucun modèle de document configuré pour ce dispositif");
      return;
    }
    const auteur = profilesMap[c.cree_par] ?? profile ?? {};
    const rendered = renderDocumentTemplate(disp.document_template, {
      usager,
      coup_pouce: c,
      dispositif: disp,
      auteur,
      structure_nom: structureNom,
      ticket,
      ticket_index: idx,
      ticket_total: total,
    });
    const titre = (disp.document_titre || disp.libelle || "Bon")
      + (ticket ? ` — n° ${ticket.numero}` : "");
    openPrintWindow(titre, structureNom, formatDate(c.date_demande), rendered);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <NewDialog
          dispositifs={dispositifs}
          usagerId={usagerId}
          structureId={structureId}
          userId={profile?.id}
          onCreated={refresh}
        />
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <HandCoins className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Aucun coup de pouce enregistré.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const tks = tickets[c.id] ?? [];
            const champs = (c.coups_pouce_dispositifs?.champs_personnalises ?? []) as ChampPerso[];
            const dispoType = c.coups_pouce_dispositifs?.type as DispositifType | undefined;
            return (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                        {c.coups_pouce_dispositifs?.libelle ?? "—"}
                        {dispoType && (
                          <Badge variant="outline" className="text-[10px]">
                            {TYPES_DISPOSITIF[dispoType] ?? dispoType}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Demandé le {formatDate(c.date_demande)}
                        {c.date_decision && ` · Décision le ${formatDate(c.date_decision)}`}
                        {c.montant && ` · ${c.montant} €`}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Saisi le {formatDateTime(c.created_at)}
                        {profilesMap[c.cree_par] &&
                          ` · par ${[profilesMap[c.cree_par].prenom, profilesMap[c.cree_par].nom].filter(Boolean).join(" ") || profilesMap[c.cree_par].email}`}
                      </div>
                      {c.notes && (
                        <p className="text-sm mt-2 whitespace-pre-wrap">{c.notes}</p>
                      )}

                      {/* Champs personnalisés */}
                      {champs.length > 0 && c.donnees_personnalisees && Object.keys(c.donnees_personnalisees ?? {}).length > 0 && (
                        <div className="mt-3 border-t pt-2">
                          <CustomFieldsForm
                            champs={champs}
                            values={c.donnees_personnalisees ?? {}}
                            onChange={() => {}}
                            audience="guichetier"
                            readOnly
                          />
                        </div>
                      )}

                      {/* Tickets */}
                      {dispoType === "bon_finance" && tks.length > 0 && (
                        <div className="mt-3 border-t pt-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <TicketIcon className="h-3 w-3" />
                            Bons ({tks.filter((t) => t.statut === "utilise").length}/{tks.length} utilisés)
                          </div>
                          <div className="space-y-1">
                            {tks.map((t, i) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded px-2 py-1"
                              >
                                <span className="font-mono">{t.numero}</span>
                                <span className="text-muted-foreground">{t.montant} €</span>
                                <StatusBadge value={t.statut} label={STATUTS_TICKET[t.statut]} />
                                {t.date_utilisation && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDate(t.date_utilisation)}
                                  </span>
                                )}
                                {c.coups_pouce_dispositifs?.document_template && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => printTicket(c, t, i + 1, tks.length)}
                                  >
                                    <Printer className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge value={c.statut} label={STATUTS[c.statut]} />
                      <Select
                        value={c.statut}
                        onValueChange={(v) => setStatut(c.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUTS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {c.coups_pouce_dispositifs?.document_template && dispoType !== "bon_finance" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => printTicket(c)}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Imprimer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewDialog({
  dispositifs,
  usagerId,
  structureId,
  userId,
  onCreated,
}: {
  dispositifs: any[];
  usagerId: string;
  structureId: string;
  userId?: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dispositifId, setDispositifId] = useState("");
  const [montant, setMontant] = useState("");
  const [nbBons, setNbBons] = useState("1");
  const [notes, setNotes] = useState("");
  const [donnees, setDonnees] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const dispositif = dispositifs.find((d) => d.id === dispositifId);
  const dispoType = dispositif?.type as DispositifType | undefined;
  const champs = (dispositif?.champs_personnalises ?? []) as ChampPerso[];

  useEffect(() => {
    if (!dispositif) return;
    setDonnees({});
    if (dispoType === "bon_finance") {
      setNbBons(String(dispositif.nb_bons_default ?? 1));
      setMontant("");
    } else {
      setMontant("");
      setNbBons("1");
    }
  }, [dispositifId]);

  const submit = async () => {
    if (!dispositifId) {
      toast.error("Sélectionnez un dispositif");
      return;
    }

    // Validation champs requis (rempli par guichetier)
    for (const c of champs) {
      const r = c.remplissable_par ?? "guichetier";
      if (r === "partenaire") continue;
      if (c.required && (donnees[c.key] == null || donnees[c.key] === "")) {
        toast.error(`Champ requis : ${c.label}`);
        return;
      }
    }

    let montantFinal: number | null = null;
    let nbBonsFinal = 1;
    if (dispoType === "bon_finance") {
      const unit = Number(dispositif?.montant_unitaire ?? 0);
      nbBonsFinal = Math.max(1, Number(nbBons) || 1);
      montantFinal = unit * nbBonsFinal;
    } else if (montant) {
      montantFinal = Number(montant);
    }

    setSaving(true);
    const { data: cp, error } = await (supabase
      .from("coups_pouce") as any)
      .insert({
        usager_id: usagerId,
        dispositif_id: dispositifId,
        structure_id: structureId,
        montant: montantFinal,
        notes: notes || null,
        cree_par: userId,
        donnees_personnalisees: donnees,
      })
      .select("id")
      .single();

    if (error || !cp) {
      setSaving(false);
      toast.error(error?.message ?? "Erreur");
      return;
    }

    // Génération des tickets pour bon_finance
    if (dispoType === "bon_finance") {
      const unit = Number(dispositif?.montant_unitaire ?? 0);
      const expDays = dispositif?.expiration_jours;
      const expiration = expDays
        ? new Date(Date.now() + Number(expDays) * 86400000).toISOString().slice(0, 10)
        : null;
      const ticketsToInsert = Array.from({ length: nbBonsFinal }, () => ({
        coup_pouce_id: cp.id,
        numero: genTicketNumero(),
        montant: unit,
        statut: "emis",
        date_expiration: expiration,
      }));
      const { error: tErr } = await (supabase
        .from("coups_pouce_tickets") as any).insert(ticketsToInsert);
      if (tErr) {
        toast.error(`Coup de pouce créé, mais erreur tickets : ${tErr.message}`);
      }
    }


    // Sollicitation transversale — paramétrée par dispositif × public
    const { data: u } = await supabase
      .from("usagers")
      .select("type_public")
      .eq("id", usagerId)
      .maybeSingle();
    const publicType = (u?.type_public as "etudiant" | "pij" | "paej" | null) ?? null;

    if (publicType) {
      const { data: mapping } = await supabase
        .from("coups_pouce_dispositifs_besoins")
        .select("besoin_id, typologie")
        .eq("dispositif_id", dispositifId)
        .eq("public_type", publicType)
        .maybeSingle();

      if (mapping?.besoin_id && mapping?.typologie) {
        const { error: sErr } = await logSollicitationBesoin({
          usagerId,
          structureId,
          creePar: userId ?? null,
          besoinId: mapping.besoin_id,
          typologie: mapping.typologie as any,
          titre: `Coup de pouce — ${dispositif?.libelle ?? "dispositif"}`,
          description: notes || null,
        });
        if (sErr) toast.warning("Coup de pouce créé, mais sollicitation : " + sErr);
      } else {
        toast.message(
          "Aucun besoin paramétré pour ce dispositif × ce public — sollicitation non créée.",
        );
      }
    }

    setSaving(false);
    toast.success("Coup de pouce enregistré");
    setOpen(false);
    setDispositifId("");
    setMontant("");
    setNbBons("1");
    setNotes("");
    setDonnees({});
    onCreated();
  };

  const totalCalcule =
    dispoType === "bon_finance" && dispositif?.montant_unitaire
      ? Number(dispositif.montant_unitaire) * (Number(nbBons) || 0)
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau coup de pouce
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau coup de pouce</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Dispositif *</Label>
            <Select value={dispositifId} onValueChange={setDispositifId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un dispositif" />
              </SelectTrigger>
              <SelectContent>
                {dispositifs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.libelle}
                    {d.type && ` — ${TYPES_DISPOSITIF[d.type as DispositifType] ?? d.type}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dispoType === "bon_finance" && (
            <div className="border rounded-md p-3 bg-muted/20 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Montant unitaire</Label>
                  <Input
                    value={`${dispositif?.montant_unitaire ?? "—"} €`}
                    disabled
                  />
                </div>
                <div>
                  <Label>Nombre de bons</Label>
                  <Input
                    type="number"
                    min="1"
                    value={nbBons}
                    onChange={(e) => setNbBons(e.target.value)}
                  />
                </div>
              </div>
              {totalCalcule != null && (
                <p className="text-xs text-muted-foreground">
                  Total : <span className="font-semibold">{totalCalcule} €</span>{" "}
                  · {nbBons} bon(s) seront générés et imprimables
                </p>
              )}
            </div>
          )}

          {dispoType !== "bon_finance" && (
            <div>
              <Label>Montant (€)</Label>
              <Input
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
          )}

          {champs.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Informations spécifiques au dispositif
              </p>
              <CustomFieldsForm
                champs={champs}
                values={donnees}
                onChange={setDonnees}
                audience="guichetier"
              />
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
