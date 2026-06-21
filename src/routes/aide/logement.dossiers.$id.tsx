import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  ArrowLeft,
  Calendar,
  FileText,
  Users,
  ExternalLink,
  Send,
  Trash2,
  Printer,
} from "lucide-react";
import {
  LOGEMENT_PROGRAMMES,
  LOGEMENT_STATUTS,
  formatDate,
  fullName,
} from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/aide/logement/dossiers/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    print: typeof s.print === "string" ? s.print : undefined,
  }),
  component: DossierFiche,
});

const STATUTS = ["ouvert", "en_cours", "en_attente", "cloture", "abandonne"] as const;

function DossierFiche() {
  const { id } = Route.useParams();
  const { print } = Route.useSearch();
  const { user } = useAuth();
  const [dossier, setDossier] = useState<any>(null);
  const [referents, setReferents] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [newEntry, setNewEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<any>({});

  const load = async () => {
    setLoading(true);
    const { data: d } = await supabase
      .from("logement_dossiers")
      .select(
        "*, usagers(id, nom, prenom, email, telephone), logement_programmes(id, nom, type, description)",
      )
      .eq("id", id)
      .maybeSingle();
    setDossier(d);
    setEdit({
      statut: d?.statut ?? "ouvert",
      date_debut: d?.date_debut ?? "",
      date_fin_prevue: d?.date_fin_prevue ?? "",
      date_fin: d?.date_fin ?? "",
      cij_rdv_le: d?.cij_rdv_le ? d.cij_rdv_le.slice(0, 16) : "",
      bail_signe_le: d?.bail_signe_le ?? "",
      bail_renouvele: d?.bail_renouvele ?? false,
      hebergement_type: d?.hebergement_type ?? "",
      hebergement_lieu: d?.hebergement_lieu ?? "",
      hebergement_cout: d?.hebergement_cout ?? "",
      notes: d?.notes ?? "",
    });
    if (d?.programme_id) {
      const { data: r } = await supabase
        .from("logement_programmes_partenaires")
        .select(
          "*, partenaires(prenom, nom, email, telephone, fonction, partenaire_structures(nom))",
        )
        .eq("programme_id", d.programme_id)
        .order("ordre");
      setReferents(r ?? []);
    }
    const { data: j } = await supabase
      .from("logement_journal")
      .select("*")
      .eq("dossier_id", id)
      .order("created_at", { ascending: false });
    setJournal(j ?? []);
    const ids = Array.from(new Set((j ?? []).map((x: any) => x.auteur_id).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, prenom, nom, email")
        .in("id", ids);
      const m: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => (m[p.id] = p));
      setAuthors(m);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!loading && dossier && print === "1") {
      const timer = window.setTimeout(() => window.print(), 250);
      return () => window.clearTimeout(timer);
    }
  }, [loading, dossier, print]);

  const addEntry = async () => {
    if (!newEntry.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("logement_journal").insert({
      dossier_id: id,
      contenu: newEntry.trim(),
      auteur_id: user!.id,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setNewEntry("");
      toast.success("Note ajoutée");
      load();
    }
  };

  const removeEntry = async (entryId: string) => {
    const { error } = await supabase.from("logement_journal").delete().eq("id", entryId);
    if (error) toast.error(error.message);
    else load();
  };

  const saveDossier = async () => {
    const payload: any = {
      statut: edit.statut,
      date_debut: edit.date_debut || null,
      date_fin_prevue: edit.date_fin_prevue || null,
      date_fin: edit.date_fin || null,
      cij_rdv_le: edit.cij_rdv_le ? new Date(edit.cij_rdv_le).toISOString() : null,
      bail_signe_le: edit.bail_signe_le || null,
      bail_renouvele: edit.bail_renouvele,
      hebergement_type: edit.hebergement_type || null,
      hebergement_lieu: edit.hebergement_lieu || null,
      hebergement_cout: edit.hebergement_cout === "" ? null : Number(edit.hebergement_cout),
      notes: edit.notes || null,
    };
    const { error } = await supabase.from("logement_dossiers").update(payload).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dossier mis à jour");
      setEditing(false);
      load();
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Chargement…</div>;
  if (!dossier)
    return <div className="p-12 text-center text-muted-foreground">Dossier introuvable.</div>;

  return (
    <div>
      <PageHeader
        title={`Dossier logement — ${fullName(dossier.usagers)}`}
        description={`${LOGEMENT_PROGRAMMES[dossier.logement_programmes?.type ?? ""] ?? ""} · ${dossier.logement_programmes?.nom ?? ""}`}
        actions={
          <div className="flex gap-2" data-no-print>
            <Button asChild variant="outline" size="sm">
              <Link to="/logement">
                <ArrowLeft className="h-4 w-4 mr-1" /> Logement
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/usagers/$id" params={{ id: dossier.usager_id }}>
                Fiche usager <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimer fiche navette
            </Button>
          </div>
        }
      />

      {/* ============ VUE ÉCRAN ============ */}
      <div className="p-6 grid gap-6 lg:grid-cols-3 print:hidden">
        <div className="lg:col-span-2 space-y-4">
          {/* Infos dossier */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Home className="h-4 w-4" /> Suivi du dossier
                </h3>
                <div className="flex items-center gap-2">
                  <StatusBadge value={dossier.statut} label={LOGEMENT_STATUTS[dossier.statut]} />
                  {!editing && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)} data-no-print>
                      Modifier
                    </Button>
                  )}
                </div>
              </div>

              {!editing ? (
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <Field label="Programme">
                    <Link
                      className="underline"
                      to="/logement/programmes/$id"
                      params={{ id: dossier.programme_id }}
                    >
                      {dossier.logement_programmes?.nom}
                    </Link>
                  </Field>
                  <Field label="Date d'entrée">{formatDate(dossier.date_debut)}</Field>
                  <Field label="Fin prévue">{formatDate(dossier.date_fin_prevue) || "—"}</Field>
                  <Field label="Date de fin">{formatDate(dossier.date_fin) || "—"}</Field>
                  <Field label="RDV CIJ">
                    {dossier.cij_rdv_le ? formatDate(dossier.cij_rdv_le) : "—"}
                  </Field>
                  <Field label="Bail signé le">
                    {formatDate(dossier.bail_signe_le) || "—"}{" "}
                    {dossier.bail_renouvele && (
                      <Badge variant="outline" className="ml-1 text-[10px]">renouvelé</Badge>
                    )}
                  </Field>
                  <Field label="Type d'hébergement">{dossier.hebergement_type ?? "—"}</Field>
                  <Field label="Lieu">{dossier.hebergement_lieu ?? "—"}</Field>
                  <Field label="Coût mensuel">
                    {dossier.hebergement_cout != null ? `${dossier.hebergement_cout} €` : "—"}
                  </Field>
                  {dossier.notes && (
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                        Notes internes
                      </div>
                      <p className="whitespace-pre-wrap mt-1 text-sm">{dossier.notes}</p>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Statut</Label>
                      <Select value={edit.statut} onValueChange={(v) => setEdit({ ...edit, statut: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUTS.map((s) => (
                            <SelectItem key={s} value={s}>{LOGEMENT_STATUTS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date d'entrée</Label>
                      <Input type="date" value={edit.date_debut} onChange={(e) => setEdit({ ...edit, date_debut: e.target.value })} />
                    </div>
                    <div>
                      <Label>Fin prévue</Label>
                      <Input type="date" value={edit.date_fin_prevue} onChange={(e) => setEdit({ ...edit, date_fin_prevue: e.target.value })} />
                    </div>
                    <div>
                      <Label>Date de fin</Label>
                      <Input type="date" value={edit.date_fin} onChange={(e) => setEdit({ ...edit, date_fin: e.target.value })} />
                    </div>
                    <div>
                      <Label>RDV CIJ</Label>
                      <Input type="datetime-local" value={edit.cij_rdv_le} onChange={(e) => setEdit({ ...edit, cij_rdv_le: e.target.value })} />
                    </div>
                    <div>
                      <Label>Bail signé le</Label>
                      <Input type="date" value={edit.bail_signe_le} onChange={(e) => setEdit({ ...edit, bail_signe_le: e.target.value })} />
                    </div>
                    <div>
                      <Label>Type d'hébergement</Label>
                      <Input value={edit.hebergement_type} onChange={(e) => setEdit({ ...edit, hebergement_type: e.target.value })} />
                    </div>
                    <div>
                      <Label>Lieu</Label>
                      <Input value={edit.hebergement_lieu} onChange={(e) => setEdit({ ...edit, hebergement_lieu: e.target.value })} />
                    </div>
                    <div>
                      <Label>Coût mensuel (€)</Label>
                      <Input type="number" value={edit.hebergement_cout} onChange={(e) => setEdit({ ...edit, hebergement_cout: e.target.value })} />
                    </div>
                    <label className="flex items-center gap-2 text-sm mt-6">
                      <input type="checkbox" checked={!!edit.bail_renouvele} onChange={(e) => setEdit({ ...edit, bail_renouvele: e.target.checked })} />
                      Bail renouvelé
                    </label>
                  </div>
                  <div>
                    <Label>Notes internes</Label>
                    <Textarea rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
                    <Button onClick={saveDossier}>Enregistrer</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journal */}
          <Card>
            <CardContent className="pt-5">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4" /> Journal de suivi ({journal.length})
              </h3>
              <div className="flex gap-2 mb-4" data-no-print>
                <Textarea
                  rows={2}
                  placeholder="Nouvelle note datée…"
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                />
                <Button onClick={addEntry} disabled={saving || !newEntry.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {journal.length === 0 ? (
                <p className="text-sm italic text-muted-foreground py-4 text-center">
                  Aucune entrée pour ce dossier.
                </p>
              ) : (
                <div className="space-y-3">
                  {journal.map((j) => {
                    const a = authors[j.auteur_id];
                    return (
                      <div key={j.id} className="border-l-2 border-primary/40 pl-3 py-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {formatDate(j.date_entree)}
                            {a && (
                              <span className="ml-2">
                                · {[a.prenom, a.nom].filter(Boolean).join(" ") || a.email}
                              </span>
                            )}
                          </div>
                          {j.auteur_id === user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeEntry(j.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{j.contenu}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar : usager + référents */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" /> Usager
              </h3>
              <div className="text-sm space-y-1">
                <div className="font-medium">{fullName(dossier.usagers)}</div>
                {dossier.usagers?.email && <div className="text-xs">📧 {dossier.usagers.email}</div>}
                {dossier.usagers?.telephone && <div className="text-xs">📞 {dossier.usagers.telephone}</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Home className="h-4 w-4" /> Référents partenaires
              </h3>
              {referents.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  Aucun référent défini sur ce programme.
                </p>
              ) : (
                <div className="space-y-2">
                  {referents.map((r) => {
                    const p = r.partenaires;
                    const s = p?.partenaire_structures;
                    return (
                      <div key={r.id} className="border rounded-md p-3 bg-muted/20">
                        <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                          {r.role_libelle}
                        </div>
                        {p ? (
                          <div className="mt-1">
                            <div className="font-medium text-sm">
                              {[p.prenom, p.nom].filter(Boolean).join(" ")}
                            </div>
                            {p.fonction && (
                              <div className="text-xs text-muted-foreground">{p.fonction}</div>
                            )}
                            {s?.nom && <div className="text-xs text-muted-foreground">{s.nom}</div>}
                            <div className="text-xs mt-1 space-y-0.5">
                              {p.email && <div>📧 {p.email}</div>}
                              {p.telephone && <div>📞 {p.telephone}</div>}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs italic text-muted-foreground mt-1">
                            À identifier
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============ FICHE NAVETTE IMPRIMABLE ============ */}
      <PrintableNavette dossier={dossier} referents={referents} journal={journal} authors={authors} />
    </div>
  );
}

function PrintableNavette({
  dossier,
  referents,
  journal,
  authors,
}: {
  dossier: any;
  referents: any[];
  journal: any[];
  authors: Record<string, any>;
}) {
  const u = dossier.usagers ?? {};
  const prog = dossier.logement_programmes ?? {};
  return (
    <div className="hidden print:block print-area text-black bg-white">
      {/* En-tête */}
      <div className="border-b-2 border-black pb-3 mb-4 flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-semibold">
            Guichet de l'AIDE — Dispositif logement
          </div>
          <h1 className="text-2xl font-bold mt-1">Fiche navette logement</h1>
          <div className="text-sm mt-0.5">
            {LOGEMENT_PROGRAMMES[prog.type] ?? ""} — <span className="font-semibold">{prog.nom}</span>
          </div>
        </div>
        <div className="text-right text-[11px]">
          <div>Édité le {new Date().toLocaleDateString("fr-FR")}</div>
          <div className="mt-1">Réf. dossier&nbsp;: {dossier.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      <p className="text-[11px] italic mb-4">
        Document à conserver et présenter aux différents partenaires (Ytinéraire, CCAS, bailleur…)
        pour le suivi du parcours logement de l'étudiant. Chaque partenaire est invité à compléter et signer
        l'encart qui le concerne.
      </p>

      {/* Identité étudiant */}
      <section className="mb-4 border border-black print-keep-together">
        <div className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wide">
          1. Identité de l'étudiant·e
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm p-3">
          <PrintField label="Nom" value={u.nom} />
          <PrintField label="Prénom" value={u.prenom} />
          <PrintField label="Téléphone" value={u.telephone} />
          <PrintField label="Email" value={u.email} />
          <PrintField label="Adresse actuelle" value={u.adresse} className="col-span-2" />
          <PrintField label="Code postal" value={u.code_postal} />
          <PrintField label="Ville" value={u.ville} />
          <PrintField label="Établissement" value={u.etablissement} />
          <PrintField label="Composante / formation" value={u.composante} />
        </div>
      </section>

      {/* Suivi dossier */}
      <section className="mb-4 border border-black print-keep-together">
        <div className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wide">
          2. Suivi du dossier
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm p-3">
          <PrintField label="Statut" value={LOGEMENT_STATUTS[dossier.statut]} />
          <PrintField label="Date d'entrée dispositif" value={formatDate(dossier.date_debut)} />
          <PrintField label="Fin prévue" value={formatDate(dossier.date_fin_prevue)} />
          <PrintField label="Date de fin effective" value={formatDate(dossier.date_fin)} />
          <PrintField label="RDV CIJ" value={dossier.cij_rdv_le ? formatDate(dossier.cij_rdv_le) : ""} />
          <PrintField
            label="Bail signé le"
            value={
              (formatDate(dossier.bail_signe_le) || "") +
              (dossier.bail_renouvele ? "  (renouvelé)" : "")
            }
          />
          <PrintField label="Type d'hébergement" value={dossier.hebergement_type} />
          <PrintField label="Lieu d'hébergement" value={dossier.hebergement_lieu} />
          <PrintField
            label="Coût mensuel"
            value={dossier.hebergement_cout != null ? `${dossier.hebergement_cout} €` : ""}
          />
        </div>
      </section>

      {/* Encarts partenaires */}
      <section className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-2">
          3. Encarts partenaires — à compléter
        </h2>
        {referents.length === 0 ? (
          <p className="text-sm italic">Aucun référent partenaire défini sur ce programme.</p>
        ) : (
          <div className="space-y-3">
            {referents.map((r) => (
              <PartnerBox key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>

      {/* Journal */}
      {journal.length > 0 && (
        <section className="mb-4 border border-black print-keep-together">
          <div className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wide">
            4. Journal de suivi interne
          </div>
          <div className="p-3 space-y-2 text-sm">
            {journal.map((j) => {
              const a = authors[j.auteur_id];
              return (
                <div key={j.id} className="border-l-2 border-black pl-2">
                  <div className="text-[11px]">
                    <span className="font-semibold">{formatDate(j.date_entree)}</span>
                    {a && (
                      <span> — {[a.prenom, a.nom].filter(Boolean).join(" ") || a.email}</span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{j.contenu}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="text-[10px] mt-6 pt-2 border-t border-black flex justify-between">
        <span>Document confidentiel — Guichet de l'AIDE</span>
        <span>Réf. {dossier.id.slice(0, 8).toUpperCase()}</span>
      </div>
    </div>
  );
}

function PrintField({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wide font-semibold">{label}</div>
      <div className="border-b border-black min-h-[18px] text-sm pt-0.5">{value || ""}</div>
    </div>
  );
}

function PartnerBox({ r }: { r: any }) {
  const p = r.partenaires;
  const s = p?.partenaire_structures;
  return (
    <div
      className="border-2 border-black break-inside-avoid partner-box"
      style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
    >
      <div className="bg-black text-white px-3 py-1.5 flex items-baseline justify-between">
        <span className="font-bold text-sm uppercase tracking-wide">{r.role_libelle}</span>
        {s?.nom && <span className="text-[11px] font-normal">{s.nom}</span>}
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <PrintField
            label="Référent"
            value={p ? [p.prenom, p.nom].filter(Boolean).join(" ") : ""}
          />
          <PrintField label="Fonction" value={p?.fonction} />
          <PrintField label="Téléphone" value={p?.telephone} />
          <PrintField label="Email" value={p?.email} />
          <PrintField label="Date du RDV" value="" />
          <PrintField label="Prochain RDV" value="" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide font-semibold mt-1">
            Observations / suivi / décisions
          </div>
          <div className="border border-black mt-0.5 h-20 bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-6 pt-1">
          <PrintField label="Date" value="" />
          <div>
            <div className="text-[10px] uppercase tracking-wide font-semibold">
              Cachet / signature
            </div>
            <div className="border border-black mt-0.5 h-12 bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
