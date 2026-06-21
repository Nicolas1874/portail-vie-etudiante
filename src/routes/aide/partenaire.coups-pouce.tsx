import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HandCoins, Printer, Check, FileText, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadXlsx } from "@/lib/xlsx-export";
import { formatDate, formatDateTime } from "@/lib/labels";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TYPES_DISPOSITIF,
  DispositifType,
  ChampPerso,
  STATUTS_TICKET,
  DispositifPartenairePermission,
} from "@/lib/coups-pouce-types";
import { CustomFieldsForm } from "@/components/coups-pouce/CustomFieldsForm";
import { renderDocumentTemplate, openPrintWindow } from "@/lib/coups-pouce-print";

const STATUTS: Record<string, string> = {
  en_attente: "En attente",
  accorde: "Accordé",
  refuse: "Refusé",
  cloture: "Clôturé",
};

export const Route = createFileRoute("/aide/partenaire/coups-pouce")({
  component: PartenaireCoupsPouce,
});

function PartenaireCoupsPouce() {
  const { profile, hasRole } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [tickets, setTickets] = useState<Record<string, any[]>>({});
  const [perms, setPerms] = useState<Record<string, DispositifPartenairePermission>>({});
  const [partStructure, setPartStructure] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<string>("tous");
  const [tab, setTab] = useState<"a_traiter" | "traites">("a_traiter");
  const [editing, setEditing] = useState<any | null>(null);

  const sp = profile?.structure_partenaire_id;

  const load = async () => {
    if (!sp) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: ps } = await supabase
      .from("partenaire_structures")
      .select("*")
      .eq("id", sp)
      .maybeSingle();
    setPartStructure(ps);

    const { data: cpdp } = await supabase
      .from("coups_pouce_dispositifs_partenaires")
      .select("*")
      .eq("structure_partenaire_id", sp);

    const permsMap: Record<string, DispositifPartenairePermission> = {};
    (cpdp ?? []).forEach((p: any) => (permsMap[p.dispositif_id] = p));
    setPerms(permsMap);

    const dispoIds = Object.keys(permsMap);
    if (dispoIds.length === 0) {
      setItems([]);
      setTickets({});
      setLoading(false);
      return;
    }

    const { data: cps, error } = await supabase
      .from("coups_pouce")
      .select(
        "*, coups_pouce_dispositifs(libelle, type, montant_unitaire, document_titre, document_template, champs_personnalises), usagers(prenom, nom, numero_etudiant, email, telephone, etablissement)",
      )
      .in("dispositif_id", dispoIds)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setItems(cps ?? []);

    const cpIds = (cps ?? []).map((c: any) => c.id);
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
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [sp]);

  if (!hasRole("partenaire") && !profile?.structure_partenaire_id) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Cet espace est réservé aux structures partenaires.
      </div>
    );
  }

  if (!sp) {
    return (
      <div className="p-12 text-center text-muted-foreground text-sm">
        Votre profil n'est rattaché à aucune structure partenaire. Contactez
        l'administrateur du Guichet de l'AIDE.
      </div>
    );
  }

  const confirmerTicket = async (ticket: any, utilise: boolean) => {
    const { error } = await (supabase
      .from("coups_pouce_tickets") as any)
      .update({
        statut: utilise ? "utilise" : "emis",
        date_utilisation: utilise ? new Date().toISOString() : null,
        utilise_par_profile_id: utilise ? profile?.id : null,
        utilise_par_structure_partenaire_id: utilise ? sp : null,
      })
      .eq("id", ticket.id);
    if (error) toast.error(error.message);
    else {
      toast.success(utilise ? "Passage confirmé" : "Annulé");
      load();
    }
  };

  const printItem = (c: any, ticket?: any, idx?: number, total?: number) => {
    const disp = c.coups_pouce_dispositifs;
    if (!disp?.document_template) {
      toast.error("Aucun modèle de document configuré");
      return;
    }
    const rendered = renderDocumentTemplate(disp.document_template, {
      usager: c.usagers,
      coup_pouce: c,
      dispositif: disp,
      auteur: {},
      structure_nom: "",
      partenaire_structure: partStructure,
      ticket,
      ticket_index: idx,
      ticket_total: total,
    });
    const titre = (disp.document_titre || disp.libelle || "Document")
      + (ticket ? ` — n° ${ticket.numero}` : "");
    openPrintWindow(titre, partStructure?.nom ?? "", formatDate(c.date_demande), rendered);
  };

  const isClos = (c: any) => c.statut === "cloture" || c.statut === "refuse";
  const byTab = items.filter((c) => (tab === "a_traiter" ? !isClos(c) : isClos(c)));
  const filtered = byTab.filter((c) => {
    if (filtre === "tous") return true;
    if (filtre === "en_cours") {
      const tks = tickets[c.id] ?? [];
      if (c.coups_pouce_dispositifs?.type === "bon_finance") {
        return tks.some((t) => t.statut === "emis");
      }
      return c.statut === "en_attente" || c.statut === "accorde";
    }
    return c.statut === filtre;
  });

  const counts = {
    a_traiter: items.filter((c) => !isClos(c)).length,
    traites: items.filter((c) => isClos(c)).length,
  };

  const exportExcel = () => {
    if (items.length === 0) { toast.error("Aucune ligne à exporter"); return; }
    const fmt = (d: string | null | undefined) => {
      if (!d) return "";
      const dt = new Date(d);
      return `${String(dt.getDate()).padStart(2,"0")}-${String(dt.getMonth()+1).padStart(2,"0")}-${dt.getFullYear()}`;
    };
    const data = items.map((c) => ({
      nom: c.usagers?.nom ?? "",
      prenom: c.usagers?.prenom ?? "",
      numero_etudiant: c.usagers?.numero_etudiant ?? "",
      dispositif: c.coups_pouce_dispositifs?.libelle ?? "",
      type: c.coups_pouce_dispositifs?.type ?? "",
      statut: STATUTS[c.statut] ?? c.statut,
      montant: c.montant ?? "",
      date_demande: fmt(c.date_demande),
      date_decision: fmt(c.date_decision),
      tickets_emis: (tickets[c.id] ?? []).filter((t: any) => t.statut === "emis").length,
      tickets_utilises: (tickets[c.id] ?? []).filter((t: any) => t.statut === "utilise").length,
    }));
    downloadXlsx(`coups_pouce_tous_${new Date().toISOString().slice(0,10)}.xlsx`, data);
    toast.success(`${data.length} ligne(s) exportée(s)`);
  };

  return (
    <div>
      <PageHeader
        title="Coups de pouce"
        description={`Espace partenaire — ${partStructure?.nom ?? ""}`}
      />
      <div className="p-6 space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="a_traiter">À traiter ({counts.a_traiter})</TabsTrigger>
            <TabsTrigger value="traites">Traités ({counts.traites})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Filtrer :</span>
          <Select value={filtre} onValueChange={setFiltre}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous</SelectItem>
              <SelectItem value="en_cours">En cours / non utilisés</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="accorde">Accordé</SelectItem>
              <SelectItem value="cloture">Clôturé</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-1.5" />
            Exporter Excel
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              <HandCoins className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucun coup de pouce à afficher.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const perm = perms[c.dispositif_id] ?? ({} as DispositifPartenairePermission);
              const tks = tickets[c.id] ?? [];
              const dispoType = c.coups_pouce_dispositifs?.type as DispositifType | undefined;
              const champs = (c.coups_pouce_dispositifs?.champs_personnalises ?? []) as ChampPerso[];
              const champsPart = champs.filter(
                (ch) => (ch.remplissable_par ?? "guichetier") !== "guichetier",
              );

              return (
                <Card key={c.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                          {c.usagers?.prenom} {c.usagers?.nom}
                          {c.usagers?.numero_etudiant && (
                            <Badge variant="outline" className="text-[10px]">
                              n° {c.usagers.numero_etudiant}
                            </Badge>
                          )}
                          {dispoType && (
                            <Badge variant="secondary" className="text-[10px]">
                              {TYPES_DISPOSITIF[dispoType]}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {c.coups_pouce_dispositifs?.libelle} · Émis le{" "}
                          {formatDate(c.date_demande)}
                          {c.montant && ` · ${c.montant} €`}
                        </div>

                        {/* Champs perso : lecture des données guichetier + à remplir partenaire */}
                        {champs.length > 0 && (
                          <div className="mt-3 border-t pt-2 space-y-3">
                            <CustomFieldsForm
                              champs={champs.filter(
                                (ch) =>
                                  (ch.remplissable_par ?? "guichetier") !== "partenaire",
                              )}
                              values={c.donnees_personnalisees ?? {}}
                              onChange={() => {}}
                              audience="guichetier"
                              readOnly
                            />
                            {champsPart.length > 0 && perm.peut_remplir_fiche && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing(c)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Remplir / modifier la fiche
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Tickets bons financiers */}
                        {dispoType === "bon_finance" && tks.length > 0 && (
                          <div className="mt-3 border-t pt-2">
                            <div className="text-xs font-medium text-muted-foreground mb-1.5">
                              Bons ({tks.filter((t) => t.statut === "utilise").length}/
                              {tks.length} utilisés)
                            </div>
                            <div className="space-y-1">
                              {tks.map((t, i) => (
                                <div
                                  key={t.id}
                                  className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded px-2 py-1.5"
                                >
                                  <span className="font-mono">{t.numero}</span>
                                  <span className="text-muted-foreground">
                                    {t.montant} €
                                  </span>
                                  <StatusBadge
                                    value={t.statut}
                                    label={STATUTS_TICKET[t.statut]}
                                  />
                                  {t.date_utilisation && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDate(t.date_utilisation)}
                                    </span>
                                  )}
                                  <div className="flex gap-1">
                                    {perm.peut_imprimer &&
                                      c.coups_pouce_dispositifs?.document_template && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={() =>
                                            printItem(c, t, i + 1, tks.length)
                                          }
                                        >
                                          <Printer className="h-3 w-3" />
                                        </Button>
                                      )}
                                    {perm.peut_confirmer_passage &&
                                      t.statut === "emis" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 text-[11px]"
                                          onClick={() => confirmerTicket(t, true)}
                                        >
                                          <Check className="h-3 w-3 mr-1" />
                                          Confirmer
                                        </Button>
                                      )}
                                    {perm.peut_confirmer_passage &&
                                      t.statut === "utilise" && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[11px]"
                                          onClick={() => confirmerTicket(t, false)}
                                        >
                                          Annuler
                                        </Button>
                                      )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge value={c.statut} label={STATUTS[c.statut]} />
                        {perm.peut_changer_statut && (
                          <Select
                            value={c.statut}
                            onValueChange={async (v) => {
                              const { error } = await (supabase
                                .from("coups_pouce") as any)
                                .update({ statut: v })
                                .eq("id", c.id);
                              if (error) toast.error(error.message);
                              else {
                                toast.success("Statut mis à jour");
                                load();
                              }
                            }}
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
                        )}
                        {perm.peut_imprimer &&
                          c.coups_pouce_dispositifs?.document_template &&
                          dispoType !== "bon_finance" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => printItem(c)}
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

      {editing && (
        <FichePartenaireDialog
          coup={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function FichePartenaireDialog({
  coup,
  onClose,
  onSaved,
}: {
  coup: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const champs = ((coup.coups_pouce_dispositifs?.champs_personnalises ?? []) as ChampPerso[]).filter(
    (c) => (c.remplissable_par ?? "guichetier") !== "guichetier",
  );
  const [values, setValues] = useState<Record<string, any>>(
    coup.donnees_personnalisees ?? {},
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    for (const c of champs) {
      if (c.required && (values[c.key] == null || values[c.key] === "")) {
        toast.error(`Champ requis : ${c.label}`);
        return;
      }
    }
    setSaving(true);
    const { error } = await (supabase
      .from("coups_pouce") as any)
      .update({
        donnees_personnalisees: { ...(coup.donnees_personnalisees ?? {}), ...values },
      })
      .eq("id", coup.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Fiche enregistrée");
      onSaved();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fiche — {coup.coups_pouce_dispositifs?.libelle}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">
          Usager : {coup.usagers?.prenom} {coup.usagers?.nom}
        </div>
        <CustomFieldsForm
          champs={champs}
          values={values}
          onChange={setValues}
          audience="partenaire"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
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
