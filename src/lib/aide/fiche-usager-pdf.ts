import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import {
  TYPES_PUBLIC,
  SITUATIONS,
  GENRES,
  STATUTS_DEMANDE,
  PRIORITES,
  STATUTS_RDV,
  MODALITES_RDV,
  TYPOLOGIES,
  formatDate,
  formatDateTime,
  fullName,
  ageEnAnnees,
} from "@/lib/labels";

/**
 * Génère une fiche usager PDF mise en page (couverture + sections).
 * Utilise jsPDF + autoTable, déjà présents dans le projet.
 */
export async function genererFicheUsagerPDF(usagerId: string) {
  // 1. Récupération
  const [u, sv, d, r, cp, n, c, terr, struct] = await Promise.all([
    supabase.from("usagers").select("*").eq("id", usagerId).single(),
    supabase
      .from("suivis")
      .select("*, suivis_besoins(besoins(libelle))")
      .eq("usager_id", usagerId)
      .order("date_visite", { ascending: false }),
    supabase
      .from("demandes")
      .select("*, demandes_besoins(besoins(libelle))")
      .eq("usager_id", usagerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("rendez_vous")
      .select("*")
      .eq("usager_id", usagerId)
      .order("date_debut", { ascending: false }),
    supabase
      .from("coups_pouce")
      .select("*, coups_pouce_dispositifs(libelle, type)")
      .eq("usager_id", usagerId)
      .order("date_demande", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("usager_id", usagerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("consentements")
      .select("date_consentement, accepte, version")
      .eq("usager_id", usagerId)
      .order("date_consentement", { ascending: false })
      .limit(1),
    supabase.from("territoires").select("id, nom"),
    supabase.from("structures").select("id, nom"),
  ]);

  if (u.error || !u.data) throw new Error("Usager introuvable");
  const usager: any = u.data;
  const suivis: any[] = sv.data ?? [];
  const demandes: any[] = d.data ?? [];
  const rdvs: any[] = r.data ?? [];
  const coupsPouce: any[] = cp.data ?? [];
  const notes: any[] = n.data ?? [];
  const territoires = new Map((terr.data ?? []).map((t: any) => [t.id, t.nom]));
  const structures = new Map((struct.data ?? []).map((s: any) => [s.id, s.nom]));
  const lastConsent = (c.data ?? [])[0];

  // 2. PDF
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const accent: [number, number, number] = [139, 115, 85]; // sable / terre
  const ink: [number, number, number] = [30, 28, 24];
  const muted: [number, number, number] = [120, 113, 105];

  // --- En-tête couverture ---
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 38, "F");

  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FICHE USAGER", M, 13);

  doc.setFontSize(22);
  doc.text(fullName(usager), M, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const age = ageEnAnnees(usager.date_naissance);
  const subtitleParts = [
    TYPES_PUBLIC[usager.type_public] ?? SITUATIONS[usager.situation] ?? "",
    age !== null ? `${age} ans` : "",
    usager.composante ?? "",
  ].filter(Boolean);
  doc.text(subtitleParts.join("  ·  "), M, 32);

  // Bande méta à droite
  doc.setFontSize(9);
  const territoireNom = usager.territoire_id ? territoires.get(usager.territoire_id) : null;
  const structureNom = usager.structure_id ? structures.get(usager.structure_id) : null;
  const metaLines = [
    territoireNom ? `Territoire : ${territoireNom}` : null,
    structureNom ? `Structure : ${structureNom}` : null,
    `Édité le ${formatDateTime(new Date().toISOString())}`,
  ].filter(Boolean) as string[];
  metaLines.forEach((l, i) => doc.text(l, W - M, 14 + i * 5, { align: "right" }));

  doc.setTextColor(...ink);

  // Bandeau d'urgence (si actif)
  let y = 46;
  if (usager.urgence) {
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, W - 2 * M, 12, 2, 2, "FD");
    doc.setTextColor(153, 27, 27);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("⚠  Situation d'urgence active", M + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(usager.urgence_motif ?? "Aucun motif renseigné", M + 4, y + 9.5);
    doc.setTextColor(...ink);
    y += 16;
  }

  // KPIs synthèse (parcours condensé)
  const demandesOuvertes = demandes.filter((x) => x.statut !== "cloturee" && x.statut !== "annulee").length;
  const kpis: { label: string; value: string }[] = [
    { label: "Venues", value: String(suivis.length) },
    { label: "Demandes ouvertes", value: String(demandesOuvertes) },
    { label: "RDV", value: String(rdvs.length) },
    { label: "Coups de pouce", value: String(coupsPouce.length) },
  ];
  const kw = (W - 2 * M) / kpis.length;
  kpis.forEach((k, i) => {
    const x = M + i * kw;
    doc.setFillColor(250, 248, 245);
    doc.setDrawColor(230, 224, 215);
    doc.roundedRect(x, y, kw - 3, 18, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...accent);
    doc.text(k.value, x + 4, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(k.label.toUpperCase(), x + 4, y + 14.5);
  });
  doc.setTextColor(...ink);
  y += 24;

  // Helper sections
  const sectionTitle = (label: string) => {
    if (y > H - 30) {
      doc.addPage();
      y = M;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...accent);
    doc.text(label.toUpperCase(), M, y);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.4);
    doc.line(M, y + 1.5, W - M, y + 1.5);
    doc.setTextColor(...ink);
    y += 5;
  };
  const afterTable = () => {
    y = (doc as any).lastAutoTable.finalY + 8;
  };

  // --- Identité ---
  sectionTitle("Identité & coordonnées");
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5, textColor: ink },
    columnStyles: {
      0: { fontStyle: "bold", textColor: muted, cellWidth: 38 },
      1: { cellWidth: 52 },
      2: { fontStyle: "bold", textColor: muted, cellWidth: 38 },
      3: { cellWidth: "auto" },
    },
    body: [
      ["Nom", usager.nom ?? "—", "Email", usager.email ?? "—"],
      ["Prénom", usager.prenom ?? "—", "Téléphone", usager.telephone ?? "—"],
      [
        "Date de naissance",
        usager.date_naissance ? `${formatDate(usager.date_naissance)}${age !== null ? `  (${age} ans)` : ""}` : "—",
        "Genre",
        GENRES[usager.genre] ?? "—",
      ],
      [
        "Adresse",
        [usager.adresse, usager.code_postal, usager.ville].filter(Boolean).join(" ") || "—",
        "Situation",
        SITUATIONS[usager.situation] ?? "—",
      ],
      [
        "Établissement",
        usager.etablissement ?? "—",
        "N° étudiant",
        usager.numero_etudiant ?? "—",
      ],
    ],
  });
  afterTable();

  // --- Demandes ---
  if (demandes.length) {
    sectionTitle(`Demandes (${demandes.length})`);
    autoTable(doc, {
      startY: y,
      head: [["Date", "Titre", "Typologie", "Statut", "Priorité", "Besoins"]],
      body: demandes.map((dm) => [
        formatDate(dm.created_at),
        dm.titre ?? "—",
        TYPOLOGIES[dm.typologie] ?? "—",
        STATUTS_DEMANDE[dm.statut] ?? dm.statut ?? "—",
        PRIORITES[dm.priorite] ?? dm.priorite ?? "—",
        (dm.demandes_besoins ?? [])
          .map((x: any) => x.besoins?.libelle)
          .filter(Boolean)
          .join(", ") || "—",
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 248, 245] },
    });
    afterTable();
  }

  // --- Venues ---
  if (suivis.length) {
    sectionTitle(`Venues (${suivis.length})`);
    autoTable(doc, {
      startY: y,
      head: [["Date", "Type", "Besoins identifiés", "Notes"]],
      body: suivis.map((s) => [
        formatDate(s.date_visite ?? s.created_at),
        s.type_visite ?? "—",
        (s.suivis_besoins ?? [])
          .map((x: any) => x.besoins?.libelle)
          .filter(Boolean)
          .join(", ") || "—",
        (s.notes ?? "").slice(0, 120),
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 248, 245] },
    });
    afterTable();
  }

  // --- RDV ---
  if (rdvs.length) {
    sectionTitle(`Rendez-vous (${rdvs.length})`);
    autoTable(doc, {
      startY: y,
      head: [["Date", "Objet", "Modalité", "Lieu", "Statut"]],
      body: rdvs.map((rv) => [
        formatDateTime(rv.date_debut),
        rv.objet ?? "—",
        MODALITES_RDV[rv.modalite] ?? rv.modalite ?? "—",
        rv.lieu ?? "—",
        STATUTS_RDV[rv.statut] ?? rv.statut ?? "—",
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 248, 245] },
    });
    afterTable();
  }

  // --- Coups de pouce ---
  if (coupsPouce.length) {
    sectionTitle(`Coups de pouce (${coupsPouce.length})`);
    autoTable(doc, {
      startY: y,
      head: [["Demande", "Décision", "Dispositif", "Montant", "Statut"]],
      body: coupsPouce.map((p) => [
        formatDate(p.date_demande),
        p.date_decision ? formatDate(p.date_decision) : "—",
        p.coups_pouce_dispositifs?.libelle ?? "—",
        p.montant != null ? `${p.montant} €` : "—",
        p.statut ?? "—",
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 248, 245] },
    });
    afterTable();
  }

  // --- Notes ---
  if (notes.length) {
    sectionTitle(`Notes (${notes.length})`);
    autoTable(doc, {
      startY: y,
      head: [["Date", "Contenu"]],
      body: notes.map((nt) => [formatDate(nt.created_at), (nt.contenu ?? "").slice(0, 220)]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      columnStyles: { 0: { cellWidth: 28 } },
    });
    afterTable();
  }

  // --- Pied : RGPD + pagination ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(230, 224, 215);
    doc.setLineWidth(0.2);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    const consentTxt = lastConsent
      ? `Consentement RGPD ${lastConsent.accepte ? "recueilli" : "refusé"} le ${formatDate(lastConsent.date_consentement)}`
      : "Aucun consentement enregistré";
    doc.text(`Document confidentiel — ${consentTxt}`, M, H - 10);
    doc.text(`Page ${p} / ${totalPages}`, W - M, H - 10, { align: "right" });
  }
  doc.setTextColor(...ink);

  const safe = (s?: string | null) => (s ?? "").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`fiche_${safe(usager.nom)}_${safe(usager.prenom)}.pdf`);
}
