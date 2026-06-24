import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, AlertTriangle, FileText, TrendingUp, Presentation, Package } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { USAGER_TYPE_PUBLIC } from "@/lib/aide/labels";
import { downloadXlsx } from "@/lib/aide/xlsx-export";
import { genererRapportAnnuel } from "@/lib/aide/rapport-annuel";
import { genererRapportBilanPptx, genererRapportComparaisonPptx } from "@/lib/aide/rapport-annuel-pptx";


export const Route = createFileRoute("/aide/exports")({
  component: ExportsPage,
});

type PublicFilter = "all" | "etudiant" | "pij" | "paej";

interface Territoire {
  id: string;
  nom: string;
}

function ExportsPage() {
  const { isAdmin, hasRole, loading } = useAuth();
  const canAccess = isAdmin || hasRole("superviseur");

  const today = new Date();
  const firstOfYear = new Date(today.getFullYear(), 0, 1);
  const [from, setFrom] = useState(firstOfYear.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [publicFilter, setPublicFilter] = useState<PublicFilter>("all");
  const [territoireId, setTerritoireId] = useState<string>("all");
  const [territoires, setTerritoires] = useState<Territoire[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [alertes, setAlertes] = useState<{ suivis: number; demandes: number }>({
    suivis: 0,
    demandes: 0,
  });
  const [anneeRapport, setAnneeRapport] = useState<number>(today.getFullYear());
  const [combo, setCombo] = useState<Record<string, boolean>>({
    usagers: true, demandes: true, besoins: true, cp: true, presto: true, logement: true, ateliers: false, venues: false,
  });

  useEffect(() => {
    if (!canAccess) return;
    supabase
      .from("territoires")
      .select("id, nom")
      .order("nom")
      .then(({ data }) => setTerritoires((data as Territoire[]) ?? []));

    Promise.all([
      supabase
        .from("vw_suivis_sans_besoin" as never)
        .select("*", { count: "exact", head: true }),
      supabase
        .from("vw_demandes_sans_besoin" as never)
        .select("*", { count: "exact", head: true }),
    ]).then(([s, d]) => {
      setAlertes({ suivis: s.count ?? 0, demandes: d.count ?? 0 });
    });
  }, [canAccess]);

  if (loading) return <div className="p-8">Chargement…</div>;
  if (!canAccess) return <Navigate to="/" />;

  const fromTs = `${from}T00:00:00`;
  const toTs = `${to}T23:59:59`;

  // Map territoire id -> nom (chargée au montage)
  const territoireNom = (id?: string | null) =>
    (id && territoires.find((t) => t.id === id)?.nom) || "—";

  // Format DD-MM-AAAA (sans heure)
  const fmtDate = (v: string | null | undefined) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  };

  const exportUsagers = async () => {
    setBusy("usagers");
    try {
      // Requête principale légère : pas de jointure 4 niveaux (cause d'échec silencieux)
      let q = supabase
        .from("usagers")
        .select(
          "id, nom, prenom, date_naissance, genre, email, telephone, code_postal, situation, type_public, etablissement, niveau_etudes, numero_etudiant, territoire_id, consentement_actif, created_at",
        )
        .eq("archive", false)
        .gte("created_at", fromTs)
        .lte("created_at", toTs);
      if (territoireId !== "all") q = q.eq("territoire_id", territoireId);
      if (publicFilter !== "all") q = q.eq("type_public", publicFilter);
      const { data: usagers, error } = await q;
      if (error) throw error;
      const ids = (usagers ?? []).map((u: any) => u.id);

      // Besoins via demandes + suivis, agrégés côté client
      const besoinsParUsager = new Map<string, Set<string>>();
      if (ids.length) {
        const [db, sb] = await Promise.all([
          supabase.from("demandes").select("usager_id, demandes_besoins(besoins(libelle))").in("usager_id", ids),
          supabase.from("suivis").select("usager_id, suivis_besoins(besoins(libelle))").in("usager_id", ids),
        ]);
        const add = (uid: string, l: string) => {
          if (!besoinsParUsager.has(uid)) besoinsParUsager.set(uid, new Set());
          besoinsParUsager.get(uid)!.add(l);
        };
        (db.data ?? []).forEach((d: any) =>
          (d.demandes_besoins ?? []).forEach((x: any) => x.besoins?.libelle && add(d.usager_id, x.besoins.libelle)),
        );
        (sb.data ?? []).forEach((s: any) =>
          (s.suivis_besoins ?? []).forEach((x: any) => x.besoins?.libelle && add(s.usager_id, x.besoins.libelle)),
        );
      }

      const rows = (usagers ?? []).map((u: any) => {
        const besoins = besoinsParUsager.get(u.id) ?? new Set<string>();
        return {
          nom: u.nom,
          prenom: u.prenom,
          public: USAGER_TYPE_PUBLIC[u.type_public] ?? u.type_public ?? "",
          territoire: territoireNom(u.territoire_id),
          etablissement: u.etablissement,
          numero_etudiant: u.numero_etudiant,
          date_naissance: fmtDate(u.date_naissance),
          email: u.email,
          telephone: u.telephone,
          code_postal: u.code_postal,
          besoins_identifies: Array.from(besoins).join(" | "),
          nb_besoins: besoins.size,
          consentement_actif: u.consentement_actif,
          cree_le: fmtDate(u.created_at),
        };
      });
      downloadXlsx(`usagers_${from}_${to}`, rows);
      toast.success(`${rows.length} usager(s) exporté(s)`);
    } catch (e) {
      console.error("export usagers", e);
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const exportVenues = async () => {
    setBusy("venues");
    try {
      const { data, error } = await supabase
        .from("suivis")
        .select(
          "id, date_visite, usager_id, usagers!inner(nom, prenom, type_public, territoire_id), suivis_besoins(besoins(libelle))",
        )
        .gte("date_visite", from)
        .lte("date_visite", to);
      if (error) throw error;
      const rows = (data ?? [])
        .filter((r: any) => {
          const u = r.usagers;
          if (territoireId !== "all" && u?.territoire_id !== territoireId) return false;
          if (publicFilter !== "all" && u?.type_public !== publicFilter) return false;
          return true;
        })
        .map((r: any) => ({
          date: fmtDate(r.date_visite),
          usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
          public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "",
          territoire: territoireNom(r.usagers?.territoire_id),
          besoins: (r.suivis_besoins ?? [])
            .map((sb: any) => sb.besoins?.libelle)
            .filter(Boolean)
            .join(" | "),
          nb_besoins: (r.suivis_besoins ?? []).filter((sb: any) => sb.besoins?.libelle).length,
        }));
      downloadXlsx(`venues_${from}_${to}`, rows);
      toast.success(`${rows.length} venue(s) exportée(s)`);
    } catch (e) {
      console.error("export venues", e);
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const exportDemandes = async () => {
    setBusy("demandes");
    try {
      const { data, error } = await supabase
        .from("demandes")
        .select(
          "id, titre, typologie, statut, priorite, created_at, date_cloture, usager_id, usagers!inner(nom, prenom, type_public, territoire_id), demandes_besoins(besoins(libelle))",
        )
        .gte("created_at", fromTs)
        .lte("created_at", toTs);
      if (error) throw error;
      const rows = (data ?? [])
        .filter((r: any) => {
          const u = r.usagers;
          if (territoireId !== "all" && u?.territoire_id !== territoireId) return false;
          if (publicFilter !== "all" && u?.type_public !== publicFilter) return false;
          return true;
        })
        .map((r: any) => ({
          titre: r.titre,
          typologie: r.typologie,
          statut: r.statut,
          priorite: r.priorite,
          cree_le: fmtDate(r.created_at),
          cloture_le: fmtDate(r.date_cloture),
          usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
          public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "",
          territoire: territoireNom(r.usagers?.territoire_id),
          besoins: (r.demandes_besoins ?? [])
            .map((db: any) => db.besoins?.libelle)
            .filter(Boolean)
            .join(" | "),
          nb_besoins: (r.demandes_besoins ?? []).filter((db: any) => db.besoins?.libelle).length,
        }));
      downloadXlsx(`sollicitations_${from}_${to}`, rows);
      toast.success(`${rows.length} sollicitation(s) exportée(s)`);
    } catch (e) {
      console.error("export demandes", e);
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Besoins agrégés ventilés par thème : un classeur multi-feuilles
   *  - Synthèse (toutes sources)
   *  - Étudiant / PIJ / PAEJ
   *  - Par territoire (matrice besoin × territoire)
   */
  const exportBesoinsAgreges = async () => {
    setBusy("besoins");
    try {
      const [{ data: db }, { data: sb }] = await Promise.all([
        supabase
          .from("demandes_besoins")
          .select(
            "besoin_id, besoins(libelle, code), demandes!inner(created_at, usagers!inner(type_public, territoire_id))",
          )
          .gte("demandes.created_at", fromTs)
          .lte("demandes.created_at", toTs),
        supabase
          .from("suivis_besoins")
          .select(
            "besoin_id, besoins(libelle, code), suivis!inner(date_visite, usagers!inner(type_public, territoire_id))",
          )
          .gte("suivis.date_visite", from)
          .lte("suivis.date_visite", to),
      ]);

      type Row = { libelle: string; code: string };
      const labelOf = new Map<string, Row>();
      // global
      const total = new Map<string, { demandes: number; venues: number }>();
      // par public
      const parPublic = new Map<string, Map<string, number>>(); // public -> besoin -> n
      // par territoire (matrice)
      const parTerr = new Map<string, Map<string, number>>(); // besoin -> territoireNom -> n
      const territoiresVus = new Set<string>();

      const bump = (
        besoinId: string,
        libelle: string,
        code: string,
        u: any,
        bucket: "demandes" | "venues",
      ) => {
        if (territoireId !== "all" && u?.territoire_id !== territoireId) return;
        if (publicFilter !== "all" && u?.type_public !== publicFilter) return;
        labelOf.set(besoinId, { libelle, code });
        const t = total.get(besoinId) ?? { demandes: 0, venues: 0 };
        t[bucket] += 1;
        total.set(besoinId, t);

        const pub = u?.type_public ?? "autre";
        if (!parPublic.has(pub)) parPublic.set(pub, new Map());
        const pMap = parPublic.get(pub)!;
        pMap.set(besoinId, (pMap.get(besoinId) ?? 0) + 1);

        const terrNom = territoireNom(u?.territoire_id);
        territoiresVus.add(terrNom);
        if (!parTerr.has(besoinId)) parTerr.set(besoinId, new Map());
        const tMap = parTerr.get(besoinId)!;
        tMap.set(terrNom, (tMap.get(terrNom) ?? 0) + 1);
      };

      (db ?? []).forEach((r: any) =>
        bump(r.besoin_id, r.besoins?.libelle ?? "", r.besoins?.code ?? "", r.demandes?.usagers, "demandes"),
      );
      (sb ?? []).forEach((r: any) =>
        bump(r.besoin_id, r.besoins?.libelle ?? "", r.besoins?.code ?? "", r.suivis?.usagers, "venues"),
      );

      const sortByTotalDesc = (a: any, b: any) => b.total - a.total;

      // Feuille Synthèse
      const synthese = Array.from(total.entries())
        .map(([id, v]) => ({
          code: labelOf.get(id)?.code ?? "",
          besoin: labelOf.get(id)?.libelle ?? "",
          depuis_demandes: v.demandes,
          depuis_venues: v.venues,
          total: v.demandes + v.venues,
        }))
        .sort(sortByTotalDesc);

      // Feuilles par public
      const sheets: Record<string, Record<string, unknown>[]> = { Synthèse: synthese };
      ["etudiant", "pij", "paej"].forEach((pub) => {
        const pMap = parPublic.get(pub);
        const rows = pMap
          ? Array.from(pMap.entries())
              .map(([id, n]) => ({
                code: labelOf.get(id)?.code ?? "",
                besoin: labelOf.get(id)?.libelle ?? "",
                total: n,
              }))
              .sort(sortByTotalDesc)
          : [];
        sheets[USAGER_TYPE_PUBLIC[pub]?.slice(0, 31) ?? pub] = rows;
      });

      // Feuille par territoire (matrice besoin × territoire)
      const terrCols = Array.from(territoiresVus).sort();
      const matrice = Array.from(parTerr.entries())
        .map(([id, m]) => {
          const row: Record<string, unknown> = {
            code: labelOf.get(id)?.code ?? "",
            besoin: labelOf.get(id)?.libelle ?? "",
          };
          let tot = 0;
          terrCols.forEach((t) => {
            const n = m.get(t) ?? 0;
            row[t] = n;
            tot += n;
          });
          row.total = tot;
          return row;
        })
        .sort((a: any, b: any) => (b.total as number) - (a.total as number));
      sheets["Par territoire"] = matrice;

      downloadXlsx(`besoins_par_theme_${from}_${to}`, sheets);
      toast.success(`Besoins ventilés exportés (${synthese.length} besoin(s))`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const exportCoupsPouce = async () => {
    setBusy("cp");
    try {
      const { data, error } = await supabase
        .from("coups_pouce")
        .select(
          "id, date_demande, date_decision, statut, montant, dispositif_id, coups_pouce_dispositifs(libelle, type), usager_id, usagers!inner(nom, prenom, type_public, territoire_id)",
        )
        .gte("date_demande", from)
        .lte("date_demande", to);
      if (error) throw error;
      const rows = (data ?? [])
        .filter((r: any) => {
          const u = r.usagers;
          if (territoireId !== "all" && u?.territoire_id !== territoireId) return false;
          if (publicFilter !== "all" && u?.type_public !== publicFilter) return false;
          return true;
        })
        .map((r: any) => ({
          date_demande: fmtDate(r.date_demande),
          date_decision: fmtDate(r.date_decision),
          statut: r.statut,
          montant: r.montant,
          dispositif: r.coups_pouce_dispositifs?.libelle,
          type: r.coups_pouce_dispositifs?.type,
          usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
          public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "",
          territoire: territoireNom(r.usagers?.territoire_id),
        }));
      downloadXlsx(`coups_pouce_${from}_${to}`, rows);
      toast.success(`${rows.length} coup(s) de pouce exporté(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const exportAteliers = async () => {
    setBusy("ateliers");
    try {
      const { data, error } = await supabase
        .from("ateliers_inscriptions")
        .select(
          "id, prenom, nom, email, telephone, statut, created_at, ateliers_sessions!inner(date_debut, lieu, ateliers!inner(titre))",
        )
        .gte("created_at", fromTs)
        .lte("created_at", toTs);
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => ({
        atelier: r.ateliers_sessions?.ateliers?.titre,
        date_session: fmtDate(r.ateliers_sessions?.date_debut),
        lieu: r.ateliers_sessions?.lieu,
        inscrit_le: fmtDate(r.created_at),
        nom: r.nom,
        prenom: r.prenom,
        email: r.email,
        telephone: r.telephone,
        statut: r.statut,
      }));
      downloadXlsx(`ateliers_inscriptions_${from}_${to}`, rows);
      toast.success(`${rows.length} inscription(s) exportée(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  /** Comparatif interannuel : N vs N-1 sur usagers / demandes / venues, par mois. */
  const exportComparatif = async () => {
    setBusy("comparatif");
    try {
      const annee = anneeRapport;
      const prev = annee - 1;
      const ranges = [
        { label: String(prev), from: `${prev}-01-01`, to: `${prev}-12-31` },
        { label: String(annee), from: `${annee}-01-01`, to: `${annee}-12-31` },
      ];
      const buckets: Record<string, Record<string, number>> = {};
      for (const r of ranges) {
        let uq = supabase
          .from("usagers")
          .select("created_at, territoire_id")
          .eq("archive", false)
          .gte("created_at", `${r.from}T00:00:00`)
          .lte("created_at", `${r.to}T23:59:59`);
        if (territoireId !== "all") uq = uq.eq("territoire_id", territoireId);
        const { data: us } = await uq;

        let dq = supabase
          .from("demandes")
          .select("created_at, usagers!inner(territoire_id)")
          .gte("created_at", `${r.from}T00:00:00`)
          .lte("created_at", `${r.to}T23:59:59`);
        if (territoireId !== "all") dq = dq.eq("usagers.territoire_id", territoireId);
        const { data: ds } = await dq;

        let vq = supabase
          .from("suivis")
          .select("date_visite, usagers!inner(territoire_id)")
          .gte("date_visite", r.from)
          .lte("date_visite", r.to);
        if (territoireId !== "all") vq = vq.eq("usagers.territoire_id", territoireId);
        const { data: vs } = await vq;

        for (let m = 1; m <= 12; m++) {
          const key = String(m).padStart(2, "0");
          buckets[key] = buckets[key] ?? {};
          buckets[key][`usagers_${r.label}`] = 0;
          buckets[key][`demandes_${r.label}`] = 0;
          buckets[key][`venues_${r.label}`] = 0;
        }
        (us ?? []).forEach((u: any) => {
          const m = String(new Date(u.created_at).getMonth() + 1).padStart(2, "0");
          buckets[m][`usagers_${r.label}`]++;
        });
        (ds ?? []).forEach((d: any) => {
          const m = String(new Date(d.created_at).getMonth() + 1).padStart(2, "0");
          buckets[m][`demandes_${r.label}`]++;
        });
        (vs ?? []).forEach((v: any) => {
          const m = String(new Date(v.date_visite).getMonth() + 1).padStart(2, "0");
          buckets[m][`venues_${r.label}`]++;
        });
      }
      const rows = Object.entries(buckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mois, vals]) => ({ mois, ...vals }));
      downloadXlsx(`comparatif_${prev}_vs_${annee}`, rows);
      toast.success(`Comparatif ${prev} / ${annee} généré`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const rapportPdf = async () => {
    setBusy("rapport");
    try {
      const territoire = territoires.find((t) => t.id === territoireId);
      await genererRapportAnnuel({
        annee: anneeRapport,
        territoireId: territoireId === "all" ? null : territoireId,
        territoireNom: territoireId === "all" ? null : (territoire?.nom ?? null),
      });
      toast.success("Rapport annuel PDF généré");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de génération");
    } finally {
      setBusy(null);
    }
  };

  const rapportPptxBilan = async () => {
    setBusy("rapport-bilan");
    try {
      const territoire = territoires.find((t) => t.id === territoireId);
      await genererRapportBilanPptx({
        annee: anneeRapport,
        territoireId: territoireId === "all" ? null : territoireId,
        territoireNom: territoireId === "all" ? null : (territoire?.nom ?? null),
      });
      toast.success("Bilan PPTX généré");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de génération PPTX");
    } finally {
      setBusy(null);
    }
  };

  const rapportPptxComparaison = async () => {
    setBusy("rapport-comp");
    try {
      const territoire = territoires.find((t) => t.id === territoireId);
      await genererRapportComparaisonPptx({
        annee: anneeRapport,
        territoireId: territoireId === "all" ? null : territoireId,
        territoireNom: territoireId === "all" ? null : (territoire?.nom ?? null),
      });
      toast.success("Comparatif PPTX généré");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de génération PPTX");
    } finally {
      setBusy(null);
    }
  };

  const exportPresto = async () => {
    setBusy("presto");
    try {
      let q = supabase
        .from("presto_requests")
        .select("id, date_demande, date_recup, date_retour_prevue, date_retour_effectif, statut, type_pret, urgence, usagers!inner(nom, prenom, type_public, territoire_id)")
        .gte("date_demande", fromTs)
        .lte("date_demande", toTs);
      if (territoireId !== "all") q = q.eq("usagers.territoire_id", territoireId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? [])
        .filter((r: any) => publicFilter === "all" || r.usagers?.type_public === publicFilter)
        .map((r: any) => ({
          date_demande: fmtDate(r.date_demande),
          statut: r.statut,
          type_pret: r.type_pret,
          urgence: r.urgence,
          date_recup: fmtDate(r.date_recup),
          date_retour_prevue: fmtDate(r.date_retour_prevue),
          date_retour_effectif: fmtDate(r.date_retour_effectif),
          usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
          public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "",
          territoire: territoireNom(r.usagers?.territoire_id),
        }));
      downloadXlsx(`presto_${from}_${to}`, rows);
      toast.success(`${rows.length} prêt(s) PRESTO exporté(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const exportLogement = async () => {
    setBusy("logement");
    try {
      let q = supabase
        .from("logement_dossiers")
        .select("id, created_at, date_debut, date_fin_prevue, date_fin, statut, hebergement_type, hebergement_lieu, hebergement_cout, bail_signe_le, logement_programmes(nom), usagers!inner(nom, prenom, type_public, territoire_id)")
        .gte("created_at", fromTs)
        .lte("created_at", toTs);
      if (territoireId !== "all") q = q.eq("usagers.territoire_id", territoireId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? [])
        .filter((r: any) => publicFilter === "all" || r.usagers?.type_public === publicFilter)
        .map((r: any) => ({
          cree_le: fmtDate(r.created_at),
          statut: r.statut,
          programme: r.logement_programmes?.nom ?? "",
          hebergement_type: r.hebergement_type,
          hebergement_lieu: r.hebergement_lieu,
          hebergement_cout: r.hebergement_cout,
          date_debut: fmtDate(r.date_debut),
          date_fin_prevue: fmtDate(r.date_fin_prevue),
          date_fin: fmtDate(r.date_fin),
          bail_signe_le: fmtDate(r.bail_signe_le),
          usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
          public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "",
          territoire: territoireNom(r.usagers?.territoire_id),
        }));
      downloadXlsx(`logement_${from}_${to}`, rows);
      toast.success(`${rows.length} dossier(s) logement exporté(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const groupByMonth = <T extends Record<string, unknown>>(rows: T[], dateKey: string): Record<string, T[]> => {
    const out: Record<string, T[]> = {};
    rows.forEach((r) => {
      const v = r[dateKey] as string | null | undefined;
      const k = v ? String(v).slice(0, 7) : "sans_date"; // attendu YYYY-MM-...
      (out[k] ??= []).push(r);
    });
    return out;
  };

  const monthsCount = () => {
    const a = new Date(from), b = new Date(to);
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
  };

  // Combo : `_grp` (YYYY-MM-DD ISO, masqué à la sortie) sert au regroupement mensuel ;
  // les colonnes affichées au public sont déjà formatées DD-MM-AAAA.
  type ComboLoader = { dateKey: string; load: () => Promise<Record<string, unknown>[]> };
  const stripGrp = (rows: Record<string, unknown>[]) => rows.map(({ _grp, ...rest }) => rest);
  const fetchersForCombo: Record<string, ComboLoader> = {
    usagers: { dateKey: "_grp", load: async () => {
      let q = supabase.from("usagers").select("nom, prenom, type_public, etablissement, code_postal, territoire_id, created_at, urgence").eq("archive", false).gte("created_at", fromTs).lte("created_at", toTs);
      if (territoireId !== "all") q = q.eq("territoire_id", territoireId);
      if (publicFilter !== "all") q = q.eq("type_public", publicFilter);
      const { data } = await q;
      return (data ?? []).map((u: any) => ({
        _grp: u.created_at, nom: u.nom, prenom: u.prenom,
        public: USAGER_TYPE_PUBLIC[u.type_public] ?? u.type_public, etablissement: u.etablissement, code_postal: u.code_postal,
        urgence: u.urgence, territoire: territoireNom(u.territoire_id), cree_le: fmtDate(u.created_at),
      }));
    }},
    demandes: { dateKey: "_grp", load: async () => {
      const { data } = await supabase.from("demandes").select("titre, typologie, statut, priorite, created_at, date_cloture, usagers!inner(nom, prenom, type_public, territoire_id), demandes_besoins(besoins(libelle))").gte("created_at", fromTs).lte("created_at", toTs);
      return (data ?? []).filter((r: any) => (territoireId === "all" || r.usagers?.territoire_id === territoireId) && (publicFilter === "all" || r.usagers?.type_public === publicFilter)).map((r: any) => ({
        _grp: r.created_at, titre: r.titre, typologie: r.typologie, statut: r.statut, priorite: r.priorite,
        cree_le: fmtDate(r.created_at), cloture_le: fmtDate(r.date_cloture),
        usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
        public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "", territoire: territoireNom(r.usagers?.territoire_id),
        besoins: (r.demandes_besoins ?? []).map((db: any) => db.besoins?.libelle).filter(Boolean).join(" | "),
      }));
    }},
    besoins: { dateKey: "_grp", load: async () => {
      const [{ data: db }, { data: sb }] = await Promise.all([
        supabase.from("demandes_besoins").select("besoin_id, besoins(libelle, code), demandes!inner(created_at, usagers!inner(type_public, territoire_id))").gte("demandes.created_at", fromTs).lte("demandes.created_at", toTs),
        supabase.from("suivis_besoins").select("besoin_id, besoins(libelle, code), suivis!inner(date_visite, usagers!inner(type_public, territoire_id))").gte("suivis.date_visite", from).lte("suivis.date_visite", to),
      ]);
      const rows: any[] = [];
      (db ?? []).forEach((r: any) => {
        const u = r.demandes?.usagers;
        if (territoireId !== "all" && u?.territoire_id !== territoireId) return;
        if (publicFilter !== "all" && u?.type_public !== publicFilter) return;
        rows.push({ _grp: r.demandes?.created_at, source: "demande", date: fmtDate(r.demandes?.created_at), code: r.besoins?.code, besoin: r.besoins?.libelle, public: USAGER_TYPE_PUBLIC[u?.type_public] ?? "", territoire: territoireNom(u?.territoire_id) });
      });
      (sb ?? []).forEach((r: any) => {
        const u = r.suivis?.usagers;
        if (territoireId !== "all" && u?.territoire_id !== territoireId) return;
        if (publicFilter !== "all" && u?.type_public !== publicFilter) return;
        rows.push({ _grp: r.suivis?.date_visite, source: "venue", date: fmtDate(r.suivis?.date_visite), code: r.besoins?.code, besoin: r.besoins?.libelle, public: USAGER_TYPE_PUBLIC[u?.type_public] ?? "", territoire: territoireNom(u?.territoire_id) });
      });
      return rows;
    }},
    venues: { dateKey: "_grp", load: async () => {
      const { data } = await supabase.from("suivis").select("date_visite, usagers!inner(nom, prenom, type_public, territoire_id), suivis_besoins(besoins(libelle))").gte("date_visite", from).lte("date_visite", to);
      return (data ?? []).filter((r: any) => (territoireId === "all" || r.usagers?.territoire_id === territoireId) && (publicFilter === "all" || r.usagers?.type_public === publicFilter)).map((r: any) => ({
        _grp: r.date_visite, date: fmtDate(r.date_visite),
        usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
        public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "", territoire: territoireNom(r.usagers?.territoire_id),
        besoins: (r.suivis_besoins ?? []).map((sb: any) => sb.besoins?.libelle).filter(Boolean).join(" | "),
      }));
    }},
    cp: { dateKey: "_grp", load: async () => {
      const { data } = await supabase.from("coups_pouce").select("date_demande, date_decision, statut, montant, coups_pouce_dispositifs(libelle, type), usagers!inner(nom, prenom, type_public, territoire_id)").gte("date_demande", from).lte("date_demande", to);
      return (data ?? []).filter((r: any) => (territoireId === "all" || r.usagers?.territoire_id === territoireId) && (publicFilter === "all" || r.usagers?.type_public === publicFilter)).map((r: any) => ({
        _grp: r.date_demande, date_demande: fmtDate(r.date_demande), date_decision: fmtDate(r.date_decision),
        statut: r.statut, montant: r.montant,
        dispositif: r.coups_pouce_dispositifs?.libelle, type: r.coups_pouce_dispositifs?.type,
        usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
        public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "", territoire: territoireNom(r.usagers?.territoire_id),
      }));
    }},
    presto: { dateKey: "_grp", load: async () => {
      let q = supabase.from("presto_requests").select("date_demande, date_recup, date_retour_prevue, statut, type_pret, urgence, usagers!inner(nom, prenom, type_public, territoire_id)").gte("date_demande", fromTs).lte("date_demande", toTs);
      if (territoireId !== "all") q = q.eq("usagers.territoire_id", territoireId);
      const { data } = await q;
      return (data ?? []).filter((r: any) => publicFilter === "all" || r.usagers?.type_public === publicFilter).map((r: any) => ({
        _grp: r.date_demande, date_demande: fmtDate(r.date_demande), statut: r.statut, type_pret: r.type_pret, urgence: r.urgence,
        date_recup: fmtDate(r.date_recup), date_retour_prevue: fmtDate(r.date_retour_prevue),
        usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
        public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "",
        territoire: territoireNom(r.usagers?.territoire_id),
      }));
    }},
    logement: { dateKey: "_grp", load: async () => {
      let q = supabase.from("logement_dossiers").select("created_at, date_debut, date_fin_prevue, statut, hebergement_type, hebergement_cout, logement_programmes(nom), usagers!inner(nom, prenom, type_public, territoire_id)").gte("created_at", fromTs).lte("created_at", toTs);
      if (territoireId !== "all") q = q.eq("usagers.territoire_id", territoireId);
      const { data } = await q;
      return (data ?? []).filter((r: any) => publicFilter === "all" || r.usagers?.type_public === publicFilter).map((r: any) => ({
        _grp: r.created_at, cree_le: fmtDate(r.created_at), statut: r.statut, programme: r.logement_programmes?.nom,
        hebergement_type: r.hebergement_type, hebergement_cout: r.hebergement_cout,
        date_debut: fmtDate(r.date_debut), date_fin_prevue: fmtDate(r.date_fin_prevue),
        usager: `${r.usagers?.prenom ?? ""} ${r.usagers?.nom ?? ""}`.trim(),
        public: USAGER_TYPE_PUBLIC[r.usagers?.type_public] ?? "", territoire: territoireNom(r.usagers?.territoire_id),
      }));
    }},
    ateliers: { dateKey: "_grp", load: async () => {
      const { data } = await supabase.from("ateliers_inscriptions").select("prenom, nom, email, statut, created_at, ateliers_sessions!inner(date_debut, lieu, ateliers!inner(titre))").gte("created_at", fromTs).lte("created_at", toTs);
      return (data ?? []).map((r: any) => ({
        _grp: r.created_at, atelier: r.ateliers_sessions?.ateliers?.titre, date_session: fmtDate(r.ateliers_sessions?.date_debut),
        lieu: r.ateliers_sessions?.lieu, inscrit_le: fmtDate(r.created_at),
        nom: r.nom, prenom: r.prenom, email: r.email, statut: r.statut,
      }));
    }},
  };

  const exportCombiné = async () => {
    setBusy("combo");
    try {
      const selected = Object.entries(combo).filter(([, v]) => v).map(([k]) => k);
      if (!selected.length) { toast.error("Sélectionnez au moins un jeu de données."); setBusy(null); return; }
      const nbMois = monthsCount();
      const sheets: Record<string, Record<string, unknown>[]> = {};
      for (const key of selected) {
        const f = fetchersForCombo[key];
        const rows = await f.load();
        if (nbMois <= 1) {
          sheets[key.slice(0, 31)] = stripGrp(rows);
        } else {
          const grouped = groupByMonth(rows, f.dateKey);
          Object.keys(grouped).sort().forEach((mois) => {
            sheets[`${key}_${mois}`.slice(0, 31)] = stripGrp(grouped[mois]);
          });
          sheets[`${key}_synthèse`.slice(0, 31)] = Object.keys(grouped).sort().map((mois) => ({
            mois, total: grouped[mois].length,
          }));
        }
      }
      downloadXlsx(`export_combiné_${from}_${to}`, sheets);
      toast.success(`Export combiné : ${selected.length} jeu(x), ${nbMois > 1 ? "groupés par mois" : "période simple"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export combiné");
    } finally {
      setBusy(null);
    }
  };

  const exportAudit = async (table: "vw_suivis_sans_besoin" | "vw_demandes_sans_besoin") => {
    setBusy(table);
    try {
      const { data, error } = await supabase.from(table as never).select("*");
      if (error) throw error;
      downloadXlsx(table, (data as Record<string, unknown>[]) ?? []);
      toast.success(`${data?.length ?? 0} ligne(s) exportée(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const exports = [
    { key: "usagers", label: "Usagers", description: "Toutes les fiches créées sur la période.", run: exportUsagers },
    { key: "venues", label: "Venues (suivis)", description: "Chaque venue avec les besoins associés.", run: exportVenues },
    { key: "demandes", label: "Sollicitations", description: "Sollicitations créées sur la période avec besoins.", run: exportDemandes },
    { key: "besoins", label: "Besoins par thème", description: "Classeur multi-feuilles : synthèse, Étudiant, PIJ, PAEJ, matrice par territoire.", run: exportBesoinsAgreges },
    { key: "cp", label: "Coups de pouce", description: "Demandes de coups de pouce sur la période.", run: exportCoupsPouce },
    { key: "presto", label: "PRESTO", description: "Prêts d'ordinateurs sur la période.", run: exportPresto },
    { key: "logement", label: "Logement (aides)", description: "Dossiers logement sur la période.", run: exportLogement },
    { key: "ateliers", label: "Inscriptions ateliers", description: "Toutes les inscriptions aux sessions d'atelier.", run: exportAteliers },
  ];


  const years = Array.from({ length: 6 }, (_, i) => today.getFullYear() - i);

  return (
    <div>
      <PageHeader
        title="Exports & rapports"
        description="Extractions Excel, rapport annuel PDF et comparatifs interannuels."
      />

      <div className="p-6 space-y-6">
        {/* Filtres */}
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">Filtres</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="from">Du</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">Au</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Public</Label>
              <Select value={publicFilter} onValueChange={(v) => setPublicFilter(v as PublicFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="etudiant">Étudiant</SelectItem>
                  <SelectItem value="pij">PIJ</SelectItem>
                  <SelectItem value="paej">PAEJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Territoire</Label>
              <Select value={territoireId} onValueChange={setTerritoireId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {territoires.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Rapport annuel + comparatif */}
        <Card className="p-5 space-y-4 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Rapport annuel & comparatif interannuel</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Génère un PDF de synthèse (KPIs, répartition, top besoins, comparatif N vs N-1) et un classeur Excel mois par mois.
            Utilise le territoire sélectionné dans les filtres ci-dessus.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Année de référence</Label>
              <Select value={String(anneeRapport)} onValueChange={(v) => setAnneeRapport(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={rapportPdf} disabled={busy === "rapport"}>
              <FileText className="h-4 w-4 mr-2" />
              {busy === "rapport" ? "Génération…" : "Rapport annuel (PDF)"}
            </Button>
            <Button onClick={rapportPptxBilan} disabled={busy === "rapport-bilan"} variant="secondary">
              <Presentation className="h-4 w-4 mr-2" />
              {busy === "rapport-bilan" ? "Génération…" : `Bilan ${anneeRapport} (PPTX)`}
            </Button>
            <Button onClick={rapportPptxComparaison} disabled={busy === "rapport-comp"} variant="secondary">
              <Presentation className="h-4 w-4 mr-2" />
              {busy === "rapport-comp" ? "Génération…" : `Comparaison ${anneeRapport - 1} / ${anneeRapport} (PPTX)`}
            </Button>
            <Button variant="outline" onClick={exportComparatif} disabled={busy === "comparatif"}>
              <TrendingUp className="h-4 w-4 mr-2" />
              {busy === "comparatif" ? "Calcul…" : `Comparatif ${anneeRapport - 1} / ${anneeRapport} (Excel)`}
            </Button>
          </div>
        </Card>

        {/* Export combiné multi-datasets */}
        <Card className="p-5 space-y-4 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent-foreground" />
            <h2 className="font-semibold">Export combiné (multi-datasets)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Cochez les jeux de données à inclure dans un seul classeur Excel. Si la période couvre plusieurs mois,
            chaque jeu est automatiquement <strong>découpé par mois</strong> + une feuille de synthèse mensuelle est ajoutée.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { k: "usagers", l: "Usagers" },
              { k: "demandes", l: "Sollicitations" },
              { k: "besoins", l: "Besoins" },
              { k: "venues", l: "Venues" },
              { k: "cp", l: "Coups de pouce" },
              { k: "presto", l: "PRESTO" },
              { k: "logement", l: "Logement" },
              { k: "ateliers", l: "Ateliers" },
            ].map(({ k, l }) => (
              <label key={k} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={!!combo[k]}
                  onCheckedChange={(v) => setCombo((c) => ({ ...c, [k]: !!v }))}
                />
                <span className="text-sm">{l}</span>
              </label>
            ))}
          </div>
          <Button onClick={exportCombiné} disabled={busy === "combo"}>
            <Download className="h-4 w-4 mr-2" />
            {busy === "combo" ? "Génération…" : `Télécharger l'export combiné${monthsCount() > 1 ? ` (groupé par mois · ${monthsCount()} mois)` : ""}`}
          </Button>
        </Card>


        {/* Audit qualité */}
        {(alertes.suivis > 0 || alertes.demandes > 0) && (
          <Card className="p-5 border-warning/40 bg-warning/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold">Audit qualité des données</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {alertes.suivis} venue(s) et {alertes.demandes} demande(s) sans aucun besoin identifié.
                  Ces enregistrements faussent les statistiques publiques.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {alertes.suivis > 0 && (
                    <Button size="sm" variant="outline" onClick={() => exportAudit("vw_suivis_sans_besoin")} disabled={busy === "vw_suivis_sans_besoin"}>
                      <Download className="h-4 w-4 mr-2" />
                      Exporter les venues incomplètes
                    </Button>
                  )}
                  {alertes.demandes > 0 && (
                    <Button size="sm" variant="outline" onClick={() => exportAudit("vw_demandes_sans_besoin")} disabled={busy === "vw_demandes_sans_besoin"}>
                      <Download className="h-4 w-4 mr-2" />
                      Exporter les demandes incomplètes
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Exports */}
        <div className="grid md:grid-cols-2 gap-4">
          {exports.map((ex) => (
            <Card key={ex.key} className="p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold">{ex.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{ex.description}</p>
              </div>
              <Button className="mt-4 self-start" onClick={ex.run} disabled={busy === ex.key}>
                <Download className="h-4 w-4 mr-2" />
                {busy === ex.key ? "Export en cours…" : "Télécharger en Excel"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
