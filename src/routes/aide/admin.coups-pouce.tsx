import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, HandCoins, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import {
  TYPES_DISPOSITIF,
  DispositifType,
  ChampPerso,
  DispositifPartenairePermission,
} from "@/lib/coups-pouce-types";
import { ChampsBuilder } from "@/components/coups-pouce/ChampsBuilder";
import { DispositifPartenairesEditor } from "@/components/coups-pouce/DispositifPartenairesEditor";
import { ImpersonateYtineraireButton } from "@/components/coups-pouce/ImpersonateYtineraireButton";

export const Route = createFileRoute("/aide/admin/coups-pouce")({
  component: AdminCoupsPouce,
});

function AdminCoupsPouce() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [territoires, setTerritoires] = useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coups_pouce_dispositifs")
      .select("*")
      .order("ordre");
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    supabase
      .from("territoires")
      .select("id, nom")
      .order("nom")
      .then(({ data }) => setTerritoires((data as any) ?? []));
  }, []);

  const territoireNom = (id: string | null) =>
    id ? territoires.find((t) => t.id === id)?.nom ?? "—" : "Tous territoires";

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Accès réservé aux administrateurs.
      </div>
    );
  }

  const toggle = async (it: any) => {
    const { error } = await supabase
      .from("coups_pouce_dispositifs")
      .update({ actif: !it.actif })
      .eq("id", it.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const remove = async (it: any) => {
    const { error } = await supabase
      .from("coups_pouce_dispositifs")
      .delete()
      .eq("id", it.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dispositif supprimé");
      refresh();
    }
  };

  return (
    <div>
      <PageHeader
        title="Dispositifs « Coups de pouce »"
        description="Paramétrer les types d'aides, leurs champs personnalisés et les partenaires associés."
        actions={
          <div className="flex gap-2">
            <ImpersonateYtineraireButton />
            <Button onClick={() => setEditing({})}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau dispositif
            </Button>
          </div>
        }
      />
      <div className="p-6">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Chargement…</div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              <HandCoins className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucun dispositif paramétré.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <Card key={it.id}>
                <CardContent className="pt-4 pb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {it.libelle}
                      {it.type && (
                        <Badge variant="outline" className="text-[10px]">
                          {TYPES_DISPOSITIF[it.type as DispositifType] ?? it.type}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        {territoireNom(it.territoire_id)}
                      </Badge>
                      {it.type === "bon_finance" && it.montant_unitaire && (
                        <span className="text-xs text-muted-foreground">
                          {it.montant_unitaire}€ × {it.nb_bons_default ?? 1}
                        </span>
                      )}
                    </div>
                    {it.description && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {it.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {it.actif ? "Actif" : "Inactif"}
                    </span>
                    <Switch checked={it.actif} onCheckedChange={() => toggle(it)} />
                    <Button size="sm" variant="outline" onClick={() => setEditing(it)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmDelete
                      title={`Supprimer « ${it.libelle} » ?`}
                      description="Les coups de pouce existants liés à ce dispositif deviendront orphelins. Action irréversible."
                      onConfirm={() => remove(it)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {editing !== null && (
        <DispositifDialog
          item={editing}
          territoires={territoires}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

const TYPOLOGIES: { value: string; label: string }[] = [
  { value: "logement", label: "Logement" },
  { value: "sante", label: "Santé" },
  { value: "social", label: "Social" },
  { value: "financier", label: "Financière" },
  { value: "juridique", label: "Juridique" },
  { value: "emploi_formation", label: "Emploi / Formation" },
  { value: "mobilite", label: "Mobilité" },
  { value: "numerique", label: "Numérique" },
  { value: "scolarite", label: "Scolarité" },
  { value: "psychologique", label: "Psychologique" },
  { value: "autre", label: "Autre" },
];

const PUBLICS: { value: "etudiant" | "pij" | "paej"; label: string; flag: "pour_etudiant" | "pour_pij" | "pour_paej" }[] = [
  { value: "etudiant", label: "Étudiant", flag: "pour_etudiant" },
  { value: "pij", label: "PIJ", flag: "pour_pij" },
  { value: "paej", label: "PAEJ", flag: "pour_paej" },
];

interface BesoinMappingRow {
  public_type: "etudiant" | "pij" | "paej";
  besoin_id: string | null;
  typologie: string | null;
}

function DispositifDialog({
  item,
  territoires,
  onClose,
  onSaved,
}: {
  item: any;
  territoires: { id: string; nom: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(item.code ?? "");
  const [libelle, setLibelle] = useState(item.libelle ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [documentTitre, setDocumentTitre] = useState(item.document_titre ?? "");
  const [documentTemplate, setDocumentTemplate] = useState(item.document_template ?? "");
  const [type, setType] = useState<DispositifType>((item.type as DispositifType) ?? "bon_finance");
  const [montantUnitaire, setMontantUnitaire] = useState(
    item.montant_unitaire != null ? String(item.montant_unitaire) : "",
  );
  const [nbBonsDefault, setNbBonsDefault] = useState(
    item.nb_bons_default != null ? String(item.nb_bons_default) : "1",
  );
  const [expirationJours, setExpirationJours] = useState(
    item.expiration_jours != null ? String(item.expiration_jours) : "",
  );
  const [territoireId, setTerritoireId] = useState<string>(item.territoire_id ?? "all");
  const [champs, setChamps] = useState<ChampPerso[]>(item.champs_personnalises ?? []);
  const [partenaires, setPartenaires] = useState<DispositifPartenairePermission[]>([]);
  const [besoinsRef, setBesoinsRef] = useState<any[]>([]);
  const [mapping, setMapping] = useState<BesoinMappingRow[]>(
    PUBLICS.map((p) => ({ public_type: p.value, besoin_id: null, typologie: null })),
  );
  const [saving, setSaving] = useState(false);
  const templateRef = useRef<HTMLTextAreaElement>(null);

  const insertBalise = (balise: string) => {
    const ta = templateRef.current;
    const tag = `{{${balise}}}`;
    if (!ta) {
      setDocumentTemplate((v: string) => v + tag);
      return;
    }
    const start = ta.selectionStart ?? documentTemplate.length;
    const end = ta.selectionEnd ?? documentTemplate.length;
    const next = documentTemplate.slice(0, start) + tag + documentTemplate.slice(end);
    setDocumentTemplate(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + tag.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    // Référentiel besoins (toujours nécessaire pour l'onglet sollicitation)
    supabase
      .from("besoins")
      .select("id, code, libelle, pour_etudiant, pour_pij, pour_paej, actif")
      .eq("actif", true)
      .order("libelle")
      .then(({ data }) => setBesoinsRef((data as any) ?? []));

    if (!item.id) return;
    supabase
      .from("coups_pouce_dispositifs_partenaires")
      .select("*")
      .eq("dispositif_id", item.id)
      .then(({ data }) => setPartenaires((data as any) ?? []));

    supabase
      .from("coups_pouce_dispositifs_besoins")
      .select("public_type, besoin_id, typologie")
      .eq("dispositif_id", item.id)
      .then(({ data }) => {
        const byPublic: Record<string, any> = {};
        (data ?? []).forEach((r: any) => (byPublic[r.public_type] = r));
        setMapping(
          PUBLICS.map((p) => ({
            public_type: p.value,
            besoin_id: byPublic[p.value]?.besoin_id ?? null,
            typologie: byPublic[p.value]?.typologie ?? null,
          })),
        );
      });
  }, [item.id]);

  const submit = async () => {
    if (!code.trim() || !libelle.trim()) {
      toast.error("Code et libellé requis");
      return;
    }
    if (type === "bon_finance" && !montantUnitaire) {
      toast.error("Indiquez le montant unitaire du bon");
      return;
    }
    setSaving(true);
    const payload: any = {
      code: code.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      libelle: libelle.trim(),
      type,
      description: description.trim() || null,
      document_titre: documentTitre.trim() || null,
      document_template: documentTemplate.trim() || null,
      montant_unitaire:
        type === "bon_finance" && montantUnitaire ? Number(montantUnitaire) : null,
      nb_bons_default: type === "bon_finance" ? Number(nbBonsDefault) || 1 : null,
      expiration_jours: expirationJours ? Number(expirationJours) : null,
      champs_personnalises: champs as any,
      territoire_id: territoireId === "all" ? null : territoireId,
    };

    let dispositifId = item.id;
    if (item.id) {
      const { error } = await supabase
        .from("coups_pouce_dispositifs")
        .update(payload)
        .eq("id", item.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("coups_pouce_dispositifs")
        .insert({ ...payload, actif: true } as any)
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      dispositifId = data.id;
    }

    // Sync partenaires liés
    await supabase
      .from("coups_pouce_dispositifs_partenaires")
      .delete()
      .eq("dispositif_id", dispositifId);

    const validPartenaires = partenaires.filter((p) => p.structure_partenaire_id);
    if (validPartenaires.length > 0) {
      const { error: pErr } = await supabase
        .from("coups_pouce_dispositifs_partenaires")
        .insert(
          validPartenaires.map((p) => ({
            dispositif_id: dispositifId,
            structure_partenaire_id: p.structure_partenaire_id,
            peut_voir: p.peut_voir,
            peut_confirmer_passage: p.peut_confirmer_passage,
            peut_remplir_fiche: p.peut_remplir_fiche,
            peut_imprimer: p.peut_imprimer,
            peut_changer_statut: p.peut_changer_statut,
          })),
        );
      if (pErr) {
        toast.error(`Dispositif enregistré, mais erreur partenaires : ${pErr.message}`);
        setSaving(false);
        return;
      }
    }

    // Sync mapping besoins par public
    await supabase
      .from("coups_pouce_dispositifs_besoins")
      .delete()
      .eq("dispositif_id", dispositifId);

    const validMappings = mapping.filter((m) => m.besoin_id && m.typologie);
    if (validMappings.length > 0) {
      const { error: mErr } = await supabase
        .from("coups_pouce_dispositifs_besoins")
        .insert(
          validMappings.map((m) => ({
            dispositif_id: dispositifId,
            public_type: m.public_type,
            besoin_id: m.besoin_id!,
            typologie: m.typologie!,
          })) as any,
        );
      if (mErr) {
        toast.error(`Dispositif enregistré, mais erreur mapping besoins : ${mErr.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success(item.id ? "Dispositif mis à jour" : "Dispositif créé");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item.id ? "Modifier le dispositif" : "Nouveau dispositif"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="champs">Champs perso</TabsTrigger>
            <TabsTrigger value="partenaires">Partenaires</TabsTrigger>
            <TabsTrigger value="sollicitation">Sollicitation</TabsTrigger>
            <TabsTrigger value="impression">Impression</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3 pt-3">
            <div>
              <Label>Type de dispositif *</Label>
              <Select value={type} onValueChange={(v) => setType(v as DispositifType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPES_DISPOSITIF).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {type === "bon_finance" &&
                  "Génère N bons imprimables. Le partenaire confirme leur utilisation."}
                {type === "don_direct" &&
                  "Identification de l'usager pour récupération chez le partenaire (panier alimentaire, etc.)."}
                {type === "pret" &&
                  "Prêt de matériel. Utilisez les champs perso pour modèle, n° série, date retour…"}
                {type === "autre" && "Saisie libre."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code interne *</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div>
                <Label>Libellé *</Label>
                <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Territoire</Label>
              <Select value={territoireId} onValueChange={setTerritoireId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les territoires (global)</SelectItem>
                  {territoires.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Limitez ce dispositif à un territoire, ou laissez « global » pour qu'il soit utilisable partout.
              </p>
            </div>

            {type === "bon_finance" && (
              <div className="grid grid-cols-3 gap-3 border rounded-md p-3 bg-muted/20">
                <div>
                  <Label>Montant unitaire (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={montantUnitaire}
                    onChange={(e) => setMontantUnitaire(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nombre de bons par défaut</Label>
                  <Input
                    type="number"
                    min="1"
                    value={nbBonsDefault}
                    onChange={(e) => setNbBonsDefault(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Expiration (jours)</Label>
                  <Input
                    type="number"
                    value={expirationJours}
                    onChange={(e) => setExpirationJours(e.target.value)}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Description (interne)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="champs" className="space-y-2 pt-3">
            <p className="text-xs text-muted-foreground">
              Champs supplémentaires à saisir lors d'un coup de pouce (ex. n° de
              série pour un prêt, choix du panier pour un don…). Vous précisez qui
              les remplit (guichetier ou partenaire).
            </p>
            <ChampsBuilder value={champs} onChange={setChamps} />
          </TabsContent>

          <TabsContent value="partenaires" className="space-y-2 pt-3">
            <p className="text-xs text-muted-foreground">
              Structures partenaires associées à ce dispositif et leurs droits. Un
              utilisateur partenaire rattaché à l'une de ces structures verra et
              pourra agir sur les coups de pouce selon ses permissions. Utilisez
              le bouton « Aperçu » pour visualiser exactement ce qu'il verra.
            </p>
            <DispositifPartenairesEditor
              value={partenaires}
              onChange={setPartenaires}
              dispositifLibelle={libelle || "ce dispositif"}
              champs={champs}
            />
          </TabsContent>

          <TabsContent value="sollicitation" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Quand un coup de pouce est créé pour un usager, une « sollicitation » transversale
              peut être ajoutée automatiquement. Choisissez ici, pour chaque type de public, quel
              besoin et quelle typologie utiliser. Laissez vide pour qu'aucune sollicitation ne
              soit créée pour ce public.
            </p>
            {PUBLICS.map((pub) => {
              const row = mapping.find((m) => m.public_type === pub.value)!;
              const besoinsForPublic = besoinsRef.filter((b: any) => b[pub.flag]);
              return (
                <div
                  key={pub.value}
                  className="border rounded-md p-3 bg-muted/20 grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_auto] gap-2 items-end"
                >
                  <div className="font-medium text-sm">{pub.label}</div>
                  <div>
                    <Label className="text-xs">Besoin</Label>
                    <Select
                      value={row.besoin_id ?? "none"}
                      onValueChange={(v) =>
                        setMapping((arr) =>
                          arr.map((m) =>
                            m.public_type === pub.value
                              ? { ...m, besoin_id: v === "none" ? null : v }
                              : m,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Aucun (pas de sollicitation) —</SelectItem>
                        {besoinsForPublic.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Typologie</Label>
                    <Select
                      value={row.typologie ?? "none"}
                      onValueChange={(v) =>
                        setMapping((arr) =>
                          arr.map((m) =>
                            m.public_type === pub.value
                              ? { ...m, typologie: v === "none" ? null : v }
                              : m,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {TYPOLOGIES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(row.besoin_id || row.typologie) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setMapping((arr) =>
                          arr.map((m) =>
                            m.public_type === pub.value
                              ? { ...m, besoin_id: null, typologie: null }
                              : m,
                          ),
                        )
                      }
                    >
                      Effacer
                    </Button>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="impression" className="space-y-3 pt-3">
            <div>
              <Label>Titre du document imprimable</Label>
              <Input
                value={documentTitre}
                onChange={(e) => setDocumentTitre(e.target.value)}
                placeholder="Ex. Bon ESOPE 5 €"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Laissez vide pour ne pas générer de document à imprimer.
              </p>
            </div>
            <div>
              <Label>Modèle du document</Label>
              <Textarea
                ref={templateRef}
                value={documentTemplate}
                onChange={(e) => setDocumentTemplate(e.target.value)}
                rows={10}
                placeholder={`Bonjour,\n\nLe Guichet de l'AIDE remet à {{usager_prenom}} {{usager_nom}} le bon n° {{ticket_numero}} ({{ticket_index}}/{{ticket_total_count}}) d'une valeur de {{ticket_montant}} €.\n\nFait par {{guichetier_prenom}} {{guichetier_nom}} le {{date}}.\n\nÀ remplir par {{partenaire_structure}} : date de remise __________`}
              />
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Cliquez sur une balise pour l'insérer à l'endroit du curseur :
                </p>
                {[
                  {
                    titre: "Usager",
                    items: [
                      ["usager_prenom", "Prénom"],
                      ["usager_nom", "Nom"],
                      ["usager_numero", "N° usager"],
                      ["usager_email", "Email"],
                      ["usager_telephone", "Téléphone"],
                      ["usager_etablissement", "Établissement"],
                    ],
                  },
                  {
                    titre: "Guichetier",
                    items: [
                      ["guichetier_prenom", "Prénom"],
                      ["guichetier_nom", "Nom"],
                      ["guichetier_email", "Email"],
                      ["guichetier_fonction", "Fonction"],
                      ["structure", "Structure"],
                    ],
                  },
                  {
                    titre: "Dispositif",
                    items: [
                      ["dispositif", "Nom du dispositif"],
                      ["date", "Date du jour"],
                      ["montant", "Montant total"],
                      ["notes", "Notes"],
                      ["partenaire_structure", "Partenaire"],
                    ],
                  },
                  {
                    titre: "Bon / Ticket",
                    items: [
                      ["ticket_numero", "N° du bon"],
                      ["ticket_montant", "Montant du bon"],
                      ["ticket_index", "Index (1, 2…)"],
                      ["ticket_total_count", "Nombre total"],
                      ["ticket_expiration", "Expiration"],
                    ],
                  },
                ].map((groupe) => (
                  <div key={groupe.titre} className="flex flex-wrap items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground mr-1">
                      {groupe.titre} :
                    </span>
                    {groupe.items.map(([balise, label]) => (
                      <Button
                        key={balise}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => insertBalise(balise)}
                      >
                        + {label}
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            {item.id ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
