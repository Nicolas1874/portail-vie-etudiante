import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GENRES, TYPES_PUBLIC, ACCOMPAGNEMENT_PAEJ } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useTerritoireScope } from "@/lib/territoire-scope";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, UserSearch } from "lucide-react";
import {
  loadCorrespondance,
  getPromptsForBesoin,
  insertBesoinLinks,
  resolveMirrors,
  type Correspondance,
  type PromptResponses,
} from "@/lib/besoins-correspondance";
import { BesoinPromptDialog } from "@/components/BesoinPromptDialog";
import { ReorienterDialog } from "@/components/usager/ReorienterDialog";

export const Route = createFileRoute("/aide/usagers/nouveau")({
  component: NewUsager,
});

const NUMERO_ETUDIANT_RE = /^\d{8}$/;
const ETU_EMAIL_DOMAIN = "@etu.univ-orleans.fr";

type Besoin = {
  id: string;
  code: string;
  libelle: string;
  ordre: number;
  pour_etudiant: boolean;
  pour_pij: boolean;
  pour_paej: boolean;
};

type ExistingEtu = { id: string; prenom: string; nom: string } | null;

function NewUsager() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const territoireScope = useTerritoireScope();
  const [territoires, setTerritoires] = useState<{ id: string; nom: string; accueille_etudiant: boolean; accueille_pij: boolean; accueille_paej: boolean }[]>([]);
  const [structures, setStructures] = useState<
    { id: string; nom: string; territoire_id: string }[]
  >([]);
  const [besoins, setBesoins] = useState<Besoin[]>([]);
  const [corr, setCorr] = useState<Correspondance[]>([]);
  const [promptResponses, setPromptResponses] = useState<Record<string, PromptResponses>>({});
  const [pendingPrompt, setPendingPrompt] = useState<{ besoin: Besoin } | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [existingEtu, setExistingEtu] = useState<ExistingEtu>(null);
  const [checkingNumero, setCheckingNumero] = useState(false);
  // Réorientation différée : si l'utilisateur clique « Créer et réorienter »,
  // on crée d'abord la fiche, puis on ouvre le ReorienterDialog avec l'id obtenu.
  const [reorientApres, setReorientApres] = useState(false);
  const [nouvelUsager, setNouvelUsager] = useState<{
    id: string;
    prenom: string;
    nom: string;
    email: string | null;
    territoire_id: string;
    suiviId: string | null;
  } | null>(null);

  // Pour les non-admins : territoire & structure dérivés du profil utilisateur.
  // Pour les admins : on utilise le territoire sélectionné dans la barre du haut.
  const derivedTerritoireId = useMemo(() => {
    if (isAdmin) {
      return territoireScope.selected !== "all" ? territoireScope.selected : "";
    }
    return ""; // sera défini une fois la structure du profil chargée
  }, [isAdmin, territoireScope.selected]);

  const adminMustPickTerritoire = isAdmin && territoireScope.selected === "all";

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    date_naissance: "",
    genre: "non_precise",
    email: "",
    telephone: "",
    type_public: "etudiant" as "etudiant" | "pij" | "paej",
    numero_etudiant: "",
    composante: "",
    niveau_etudes: "",
    etablissement: "",
    territoire_id: "",
    structure_creatrice_id: "",
    consentement_actif: false,
    notes_internes: "",
    urgence: false,
    urgence_motif: "",
    mailing_optin: false,
    besoins_ids: [] as string[],
    precision_autre: "",
    motif_venue: "",
    solution_apportee: "",
    type_accompagnement: "individuel" as "individuel" | "parents" | "entourage_famille" | "autre",
    nb_parents: 0,
    nb_autres_accompagnants: 0,
  });

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: s }, { data: b }, c] = await Promise.all([
        supabase.from("territoires").select("id, nom, accueille_etudiant, accueille_pij, accueille_paej").order("nom"),
        supabase
          .from("structures")
          .select("id, nom, territoire_id")
          .eq("active", true)
          .order("nom"),
        supabase
          .from("besoins")
          .select("id, code, libelle, ordre, pour_etudiant, pour_pij, pour_paej")
          .eq("actif", true)
          .order("ordre"),
        loadCorrespondance(),
      ]);
      setTerritoires(t ?? []);
      setStructures(s ?? []);
      setBesoins((b ?? []) as Besoin[]);
      setCorr(c);

      // Non-admin : rattachement auto depuis le profil
      if (!isAdmin && profile?.structure_id) {
        const struct = (s ?? []).find((x) => x.id === profile.structure_id);
        if (struct) {
          setForm((f) => ({
            ...f,
            structure_creatrice_id: struct.id,
            territoire_id: struct.territoire_id,
          }));
        }
      } else if (isAdmin && derivedTerritoireId) {
        // Admin avec territoire sélectionné : pré-remplir le territoire,
        // laisser le choix de la structure.
        setForm((f) => ({
          ...f,
          territoire_id: derivedTerritoireId,
          structure_creatrice_id: "",
        }));
      }
    })();
  }, [profile, isAdmin, derivedTerritoireId]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isEtudiant = form.type_public === "etudiant";

  const allowedPublics = useMemo(() => {
    const t = territoires.find((x) => x.id === form.territoire_id);
    if (!t) return ["etudiant", "pij", "paej"] as const;
    const list: ("etudiant" | "pij" | "paej")[] = [];
    if (t.accueille_etudiant) list.push("etudiant");
    if (t.accueille_pij) list.push("pij");
    if (t.accueille_paej) list.push("paej");
    return list.length > 0 ? list : (["etudiant"] as ("etudiant" | "pij" | "paej")[]);
  }, [territoires, form.territoire_id]);

  useEffect(() => {
    if (!allowedPublics.includes(form.type_public)) {
      setForm((f) => ({ ...f, type_public: allowedPublics[0] }));
    }
  }, [allowedPublics, form.type_public]);

  // Reset du doublon si on change de numéro ou si on quitte le public étudiant
  useEffect(() => {
    setExistingEtu(null);
  }, [form.numero_etudiant, form.type_public]);

  // Auto-suffixe l'email étudiant
  useEffect(() => {
    if (!isEtudiant) return;
    if (!form.email) return;
    // Si l'utilisateur a tapé juste un identifiant sans @, on ne touche pas.
    // S'il a tapé un autre domaine, on prévient via validation au submit.
  }, [isEtudiant, form.email]);

  const besoinsFiltres = useMemo(() => {
    return besoins.filter((b) => {
      if (form.type_public === "etudiant") return b.pour_etudiant;
      if (form.type_public === "pij") return b.pour_pij;
      return b.pour_paej;
    });
  }, [besoins, form.type_public]);

  const aBesoinAutre = useMemo(() => {
    const codesAutre = besoinsFiltres
      .filter((b) => b.code === "etu_autre")
      .map((b) => b.id);
    return form.besoins_ids.some((id) => codesAutre.includes(id));
  }, [besoinsFiltres, form.besoins_ids]);

  // Vérification doublon n° étudiant
  const checkNumeroEtudiant = async (numero: string) => {
    if (!NUMERO_ETUDIANT_RE.test(numero)) {
      setExistingEtu(null);
      return;
    }
    setCheckingNumero(true);
    const { data, error } = await supabase
      .from("usagers")
      .select("id, prenom, nom")
      .eq("numero_etudiant", numero)
      .maybeSingle();
    setCheckingNumero(false);
    if (error) {
      console.error("Vérification n° étudiant", error);
      return;
    }
    if (data) {
      setExistingEtu(data as ExistingEtu);
      toast.error(`Cet étudiant existe déjà : ${data.prenom} ${data.nom}`);
    } else {
      setExistingEtu(null);
    }
  };

  const validateStep1 = (): string | null => {
    if (adminMustPickTerritoire)
      return "Sélectionnez un territoire dans la barre du haut avant de créer une fiche.";
    if (!form.prenom.trim()) return "Le prénom est obligatoire.";
    if (!form.nom.trim()) return "Le nom est obligatoire.";
    if (!form.date_naissance) return "La date de naissance est obligatoire.";
    if (!form.telephone.trim()) return "Le téléphone est obligatoire.";
    if (!form.email.trim()) return "L'e-mail est obligatoire.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Format d'e-mail invalide.";
    if (isEtudiant) {
      if (!form.email.trim().toLowerCase().endsWith(ETU_EMAIL_DOMAIN))
        return `L'e-mail étudiant doit se terminer par ${ETU_EMAIL_DOMAIN}.`;
      if (!NUMERO_ETUDIANT_RE.test(form.numero_etudiant.trim()))
        return "Le numéro étudiant doit contenir exactement 8 chiffres.";
      if (existingEtu)
        return "Ce numéro étudiant existe déjà — ouvrez la fiche existante.";
      if (!form.composante.trim()) return "La composante est obligatoire pour un étudiant.";
      if (!form.niveau_etudes.trim()) return "Le niveau d'études est obligatoire pour un étudiant.";
    }
    if (!form.territoire_id || !form.structure_creatrice_id)
      return "Territoire et structure obligatoires.";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (form.besoins_ids.length === 0)
      return "Sélectionnez au moins un besoin pour cet usager.";
    if (aBesoinAutre && !form.precision_autre.trim())
      return "Précisez le besoin « Autre ».";
    return null;
  };

  const goNext = () => {
    const err = validateStep1();
    if (err) {
      toast.error(err);
      return;
    }
    setStep(2);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);
    try {
      const situation =
        form.type_public === "etudiant"
          ? "etudiant"
          : form.type_public === "paej"
            ? "neet"
            : "autre";

      const usagerPayload: any = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        date_naissance: form.date_naissance,
        genre: form.genre,
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        type_public: form.type_public,
        situation,
        numero_etudiant: isEtudiant ? form.numero_etudiant.trim() : null,
        composante: isEtudiant ? form.composante.trim() : null,
        niveau_etudes: isEtudiant ? form.niveau_etudes.trim() : null,
        etablissement: isEtudiant ? form.etablissement.trim() || null : null,
        territoire_id: form.territoire_id,
        structure_creatrice_id: form.structure_creatrice_id,
        consentement_actif: form.consentement_actif,
        date_dernier_consentement: form.consentement_actif ? new Date().toISOString() : null,
        notes_internes: form.notes_internes || null,
        cree_par: profile?.id,
        urgence: form.urgence,
        urgence_motif: form.urgence ? (form.urgence_motif.trim() || null) : null,
        urgence_signalee_le: form.urgence ? new Date().toISOString() : null,
        mailing_optin: form.mailing_optin,
      };

      const { data: usagerCree, error: errU } = await supabase
        .from("usagers")
        .insert(usagerPayload)
        .select("id")
        .single();
      if (errU) throw errU;

      const usagerId = usagerCree!.id;

      if (form.consentement_actif) {
        await supabase.from("consentements").insert({
          usager_id: usagerId,
          accepte: true,
          contenu:
            "L'usager consent à la collecte et au traitement de ses données personnelles dans le cadre de l'accompagnement par le Guichet de l'AIDE et ses structures partenaires.",
          recueilli_par: profile?.id,
        });
      }

      const titreDemande =
        form.motif_venue.trim().slice(0, 80) || "Demande initiale";
      const { data: demandeCree, error: errD } = await supabase
        .from("demandes")
        .insert({
          usager_id: usagerId,
          structure_id: form.structure_creatrice_id,
          titre: titreDemande,
          description: form.motif_venue || null,
          typologie: "autre",
          statut: "nouvelle",
          priorite: form.urgence ? "urgente" : "normale",
          cree_par: profile?.id,
          type_accompagnement_paej: form.type_accompagnement,
          nb_parents: form.nb_parents,
          nb_autres_accompagnants: form.nb_autres_accompagnants,
        })
        .select("id")
        .single();
      if (errD) throw errD;

      if (form.besoins_ids.length > 0) {
        const selections = form.besoins_ids.map((bid) => {
          const isAutre =
            besoins.find((b) => b.id === bid)?.code === "etu_autre";
          return {
            besoin_id: bid,
            precision_libre: isAutre ? form.precision_autre || null : null,
            prompt_responses: promptResponses[bid],
          };
        });
        const { error: errLiens } = await insertBesoinLinks({
          table: "demandes_besoins",
          parentField: "demande_id",
          parentId: demandeCree!.id,
          selections,
          corr,
        });
        if (errLiens) throw new Error(errLiens);
      }

      // Crée la 1re venue (suivi) systématiquement dès qu'on a saisi quelque chose
      // OU qu'il y a au moins un besoin coché — sinon le parcours afficherait
      // « aucun besoin validé » alors que la fiche en contient.
      const shouldCreateSuivi =
        form.motif_venue.trim() ||
        form.solution_apportee.trim() ||
        form.besoins_ids.length > 0;
      let suiviCreeId: string | null = null;
      if (shouldCreateSuivi) {
        const { data: suiviRow, error: errS } = await supabase
          .from("suivis")
          .insert({
            usager_id: usagerId,
            structure_id: form.structure_creatrice_id,
            auteur_id: profile?.id,
            motif_venue: form.motif_venue || null,
            solution_apportee: form.solution_apportee || null,
          })
          .select("id")
          .single();
        if (errS) throw errS;
        suiviCreeId = suiviRow!.id;

        // Rattache les besoins cochés à la venue (suivis_besoins) en plus
        // de la demande, pour qu'ils apparaissent comme « validés » sur la venue.
        if (form.besoins_ids.length > 0) {
          const selectionsSuivi = form.besoins_ids.map((bid) => {
            const isAutre =
              besoins.find((b) => b.id === bid)?.code === "etu_autre";
            return {
              besoin_id: bid,
              precision_libre: isAutre ? form.precision_autre || null : null,
              prompt_responses: promptResponses[bid],
            };
          });
          const { error: errLiensSuivi } = await insertBesoinLinks({
            table: "suivis_besoins",
            parentField: "suivi_id",
            parentId: suiviCreeId,
            selections: selectionsSuivi,
            corr,
          });
          if (errLiensSuivi) throw new Error(errLiensSuivi);
        }
      }

      toast.success("Fiche créée");

      // Si l'utilisateur a demandé à enchaîner sur la réorientation,
      // on mémorise l'id pour ouvrir le dialog (le composant gère la suite).
      if (reorientApres) {
        setNouvelUsager({
          id: usagerId,
          prenom: form.prenom,
          nom: form.nom,
          email: form.email || null,
          territoire_id: form.territoire_id,
          suiviId: suiviCreeId,
        });
        setLoading(false);
        return;
      }

      navigate({ to: "/usagers/$id", params: { id: usagerId } });
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  // Structures filtrées sur le territoire courant
  const structuresPourTerritoire = useMemo(() => {
    if (!form.territoire_id) return [];
    return structures.filter((s) => s.territoire_id === form.territoire_id);
  }, [structures, form.territoire_id]);

  // Bloc d'avertissement pour admin sans territoire choisi
  if (adminMustPickTerritoire) {
    return (
      <div>
        <PageHeader
          title="Nouvelle fiche usager"
          description="Un territoire doit être sélectionné avant la saisie."
        />
        <div className="p-6 max-w-2xl">
          <Card className="border-amber-500/40 bg-amber-50/40">
            <CardContent className="pt-6 flex gap-4 items-start">
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-3">
                <h3 className="font-semibold text-amber-900">
                  Sélectionnez d'abord un territoire
                </h3>
                <p className="text-sm text-amber-900/80">
                  En tant qu'administrateur, vous avez accès à tous les
                  territoires. Pour créer une fiche usager, vous devez d'abord
                  choisir le territoire de rattachement dans la barre en haut
                  à droite (« Tous les territoires »).
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {territoires.map((t) => (
                    <Button
                      key={t.id}
                      size="sm"
                      variant="outline"
                      onClick={() => territoireScope.setSelected(t.id)}
                    >
                      {t.nom}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Nouvelle fiche usager"
        description={
          step === 1
            ? "Étape 1/2 — Identité, contact et rattachement"
            : "Étape 2/2 — Besoins exprimés et premier suivi"
        }
      />

      <div className="px-6 pt-4">
        <Stepper step={step} />
      </div>

      <form onSubmit={submit} className="p-6 max-w-4xl space-y-6">
        {step === 1 && (
          <>
            {allowedPublics.length > 1 && (
              <Section title="Type de public" cols={1}>
                <div className="md:col-span-2">
                  <Label htmlFor="public">Public principal *</Label>
                  <Select
                    value={form.type_public}
                    onValueChange={(v) =>
                      update("type_public", v as typeof form.type_public)
                    }
                  >
                    <SelectTrigger id="public" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPES_PUBLIC)
                        .filter(([k]) => allowedPublics.includes(k as "etudiant" | "pij" | "paej"))
                        .map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Selon le besoin coché à l'étape suivante, l'usager peut être
                    comptabilisé dans plusieurs publics (selon son âge).
                  </p>
                </div>
              </Section>
            )}

            <Section title="Identité">
              <Field label="Prénom *" id="prenom">
                <Input
                  id="prenom"
                  required
                  value={form.prenom}
                  onChange={(e) => update("prenom", e.target.value)}
                />
              </Field>
              <Field label="Nom *" id="nom">
                <Input
                  id="nom"
                  required
                  value={form.nom}
                  onChange={(e) => update("nom", e.target.value)}
                />
              </Field>
              <Field label="Date de naissance *" id="dn">
                <Input
                  id="dn"
                  type="date"
                  required
                  value={form.date_naissance}
                  onChange={(e) => update("date_naissance", e.target.value)}
                />
              </Field>
              <Field label="Genre" id="genre">
                <Select value={form.genre} onValueChange={(v) => update("genre", v)}>
                  <SelectTrigger id="genre">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GENRES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Section title="Contact">
              <Field label={isEtudiant ? `E-mail * (doit finir par ${ETU_EMAIL_DOMAIN})` : "E-mail *"} id="email">
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder={isEtudiant ? `prenom.nom${ETU_EMAIL_DOMAIN}` : ""}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <Field label="Téléphone *" id="tel">
                <Input
                  id="tel"
                  type="tel"
                  required
                  value={form.telephone}
                  onChange={(e) => update("telephone", e.target.value)}
                />
              </Field>
            </Section>

            {isEtudiant && (
              <Section title="Cursus universitaire">
                <Field label="N° étudiant * (8 chiffres)" id="ne">
                  <div className="space-y-2">
                    <Input
                      id="ne"
                      required
                      inputMode="numeric"
                      pattern="\d{8}"
                      maxLength={8}
                      placeholder="12345678"
                      value={form.numero_etudiant}
                      onChange={(e) =>
                        update(
                          "numero_etudiant",
                          e.target.value.replace(/\D/g, "").slice(0, 8),
                        )
                      }
                      onBlur={(e) => checkNumeroEtudiant(e.target.value)}
                    />
                    {checkingNumero && (
                      <p className="text-xs text-muted-foreground">Vérification…</p>
                    )}
                    {existingEtu && (
                      <div className="flex items-start gap-3 p-3 rounded-md border border-destructive/40 bg-destructive/5">
                        <UserSearch className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium text-destructive">
                            Un étudiant porte déjà ce numéro : {existingEtu.prenom} {existingEtu.nom}
                          </p>
                          <Button asChild size="sm" variant="outline">
                            <Link to="/usagers/$id" params={{ id: existingEtu.id }}>
                              Ouvrir la fiche existante
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Composante (UFR / école) *" id="comp">
                  <Input
                    id="comp"
                    required
                    placeholder="Ex : UFR LLSH, Polytech, IUT…"
                    value={form.composante}
                    onChange={(e) => update("composante", e.target.value)}
                  />
                </Field>
                <Field label="Niveau d'études *" id="niv">
                  <Input
                    id="niv"
                    required
                    placeholder="Ex : L1, L3, M2, Doctorat…"
                    value={form.niveau_etudes}
                    onChange={(e) => update("niveau_etudes", e.target.value)}
                  />
                </Field>
                <Field label="Établissement" id="etab">
                  <Input
                    id="etab"
                    placeholder="Université d'Orléans"
                    value={form.etablissement}
                    onChange={(e) => update("etablissement", e.target.value)}
                  />
                </Field>
              </Section>
            )}

            {/* Rattachement : visible uniquement pour admin (choix de la structure dans le territoire sélectionné) */}
            {isAdmin && (
              <Section title="Rattachement">
                <Field label="Territoire" id="terr">
                  <Input
                    id="terr"
                    readOnly
                    value={
                      territoires.find((t) => t.id === form.territoire_id)?.nom ?? ""
                    }
                  />
                </Field>
                <Field label="Structure créatrice *" id="str">
                  <Select
                    value={form.structure_creatrice_id}
                    onValueChange={(v) => update("structure_creatrice_id", v)}
                  >
                    <SelectTrigger id="str">
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {structuresPourTerritoire.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Section>
            )}

            {/* Pour non-admin : récapitulatif discret */}
            {!isAdmin && form.structure_creatrice_id && (
              <Section title="Rattachement" cols={1}>
                <p className="md:col-span-2 text-sm text-muted-foreground">
                  Cette fiche sera rattachée automatiquement à votre structure
                  {" «"} {structures.find((s) => s.id === form.structure_creatrice_id)?.nom} {"» "}
                  ({territoires.find((t) => t.id === form.territoire_id)?.nom}).
                </p>
              </Section>
            )}

            <Section title="Situation d'urgence" cols={1}>
              <div className="md:col-span-2 flex items-start gap-3 p-4 rounded-md border border-destructive/30 bg-destructive/5">
                <Checkbox
                  id="urg"
                  checked={form.urgence}
                  onCheckedChange={(v) => update("urgence", !!v)}
                />
                <div className="flex-1">
                  <Label htmlFor="urg" className="cursor-pointer text-sm font-medium">
                    Cet usager est en situation d'urgence
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sa fiche sera mise en évidence (surlignée et remontée en haut de la liste) tant que la case reste cochée.
                  </p>
                </div>
              </div>
              {form.urgence && (
                <div className="md:col-span-2">
                  <Label htmlFor="urgmotif">Précision (optionnel)</Label>
                  <Input
                    id="urgmotif"
                    className="mt-1.5"
                    placeholder="Ex : sans hébergement ce soir, idées suicidaires…"
                    value={form.urgence_motif}
                    onChange={(e) => update("urgence_motif", e.target.value)}
                  />
                </div>
              )}
            </Section>

            {isEtudiant && (
              <Section title="Mailing list étudiante" cols={1}>
                <div className="md:col-span-2 flex items-start gap-3 p-4 rounded-md border border-border bg-muted/30">
                  <Checkbox
                    id="mail"
                    checked={form.mailing_optin}
                    onCheckedChange={(v) => update("mailing_optin", !!v)}
                  />
                  <div>
                    <Label htmlFor="mail" className="cursor-pointer text-sm font-medium">
                      L'étudiant accepte d'être ajouté à la mailing list
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vous pourrez le retrouver dans la liste « À inscrire » et confirmer son ajout effectif.
                    </p>
                  </div>
                </div>
              </Section>
            )}

            <Section title="RGPD" cols={1}>
              <div className="md:col-span-2 flex items-start gap-3 p-4 rounded-md border border-border bg-muted/30">
                <Checkbox
                  id="cons"
                  checked={form.consentement_actif}
                  onCheckedChange={(v) => update("consentement_actif", !!v)}
                />
                <div>
                  <Label htmlFor="cons" className="cursor-pointer text-sm font-medium">
                    L'usager a donné son consentement éclairé
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    L'usager autorise la collecte et le traitement de ses données dans
                    le cadre de l'accompagnement et le partage avec les structures
                    partenaires habilitées. Durée de conservation : 36 mois.
                  </p>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes internes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  className="mt-1.5"
                  value={form.notes_internes}
                  onChange={(e) => update("notes_internes", e.target.value)}
                />
              </div>
            </Section>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/usagers" })}
              >
                Annuler
              </Button>
              <Button type="button" onClick={goNext}>
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Section title={`Besoins exprimés (${TYPES_PUBLIC[form.type_public]})`} cols={1}>
              <p className="md:col-span-2 text-sm text-muted-foreground -mt-2">
                Cochez tous les besoins qui s'appliquent. Selon les besoins, l'usager
                pourra être comptabilisé automatiquement dans les autres publics
                (selon son âge).
              </p>
              <div className="md:col-span-2 grid sm:grid-cols-2 gap-2">
                {besoinsFiltres.map((b) => {
                  const checked = form.besoins_ids.includes(b.id);
                  const prompts = getPromptsForBesoin(b.id, corr);
                  const mirrorIds = checked
                    ? resolveMirrors(b.id, corr, promptResponses[b.id])
                    : [];
                  const mirrorLabels = mirrorIds
                    .map((id) => besoins.find((x) => x.id === id)?.libelle)
                    .filter(Boolean) as string[];
                  return (
                    <label
                      key={b.id}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          if (v) {
                            update("besoins_ids", [...form.besoins_ids, b.id]);
                            if (prompts.length > 0) {
                              setPendingPrompt({ besoin: b });
                            }
                          } else {
                            update(
                              "besoins_ids",
                              form.besoins_ids.filter((x) => x !== b.id),
                            );
                            setPromptResponses((r) => {
                              const n = { ...r };
                              delete n[b.id];
                              return n;
                            });
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-sm">{b.libelle}</div>
                        {checked && prompts.length > 0 && (
                          <button
                            type="button"
                            className="text-[11px] text-primary underline mt-1"
                            onClick={(e) => {
                              e.preventDefault();
                              setPendingPrompt({ besoin: b });
                            }}
                          >
                            {mirrorLabels.length > 0
                              ? `+ ${mirrorLabels.join(", ")} (modifier)`
                              : "Préciser…"}
                          </button>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {aBesoinAutre && (
                <div className="md:col-span-2">
                  <Label htmlFor="precAutre">Précision « Autre » *</Label>
                  <Input
                    id="precAutre"
                    className="mt-1.5"
                    value={form.precision_autre}
                    onChange={(e) => update("precision_autre", e.target.value)}
                    placeholder="Précisez le besoin…"
                  />
                </div>
              )}
            </Section>

            <Section title="Accompagnement le jour de la venue">
              <Field label="Type d'accompagnement" id="acc">
                <Select
                  value={form.type_accompagnement}
                  onValueChange={(v) => update("type_accompagnement", v as typeof form.type_accompagnement)}
                >
                  <SelectTrigger id="acc">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOMPAGNEMENT_PAEJ).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Nb de parents accompagnants" id="nbpar">
                <Input
                  id="nbpar"
                  type="number"
                  min={0}
                  value={form.nb_parents}
                  onChange={(e) => update("nb_parents", Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Nb d'autres accompagnants" id="nbaut">
                <Input
                  id="nbaut"
                  type="number"
                  min={0}
                  value={form.nb_autres_accompagnants}
                  onChange={(e) => update("nb_autres_accompagnants", Number(e.target.value) || 0)}
                />
              </Field>
            </Section>

            <Section title="Premier suivi" cols={1}>
              <div className="md:col-span-2">
                <Label htmlFor="motif">Motif de venue</Label>
                <Textarea
                  id="motif"
                  rows={3}
                  className="mt-1.5"
                  placeholder="Pourquoi la personne est venue ce jour ?"
                  value={form.motif_venue}
                  onChange={(e) => update("motif_venue", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="solution">Solution apportée</Label>
                <Textarea
                  id="solution"
                  rows={3}
                  className="mt-1.5"
                  placeholder="Réponse, orientation, document remis…"
                  value={form.solution_apportee}
                  onChange={(e) => update("solution_apportee", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Ces deux champs constituent la première entrée du journal de
                  suivi de l'usager. Vous pourrez en ajouter d'autres à chaque
                  visite, depuis l'onglet « Suivi » de sa fiche.
                </p>
              </div>
            </Section>

            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/usagers" })}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={loading}
                  onClick={() => setReorientApres(true)}
                  title="Crée la fiche puis ouvre le dialog de réorientation"
                >
                  {loading && reorientApres ? "Création…" : "Créer et réorienter"}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  onClick={() => setReorientApres(false)}
                >
                  {loading && !reorientApres ? "Création…" : "Créer la fiche"}
                  {!loading && <Check className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </form>

      {pendingPrompt && (
        <BesoinPromptDialog
          open
          prompts={getPromptsForBesoin(pendingPrompt.besoin.id, corr)}
          besoinLibelle={pendingPrompt.besoin.libelle}
          initial={promptResponses[pendingPrompt.besoin.id]}
          onCancel={() => setPendingPrompt(null)}
          onConfirm={(resp) => {
            setPromptResponses((r) => ({ ...r, [pendingPrompt.besoin.id]: resp }));
            setPendingPrompt(null);
          }}
        />
      )}

      {nouvelUsager && (
        <ReorienterDialog
          open
          onOpenChange={(o) => {
            if (!o) {
              const id = nouvelUsager.id;
              setNouvelUsager(null);
              navigate({ to: "/usagers/$id", params: { id } });
            }
          }}
          usager={{
            id: nouvelUsager.id,
            prenom: nouvelUsager.prenom,
            nom: nouvelUsager.nom,
            email: nouvelUsager.email,
            territoire_id: nouvelUsager.territoire_id,
          }}
          suiviId={nouvelUsager.suiviId}
          structureId={form.structure_creatrice_id}
        />
      )}
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <ol className="flex items-center gap-3 text-sm">
      <Step n={1} active={step === 1} done={step > 1} label="Identité" />
      <div className="h-px w-8 bg-border" />
      <Step n={2} active={step === 2} done={false} label="Besoins & suivi" />
    </ol>
  );
}

function Step({
  n,
  active,
  done,
  label,
}: {
  n: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
          done
            ? "bg-primary text-primary-foreground"
            : active
              ? "bg-primary/10 text-primary border border-primary"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </span>
      <span
        className={
          active || done ? "font-medium" : "text-muted-foreground"
        }
      >
        {label}
      </span>
    </li>
  );
}

function Section({
  title,
  children,
  cols = 2,
}: {
  title: string;
  children: React.ReactNode;
  cols?: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {title}
        </h3>
        <div className={`grid gap-4 ${cols === 1 ? "" : "md:grid-cols-2"}`}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
  className,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
