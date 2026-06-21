import pptxgen from "pptxgenjs";
import { supabase } from "@/integrations/supabase/client";
import { TYPES_PUBLIC } from "@/lib/labels";
import coverImg from "@/assets/pptx-template/cover.jpg";
import headerImg from "@/assets/pptx-template/header.jpg";
import logoImg from "@/assets/pptx-template/logo.png";

interface Options {
  annee: number;
  territoireId?: string | null;
  territoireNom?: string | null;
}

const NAVY = "325CA0";
const NAVY_DARK = "1F3B6B";
const LIGHT = "F2F5FB";
const GREY = "595959";
const ACCENT = "5B9BD5";
const FONT = "Century Gothic";
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function emptyMonths(): number[] { return Array(12).fill(0); }

async function fetchRange(from: string, to: string, territoireId?: string | null) {
  let uq = supabase.from("usagers").select("id, type_public, urgence, territoire_id, ville, created_at")
    .eq("archive", false).gte("created_at", from).lte("created_at", to);
  if (territoireId) uq = uq.eq("territoire_id", territoireId);

  let dq = supabase.from("demandes")
    .select("id, typologie, statut, created_at, usagers!inner(type_public, territoire_id, ville)")
    .gte("created_at", from).lte("created_at", to);
  if (territoireId) dq = dq.eq("usagers.territoire_id", territoireId);

  let vq = supabase.from("suivis").select("id, date_visite, usagers!inner(territoire_id)")
    .gte("date_visite", from.slice(0, 10)).lte("date_visite", to.slice(0, 10));
  if (territoireId) vq = vq.eq("usagers.territoire_id", territoireId);

  let cpq = supabase.from("coups_pouce")
    .select("id, date_demande, statut, montant, usagers!inner(type_public, territoire_id)")
    .gte("date_demande", from.slice(0, 10)).lte("date_demande", to.slice(0, 10));
  if (territoireId) cpq = cpq.eq("usagers.territoire_id", territoireId);

  let prq = supabase.from("presto_requests")
    .select("id, date_demande, statut, type_pret, usagers!inner(territoire_id)")
    .gte("date_demande", from).lte("date_demande", to);
  if (territoireId) prq = prq.eq("usagers.territoire_id", territoireId);

  let lgq = supabase.from("logement_dossiers")
    .select("id, created_at, statut, usagers!inner(territoire_id)")
    .gte("created_at", from).lte("created_at", to);
  if (territoireId) lgq = lgq.eq("usagers.territoire_id", territoireId);

  const atq = supabase.from("ateliers_inscriptions").select("id, created_at")
    .gte("created_at", from).lte("created_at", to);

  let baDemandes = supabase.from("demandes_besoins")
    .select("besoin_id, besoins(libelle), demandes!inner(created_at, usagers!inner(type_public, territoire_id))")
    .gte("demandes.created_at", from).lte("demandes.created_at", to);
  if (territoireId) baDemandes = baDemandes.eq("demandes.usagers.territoire_id", territoireId);

  let baSuivis = supabase.from("suivis_besoins")
    .select("besoin_id, besoins(libelle), suivis!inner(date_visite, usagers!inner(type_public, territoire_id))")
    .gte("suivis.date_visite", from.slice(0, 10)).lte("suivis.date_visite", to.slice(0, 10));
  if (territoireId) baSuivis = baSuivis.eq("suivis.usagers.territoire_id", territoireId);

  const [u, d, v, cp, pr, lg, at, bad, bas] = await Promise.all([uq, dq, vq, cpq, prq, lgq, atq, baDemandes, baSuivis]);

  const usagers = emptyMonths(); const demandes = emptyMonths(); const venues = emptyMonths();
  (u.data ?? []).forEach((r: any) => usagers[new Date(r.created_at).getMonth()]++);
  (d.data ?? []).forEach((r: any) => demandes[new Date(r.created_at).getMonth()]++);
  (v.data ?? []).forEach((r: any) => venues[new Date(r.date_visite).getMonth()]++);

  return {
    usagers, demandes, venues,
    rawUsagers: (u.data ?? []) as any[],
    cp: (cp.data ?? []) as any[],
    presto: (pr.data ?? []) as any[],
    logement: (lg.data ?? []) as any[],
    ateliers: (at.data ?? []) as any[],
    besoinsAgg: [
      ...((bad.data ?? []) as any[]).map((r: any) => ({ besoin_id: r.besoin_id, libelle: r.besoins?.libelle ?? "—" })),
      ...((bas.data ?? []) as any[]).map((r: any) => ({ besoin_id: r.besoin_id, libelle: r.besoins?.libelle ?? "—" })),
    ],
  };
}

function addMasterChrome(slide: pptxgen.Slide, title: string) {
  slide.addImage({ path: headerImg, x: 0, y: 0, w: 4.5, h: 0.85 });
  slide.addText(title.toUpperCase(), {
    x: 4.7, y: 0.05, w: 8.4, h: 0.85,
    fontSize: 26, bold: true, color: NAVY, fontFace: FONT, valign: "middle",
  });
  slide.addImage({ path: logoImg, x: 12.3, y: 6.7, w: 0.85, h: 0.75 });
}

function addNarrative(slide: pptxgen.Slide, lines: string[], y = 6.0) {
  slide.addShape("rect", { x: 0.5, y, w: 12.3, h: 0.7, fill: { color: LIGHT }, line: { color: NAVY, width: 0.5 } });
  slide.addText(lines.join("  ·  "), {
    x: 0.7, y: y + 0.05, w: 12.0, h: 0.6,
    fontSize: 12, color: NAVY_DARK, fontFace: FONT, italic: true, valign: "middle",
  });
}

function sum(b: number[]) { return b.reduce((a, x) => a + x, 0); }
function evolPct(n: number, p: number): { txt: string; up: boolean | null } {
  if (!p) return { txt: n ? "Nouveau" : "—", up: null };
  const v = Math.round(((n - p) / p) * 1000) / 10;
  return { txt: `${v > 0 ? "+" : ""}${v} %`, up: v >= 0 };
}
function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function topMonth(arr: number[]) {
  let idx = 0;
  arr.forEach((v, i) => { if (v > arr[idx]) idx = i; });
  return { mois: MONTHS[idx], n: arr[idx] };
}

/* ───────────────────────────────────────────────────────────────────
 *  PPTX 1 — Bilan de la période (année N seule, narratif riche)
 * ─────────────────────────────────────────────────────────────────── */
export async function genererRapportBilanPptx({ annee, territoireId, territoireNom }: Options) {
  const periphNom = territoireNom ?? "Tous territoires";
  const N = await fetchRange(`${annee}-01-01`, `${annee}-12-31T23:59:59`, territoireId);
  const totU = sum(N.usagers), totD = sum(N.demandes), totV = sum(N.venues);
  const urg = N.rawUsagers.filter((u: any) => u.urgence).length;
  const pic = topMonth(N.demandes);

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `Bilan ${annee}`;
  pptx.author = "Guichet de l'AIDE";
  pptx.company = "Université d'Orléans";

  // Couverture
  const c = pptx.addSlide(); c.background = { color: "FFFFFF" };
  c.addImage({ path: coverImg, x: 0, y: 0, w: 13.33, h: 7.5 });
  c.addText(`Bilan ${annee}`, { x: 0.6, y: 3.0, w: 9, h: 0.9, fontSize: 36, bold: true, color: NAVY, fontFace: FONT });
  c.addText(`Guichet de l'AIDE — ${periphNom}`, { x: 0.6, y: 3.95, w: 9, h: 0.5, fontSize: 20, color: NAVY_DARK, fontFace: FONT, italic: true });
  c.addText(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
    { x: 0.6, y: 5.6, w: 6, h: 0.4, fontSize: 14, color: GREY, fontFace: FONT });

  // Slide chiffres-clés
  const s2 = pptx.addSlide(); addMasterChrome(s2, "Chiffres clés de l'année");
  s2.addText(`Activité du Guichet sur l'année ${annee}`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  const kpis = [
    { label: "Usagers accompagnés", n: totU },
    { label: "Sollicitations créées", n: totD },
    { label: "Venues enregistrées", n: totV },
    { label: "Situations d'urgence", n: urg },
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + (i % 2) * 6.2; const y = 1.7 + Math.floor(i / 2) * 2.0;
    s2.addShape("rect", { x, y, w: 5.9, h: 1.8, fill: { color: LIGHT }, line: { color: NAVY, width: 0.5 } });
    s2.addShape("rect", { x, y, w: 0.15, h: 1.8, fill: { color: NAVY }, line: { color: NAVY } });
    s2.addText(k.label.toUpperCase(), { x: x + 0.35, y: y + 0.15, w: 5.4, h: 0.4, fontSize: 12, color: GREY, fontFace: FONT, bold: true });
    s2.addText(String(k.n), { x: x + 0.35, y: y + 0.55, w: 5.4, h: 1.1, fontSize: 54, bold: true, color: NAVY, fontFace: FONT });
  });
  addNarrative(s2, [
    `En ${annee}, ${totU} usagers ont été accompagnés par le Guichet${territoireNom ? " sur " + territoireNom : ""}.`,
    `${totD} sollicitations enregistrées dont ${urg} situations d'urgence (${totU ? Math.round((urg/totU)*100) : 0}%).`,
  ]);

  // Évolution mensuelle
  const s3 = pptx.addSlide(); addMasterChrome(s3, "Évolution mensuelle de l'activité");
  s3.addText(`Usagers, sollicitations et venues mois par mois`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  s3.addChart(pptx.ChartType.line, [
    { name: "Usagers", labels: MONTHS, values: N.usagers },
    { name: "Sollicitations", labels: MONTHS, values: N.demandes },
    { name: "Venues", labels: MONTHS, values: N.venues },
  ], {
    x: 0.5, y: 1.55, w: 12.3, h: 4.2,
    showLegend: true, legendPos: "b", legendFontFace: FONT, legendFontSize: 11,
    chartColors: [NAVY, ACCENT, "BFBFBF"],
    catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
    lineDataSymbol: "circle", lineDataSymbolSize: 6, lineSize: 3,
  });
  addNarrative(s3, [
    `Pic d'activité observé en ${pic.mois} avec ${pic.n} sollicitations.`,
    `Moyenne mensuelle : ${Math.round(totD/12)} sollicitations.`,
  ]);

  // Typologie de public
  const s4 = pptx.addSlide(); addMasterChrome(s4, "Typologie de public accompagné");
  s4.addText(`${totU} usagers en ${annee}`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  const repart: Record<string, number> = { etudiant: 0, pij: 0, paej: 0, autre: 0 };
  N.rawUsagers.forEach((u: any) => { const k = (u.type_public ?? "autre") as string; repart[k in repart ? k : "autre"]++; });
  s4.addChart(pptx.ChartType.doughnut, [{
    name: "Public", labels: Object.keys(repart).map((k) => TYPES_PUBLIC[k] ?? k), values: Object.values(repart),
  }], {
    x: 0.5, y: 1.5, w: 12.3, h: 4.3,
    showLegend: true, legendPos: "b", legendFontFace: FONT, legendFontSize: 12,
    chartColors: [NAVY, ACCENT, "70AD47", "BFBFBF"],
    dataLabelFontFace: FONT, dataLabelFontSize: 11, showPercent: true,
  });
  const dominant = Object.entries(repart).sort((a,b) => b[1]-a[1])[0];
  addNarrative(s4, [
    `Public majoritaire : ${TYPES_PUBLIC[dominant[0]] ?? dominant[0]} (${dominant[1]} usagers, ${totU ? Math.round((dominant[1]/totU)*100) : 0}%).`,
    `${repart.etudiant} étudiants, ${repart.pij} PIJ, ${repart.paej} PAEJ.`,
  ]);

  // Top besoins
  const s5 = pptx.addSlide(); addMasterChrome(s5, "Top des besoins identifiés");
  s5.addText(`Besoins issus des sollicitations et venues`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  const besoinsMap = new Map<string, number>();
  N.besoinsAgg.forEach((r: any) => { besoinsMap.set(r.libelle, (besoinsMap.get(r.libelle) ?? 0) + 1); });
  const top = Array.from(besoinsMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (top.length === 0) {
    s5.addText("Aucun besoin enregistré sur la période.", { x: 0.5, y: 3.5, w: 12, h: 0.5, fontSize: 16, color: GREY, fontFace: FONT, italic: true, align: "center" });
  } else {
    s5.addChart(pptx.ChartType.bar, [{
      name: "Occurrences", labels: top.map(([l]) => l).reverse(), values: top.map(([, n]) => n).reverse(),
    }], {
      x: 0.5, y: 1.5, w: 12.3, h: 4.3, chartColors: [NAVY], showValue: true,
      dataLabelFontFace: FONT, dataLabelFontSize: 10,
      catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
      catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, barDir: "bar", showLegend: false,
    });
    const t = top[0];
    addNarrative(s5, [
      `Besoin n°1 : ${t[0]} (${t[1]} occurrences).`,
      `${besoinsMap.size} besoins distincts identifiés sur la période.`,
    ]);
  }

  // Dispositifs
  const s6 = pptx.addSlide(); addMasterChrome(s6, "Volumétrie par dispositif");
  s6.addText(`Activité ${annee} par dispositif`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  const dispositifs = [
    { label: "Coups de pouce", n: N.cp.length },
    { label: "PRESTO (prêts numérique)", n: N.presto.length },
    { label: "Dossiers logement", n: N.logement.length },
    { label: "Inscriptions ateliers", n: N.ateliers.length },
  ];
  s6.addChart(pptx.ChartType.bar, [{
    name: String(annee), labels: dispositifs.map((d) => d.label), values: dispositifs.map((d) => d.n),
  }], {
    x: 0.5, y: 1.5, w: 12.3, h: 4.3, chartColors: [NAVY], showValue: true,
    dataLabelFontFace: FONT, dataLabelFontSize: 10,
    catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, showLegend: false, barDir: "bar",
  });
  const totDisp = dispositifs.reduce((a, d) => a + d.n, 0);
  const topDisp = [...dispositifs].sort((a,b) => b.n - a.n)[0];
  addNarrative(s6, [
    `${totDisp} actions toutes dispositifs confondus.`,
    `Dispositif le plus mobilisé : ${topDisp.label} (${topDisp.n}).`,
  ]);

  // Cartographie
  const s7 = pptx.addSlide(); addMasterChrome(s7, "Cartographie par campus / ville");
  s7.addText(`Répartition géographique des usagers ${annee}`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  const parVille = new Map<string, number>();
  N.rawUsagers.forEach((u: any) => { const v = (u.ville ?? "").trim() || "Non renseigné"; parVille.set(v, (parVille.get(v) ?? 0) + 1); });
  const villes = Array.from(parVille.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (villes.length === 0) {
    s7.addText("Aucune donnée de ville sur la période.", { x: 0.5, y: 3.5, w: 12, h: 0.5, fontSize: 16, color: GREY, fontFace: FONT, italic: true, align: "center" });
  } else {
    s7.addChart(pptx.ChartType.bar, [{
      name: "Usagers", labels: villes.map(([v]) => v), values: villes.map(([, n]) => n),
    }], {
      x: 0.5, y: 1.5, w: 12.3, h: 4.3, chartColors: [ACCENT], showValue: true,
      dataLabelFontFace: FONT, dataLabelFontSize: 10,
      catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
      catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, showLegend: false, barDir: "col",
    });
    addNarrative(s7, [
      `Campus principal : ${villes[0][0]} (${villes[0][1]} usagers).`,
      `Présence sur ${villes.length} villes / campus distincts.`,
    ]);
  }

  // Remerciement
  const sEnd = pptx.addSlide();
  sEnd.addImage({ path: coverImg, x: 0, y: 0, w: 13.33, h: 7.5 });
  sEnd.addText("Merci", { x: 0.6, y: 2.8, w: 9, h: 1.4, fontSize: 64, bold: true, color: NAVY, fontFace: FONT });
  sEnd.addText(`Bilan ${annee} · ${periphNom}`, { x: 0.6, y: 4.2, w: 9, h: 0.5, fontSize: 18, color: NAVY_DARK, italic: true, fontFace: FONT });

  await pptx.writeFile({ fileName: `bilan_${annee}${territoireNom ? "_" + slug(territoireNom) : ""}.pptx` });
}

/* ───────────────────────────────────────────────────────────────────
 *  PPTX 2 — Comparaison N vs N-1 (narratif d'évolution)
 * ─────────────────────────────────────────────────────────────────── */
export async function genererRapportComparaisonPptx({ annee, territoireId, territoireNom }: Options) {
  const periphNom = territoireNom ?? "Tous territoires";
  const [N, P] = await Promise.all([
    fetchRange(`${annee}-01-01`, `${annee}-12-31T23:59:59`, territoireId),
    fetchRange(`${annee - 1}-01-01`, `${annee - 1}-12-31T23:59:59`, territoireId),
  ]);

  const totU_N = sum(N.usagers), totU_P = sum(P.usagers);
  const totD_N = sum(N.demandes), totD_P = sum(P.demandes);
  const totV_N = sum(N.venues), totV_P = sum(P.venues);

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `Comparaison ${annee - 1} vs ${annee}`;
  pptx.author = "Guichet de l'AIDE";
  pptx.company = "Université d'Orléans";

  // Couverture
  const c = pptx.addSlide(); c.background = { color: "FFFFFF" };
  c.addImage({ path: coverImg, x: 0, y: 0, w: 13.33, h: 7.5 });
  c.addText(`Comparaison ${annee - 1} → ${annee}`, { x: 0.6, y: 3.0, w: 11, h: 0.9, fontSize: 36, bold: true, color: NAVY, fontFace: FONT });
  c.addText(`Évolution de l'activité du Guichet de l'AIDE — ${periphNom}`, { x: 0.6, y: 3.95, w: 10, h: 0.5, fontSize: 20, color: NAVY_DARK, fontFace: FONT, italic: true });
  c.addText(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
    { x: 0.6, y: 5.6, w: 6, h: 0.4, fontSize: 14, color: GREY, fontFace: FONT });

  // KPI comparatifs
  const s2 = pptx.addSlide(); addMasterChrome(s2, `Synthèse ${annee - 1} vs ${annee}`);
  s2.addText(`Évolution des grands indicateurs`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  const kpis = [
    { label: "Usagers accompagnés", n: totU_N, p: totU_P },
    { label: "Sollicitations créées", n: totD_N, p: totD_P },
    { label: "Venues enregistrées", n: totV_N, p: totV_P },
    { label: "Coups de pouce", n: N.cp.length, p: P.cp.length },
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + (i % 2) * 6.2; const y = 1.7 + Math.floor(i / 2) * 2.0;
    const e = evolPct(k.n, k.p);
    const col = e.up === null ? GREY : e.up ? "2E7D32" : "C62828";
    s2.addShape("rect", { x, y, w: 5.9, h: 1.8, fill: { color: LIGHT }, line: { color: NAVY, width: 0.5 } });
    s2.addShape("rect", { x, y, w: 0.15, h: 1.8, fill: { color: NAVY }, line: { color: NAVY } });
    s2.addText(k.label.toUpperCase(), { x: x + 0.35, y: y + 0.1, w: 5.4, h: 0.4, fontSize: 12, color: GREY, fontFace: FONT, bold: true });
    s2.addText(`${k.p}  →  ${k.n}`, { x: x + 0.35, y: y + 0.45, w: 5.4, h: 0.6, fontSize: 28, bold: true, color: NAVY, fontFace: FONT });
    s2.addText(e.txt, { x: x + 0.35, y: y + 1.15, w: 5.4, h: 0.5, fontSize: 22, bold: true, color: col, fontFace: FONT });
  });
  const evolU = evolPct(totU_N, totU_P);
  addNarrative(s2, [
    `Public accompagné : ${evolU.txt} entre ${annee - 1} et ${annee}.`,
    `Sollicitations : ${evolPct(totD_N, totD_P).txt} · Venues : ${evolPct(totV_N, totV_P).txt}.`,
  ]);

  // Évolution mensuelle comparée
  const s3 = pptx.addSlide(); addMasterChrome(s3, "Sollicitations — évolution comparée");
  s3.addText(`Comparaison mensuelle ${annee - 1} vs ${annee}`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  s3.addChart(pptx.ChartType.line, [
    { name: String(annee - 1), labels: MONTHS, values: P.demandes },
    { name: String(annee), labels: MONTHS, values: N.demandes },
  ], {
    x: 0.5, y: 1.55, w: 12.3, h: 4.2,
    showLegend: true, legendPos: "b", legendFontFace: FONT, legendFontSize: 11,
    chartColors: ["BFBFBF", NAVY],
    catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
    lineDataSymbol: "circle", lineDataSymbolSize: 6, lineSize: 3,
  });
  const picN = topMonth(N.demandes), picP = topMonth(P.demandes);
  addNarrative(s3, [
    `Pic ${annee} : ${picN.mois} (${picN.n}) vs pic ${annee - 1} : ${picP.mois} (${picP.n}).`,
    `Évolution du volume annuel : ${evolPct(totD_N, totD_P).txt}.`,
  ]);

  // Usagers mensuel comparé
  const s4 = pptx.addSlide(); addMasterChrome(s4, "Usagers — évolution comparée");
  s4.addText(`Nouveaux usagers mois par mois ${annee - 1} vs ${annee}`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  s4.addChart(pptx.ChartType.bar, [
    { name: String(annee - 1), labels: MONTHS, values: P.usagers },
    { name: String(annee), labels: MONTHS, values: N.usagers },
  ], {
    x: 0.5, y: 1.55, w: 12.3, h: 4.2,
    showLegend: true, legendPos: "b", legendFontFace: FONT,
    chartColors: ["BFBFBF", NAVY], showValue: false,
    catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
    barGrouping: "clustered", barDir: "col",
  });
  addNarrative(s4, [
    `${totU_P} usagers en ${annee - 1} → ${totU_N} en ${annee} (${evolU.txt}).`,
    `Moyenne mensuelle : ${Math.round(totU_P/12)} → ${Math.round(totU_N/12)}.`,
  ]);

  // Comparaison typologie public (tableau)
  const s5 = pptx.addSlide(); addMasterChrome(s5, "Typologie de public — comparaison");
  const repart = (rows: any[]) => {
    const r: Record<string, number> = { etudiant: 0, pij: 0, paej: 0, autre: 0 };
    rows.forEach((u: any) => { const k = (u.type_public ?? "autre") as string; r[k in r ? k : "autre"]++; });
    return r;
  };
  const rN = repart(N.rawUsagers), rP = repart(P.rawUsagers);
  const tbl: pptxgen.TableRow[] = [
    [
      { text: "Public", options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontFace: FONT } },
      { text: String(annee - 1), options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontFace: FONT, align: "right" } },
      { text: String(annee), options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontFace: FONT, align: "right" } },
      { text: "Évolution", options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontFace: FONT, align: "right" } },
    ],
    ...Object.keys(rN).map<pptxgen.TableRow>((k) => {
      const e = evolPct(rN[k], rP[k]);
      return [
        { text: TYPES_PUBLIC[k] ?? k, options: { fontFace: FONT } },
        { text: String(rP[k]), options: { fontFace: FONT, align: "right" } },
        { text: String(rN[k]), options: { fontFace: FONT, align: "right", bold: true } },
        { text: e.txt, options: { fontFace: FONT, align: "right", color: e.up === null ? GREY : e.up ? "2E7D32" : "C62828" } },
      ];
    }),
  ];
  s5.addTable(tbl, { x: 1.5, y: 1.8, w: 10.3, fontSize: 14, border: { type: "solid", pt: 0.5, color: "D0D0D0" } });
  addNarrative(s5, [
    `Étudiants : ${rP.etudiant} → ${rN.etudiant} (${evolPct(rN.etudiant, rP.etudiant).txt}).`,
    `Public non-étudiant (PIJ + PAEJ + autres) : ${rP.pij+rP.paej+rP.autre} → ${rN.pij+rN.paej+rN.autre}.`,
  ]);

  // Dispositifs comparés
  const s6 = pptx.addSlide(); addMasterChrome(s6, "Dispositifs — comparaison");
  s6.addText(`Volumétrie par dispositif ${annee - 1} vs ${annee}`, { x: 0.5, y: 1.05, w: 12, h: 0.35, fontSize: 13, italic: true, color: GREY, fontFace: FONT });
  const disp = [
    { label: "Coups de pouce", n: N.cp.length, p: P.cp.length },
    { label: "PRESTO", n: N.presto.length, p: P.presto.length },
    { label: "Logement", n: N.logement.length, p: P.logement.length },
    { label: "Ateliers", n: N.ateliers.length, p: P.ateliers.length },
  ];
  s6.addChart(pptx.ChartType.bar, [
    { name: String(annee - 1), labels: disp.map((d) => d.label), values: disp.map((d) => d.p) },
    { name: String(annee), labels: disp.map((d) => d.label), values: disp.map((d) => d.n) },
  ], {
    x: 0.5, y: 1.55, w: 12.3, h: 4.2,
    chartColors: ["BFBFBF", NAVY], showValue: true,
    dataLabelFontFace: FONT, dataLabelFontSize: 10,
    catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
    showLegend: true, legendPos: "b", legendFontFace: FONT,
    barGrouping: "clustered", barDir: "bar",
  });
  const dispEvol = disp.map((d) => ({ ...d, e: evolPct(d.n, d.p) })).sort((a,b) => Math.abs(parseFloat(b.e.txt))||0 - (Math.abs(parseFloat(a.e.txt))||0));
  addNarrative(s6, [
    `Évolution la plus marquée : ${dispEvol[0].label} (${dispEvol[0].e.txt}).`,
    `Total dispositifs ${annee - 1} : ${disp.reduce((a,d)=>a+d.p,0)} → ${annee} : ${disp.reduce((a,d)=>a+d.n,0)}.`,
  ]);

  // Top besoins comparé
  const s7 = pptx.addSlide(); addMasterChrome(s7, "Top besoins — comparaison");
  const mapN = new Map<string, number>(); const mapP = new Map<string, number>();
  N.besoinsAgg.forEach((r: any) => mapN.set(r.libelle, (mapN.get(r.libelle) ?? 0) + 1));
  P.besoinsAgg.forEach((r: any) => mapP.set(r.libelle, (mapP.get(r.libelle) ?? 0) + 1));
  const topN = Array.from(mapN.entries()).sort((a,b) => b[1]-a[1]).slice(0, 8);
  if (topN.length === 0) {
    s7.addText("Aucun besoin enregistré sur la période.", { x: 0.5, y: 3.5, w: 12, h: 0.5, fontSize: 16, color: GREY, fontFace: FONT, italic: true, align: "center" });
  } else {
    s7.addChart(pptx.ChartType.bar, [
      { name: String(annee - 1), labels: topN.map(([l]) => l).reverse(), values: topN.map(([l]) => mapP.get(l) ?? 0).reverse() },
      { name: String(annee), labels: topN.map(([l]) => l).reverse(), values: topN.map(([, n]) => n).reverse() },
    ], {
      x: 0.5, y: 1.55, w: 12.3, h: 4.2,
      chartColors: ["BFBFBF", NAVY], showValue: true,
      dataLabelFontFace: FONT, dataLabelFontSize: 10,
      catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
      catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
      showLegend: true, legendPos: "b", legendFontFace: FONT,
      barGrouping: "clustered", barDir: "bar",
    });
    const t = topN[0]; const tP = mapP.get(t[0]) ?? 0;
    addNarrative(s7, [
      `Besoin n°1 en ${annee} : ${t[0]} (${tP} → ${t[1]}, ${evolPct(t[1], tP).txt}).`,
      `${mapN.size} besoins distincts en ${annee} vs ${mapP.size} en ${annee - 1}.`,
    ]);
  }

  // Remerciement
  const sEnd = pptx.addSlide();
  sEnd.addImage({ path: coverImg, x: 0, y: 0, w: 13.33, h: 7.5 });
  sEnd.addText("Merci", { x: 0.6, y: 2.8, w: 9, h: 1.4, fontSize: 64, bold: true, color: NAVY, fontFace: FONT });
  sEnd.addText(`Comparaison ${annee - 1} / ${annee} · ${periphNom}`, { x: 0.6, y: 4.2, w: 11, h: 0.5, fontSize: 18, color: NAVY_DARK, italic: true, fontFace: FONT });

  await pptx.writeFile({ fileName: `comparaison_${annee - 1}_vs_${annee}${territoireNom ? "_" + slug(territoireNom) : ""}.pptx` });
}

// Alias rétro-compatible — l'ancien bouton appelait genererRapportAnnuelPptx
export const genererRapportAnnuelPptx = genererRapportBilanPptx;
