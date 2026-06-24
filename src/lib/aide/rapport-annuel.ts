import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/aide-supabase/client";
import { USAGER_TYPE_PUBLIC } from "@/lib/aide/labels";

interface Options {
  annee: number;
  territoireId?: string | null;
  territoireNom?: string | null;
}

/**
 * Génère un rapport annuel PDF mis en page :
 * - couverture, KPIs, répartition par public, top besoins, comparatif N vs N-1
 */
export async function genererRapportAnnuel({ annee, territoireId, territoireNom }: Options) {
  const fromN = `${annee}-01-01`;
  const toN = `${annee}-12-31T23:59:59`;
  const fromPrev = `${annee - 1}-01-01`;
  const toPrev = `${annee - 1}-12-31T23:59:59`;

  const usagersQ = (from: string, to: string) => {
    let q = supabase
      .from("usagers")
      .select("id, type_public, urgence, territoire_id, created_at", { count: "exact" })
      .eq("archive", false)
      .gte("created_at", from)
      .lte("created_at", to);
    if (territoireId) q = q.eq("territoire_id", territoireId);
    return q;
  };
  const demandesQ = (from: string, to: string) => {
    let q = supabase
      .from("demandes")
      .select("id, statut, usager_id, usagers!inner(territoire_id)", { count: "exact" })
      .gte("created_at", from)
      .lte("created_at", to);
    if (territoireId) q = q.eq("usagers.territoire_id", territoireId);
    return q;
  };
  const venuesQ = (from: string, to: string) => {
    let q = supabase
      .from("suivis")
      .select("id, usager_id, usagers!inner(territoire_id)", { count: "exact" })
      .gte("date_visite", from.slice(0, 10))
      .lte("date_visite", to.slice(0, 10));
    if (territoireId) q = q.eq("usagers.territoire_id", territoireId);
    return q;
  };

  const [uN, uP, dN, dP, vN, vP, besoinsAgg] = await Promise.all([
    usagersQ(fromN, toN),
    usagersQ(fromPrev, toPrev),
    demandesQ(fromN, toN),
    demandesQ(fromPrev, toPrev),
    venuesQ(fromN, toN),
    venuesQ(fromPrev, toPrev),
    supabase
      .from("demandes_besoins")
      .select("besoin_id, besoins(libelle), demandes!inner(created_at, usagers!inner(type_public, territoire_id))")
      .gte("demandes.created_at", fromN)
      .lte("demandes.created_at", toN),
  ]);

  const countN = uN.count ?? 0;
  const countPrev = uP.count ?? 0;
  const evol = countPrev ? Math.round(((countN - countPrev) / countPrev) * 1000) / 10 : null;

  const repartPublic: Record<string, number> = { etudiant: 0, pij: 0, paej: 0 };
  (uN.data ?? []).forEach((u: any) => {
    if (u.type_public in repartPublic) repartPublic[u.type_public]++;
  });
  const urgences = (uN.data ?? []).filter((u: any) => u.urgence).length;

  const besoinsMap = new Map<string, { libelle: string; n: number }>();
  // Ventilation par public : public -> besoinId -> { libelle, n }
  const besoinsParPublic = new Map<string, Map<string, { libelle: string; n: number }>>();
  ((besoinsAgg.data ?? []) as any[]).forEach((r) => {
    const k = r.besoin_id;
    const lib = r.besoins?.libelle ?? "—";
    const cur = besoinsMap.get(k) ?? { libelle: lib, n: 0 };
    cur.n++;
    besoinsMap.set(k, cur);

    const u = r.demandes?.usagers;
    if (territoireId && u?.territoire_id !== territoireId) return;
    const pub = u?.type_public ?? "autre";
    if (!besoinsParPublic.has(pub)) besoinsParPublic.set(pub, new Map());
    const pMap = besoinsParPublic.get(pub)!;
    const pCur = pMap.get(k) ?? { libelle: lib, n: 0 };
    pCur.n++;
    pMap.set(k, pCur);
  });
  const topBesoins = Array.from(besoinsMap.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);
  const topByPublic = (pub: string) =>
    Array.from((besoinsParPublic.get(pub) ?? new Map()).values())
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);

  // PDF
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  // Couverture
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255);
  doc.setFontSize(24);
  doc.text("Rapport annuel", 14, 30);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text(String(annee), 14, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Périmètre : ${territoireNom ?? "Tous territoires"}`, 14, 62);

  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Chiffres-clés", 14, 90);
  doc.setFont("helvetica", "normal");

  autoTable(doc, {
    startY: 95,
    head: [["Indicateur", `${annee}`, `${annee - 1}`, "Évolution"]],
    body: [
      [
        "Usagers accompagnés",
        String(countN),
        String(countPrev),
        evol === null ? "n/a" : `${evol > 0 ? "+" : ""}${evol} %`,
      ],
      ["Demandes créées", String(dN.count ?? 0), String(dP.count ?? 0), pct(dN.count, dP.count)],
      ["Venues enregistrées", String(vN.count ?? 0), String(vP.count ?? 0), pct(vN.count, vP.count)],
      ["Situations d'urgence", String(urgences), "—", "—"],
    ],
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42] },
  });

  let y = (doc as any).lastAutoTable.finalY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Répartition par public", 14, y);
  autoTable(doc, {
    startY: y + 5,
    head: [["Public", "Nb usagers", "Part"]],
    body: Object.entries(repartPublic).map(([k, v]) => [
      USAGER_TYPE_PUBLIC[k] ?? k,
      String(v),
      countN ? `${Math.round((v / countN) * 100)} %` : "0 %",
    ]),
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42] },
  });

  y = (doc as any).lastAutoTable.finalY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Top 10 des besoins identifiés", 14, y);
  autoTable(doc, {
    startY: y + 5,
    head: [["Besoin", "Occurrences"]],
    body: topBesoins.length
      ? topBesoins.map((b) => [b.libelle, String(b.n)])
      : [["Aucun besoin enregistré sur la période", ""]],
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42] },
  });

  // Ventilation des besoins par public (Étudiant, PIJ, PAEJ)
  for (const pub of ["etudiant", "pij", "paej"] as const) {
    const rows = topByPublic(pub);
    if (!rows.length) continue;
    if (((doc as any).lastAutoTable.finalY ?? 0) > 230) doc.addPage();
    const yp = ((doc as any).lastAutoTable.finalY ?? 0) + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Top besoins — ${USAGER_TYPE_PUBLIC[pub] ?? pub}`, 14, yp);
    autoTable(doc, {
      startY: yp + 4,
      head: [["Besoin", "Occurrences"]],
      body: rows.map((b) => [b.libelle, String(b.n)]),
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42] },
    });
  }

  const fname = `rapport_annuel_${annee}${territoireNom ? "_" + slug(territoireNom) : ""}.pdf`;
  doc.save(fname);
}

function pct(n?: number | null, p?: number | null) {
  if (!p) return "n/a";
  const v = Math.round((((n ?? 0) - p) / p) * 1000) / 10;
  return `${v > 0 ? "+" : ""}${v} %`;
}
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
