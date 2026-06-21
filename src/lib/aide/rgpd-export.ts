import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/aide-supabase/client";

export async function exportUsagerDataPDF(usagerId: string) {
  const [{ data: u }, { data: suivis }, { data: demandes }, { data: rdvs }, { data: cps }, { data: consents }, { data: notes }] = await Promise.all([
    supabase.from("usagers").select("*").eq("id", usagerId).maybeSingle(),
    supabase.from("accompagnements").select("date_action,type_action,description").eq("usager_id", usagerId).order("date_action", { ascending: false }),
    supabase.from("demandes").select("created_at,titre,statut,priorite,description").eq("usager_id", usagerId).order("created_at", { ascending: false }),
    supabase.from("rendez_vous").select("date_debut,objet,statut,modalite,lieu").eq("usager_id", usagerId).order("date_debut", { ascending: false }),
    supabase.from("coups_pouce").select("date_demande,date_decision,montant,statut").eq("usager_id", usagerId).order("date_demande", { ascending: false }),
    supabase.from("consentements").select("date_consentement,accepte,version,contenu,duree_conservation_mois").eq("usager_id", usagerId).order("date_consentement", { ascending: false }),
    supabase.from("notes").select("created_at,contenu").eq("usager_id", usagerId).order("created_at", { ascending: false }),
  ]);

  if (!u) throw new Error("Usager introuvable");

  const doc = new jsPDF();
  let y = 14;

  doc.setFontSize(16);
  doc.text(`Export de données personnelles`, 14, y); y += 7;
  doc.setFontSize(10);
  doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, 14, y); y += 7;
  doc.text(`Article 15 RGPD — droit d'accès`, 14, y); y += 8;

  doc.setFontSize(12);
  doc.text("Identité", 14, y); y += 2;
  autoTable(doc, {
    startY: y + 2,
    head: [["Champ", "Valeur"]],
    body: [
      ["Nom", u.nom ?? ""],
      ["Prénom", u.prenom ?? ""],
      ["Date de naissance", u.date_naissance ?? "—"],
      ["Genre", u.genre ?? "—"],
      ["Email", u.email ?? "—"],
      ["Téléphone", u.telephone ?? "—"],
      ["Adresse", [u.adresse, u.code_postal, u.ville].filter(Boolean).join(" ") || "—"],
      ["Situation", u.situation ?? "—"],
      ["Établissement", u.etablissement ?? "—"],
      ["N° étudiant", u.numero_etudiant ?? "—"],
      ["Public", u.type_public ?? "—"],
      ["Créé le", new Date(u.created_at).toLocaleString("fr-FR")],
    ],
    styles: { fontSize: 9 },
  });

  const addSection = (title: string, head: string[], rows: (string | number)[][]) => {
    const lastY = (doc as any).lastAutoTable?.finalY ?? y;
    if (lastY > 250) doc.addPage();
    const startY = lastY > 250 ? 14 : lastY + 8;
    doc.setFontSize(12);
    doc.text(title, 14, startY);
    autoTable(doc, {
      startY: startY + 2,
      head: [head],
      body: rows.length ? rows : [["—", ...Array(head.length - 1).fill("")]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });
  };

  addSection("Venues / accompagnements", ["Date", "Type", "Description"],
    (suivis ?? []).map(s => [s.date_action ?? "", s.type_action ?? "", (s.description ?? "").slice(0, 80)]));
  addSection("Demandes", ["Date", "Titre", "Statut", "Priorité"],
    (demandes ?? []).map(d => [new Date(d.created_at).toLocaleDateString("fr-FR"), d.titre, d.statut, d.priorite]));
  addSection("Rendez-vous", ["Date", "Objet", "Statut", "Modalité"],
    (rdvs ?? []).map(r => [new Date(r.date_debut).toLocaleString("fr-FR"), r.objet, r.statut, r.modalite]));
  addSection("Coups de pouce", ["Demande", "Décision", "Montant", "Statut"],
    (cps ?? []).map(c => [c.date_demande ?? "", c.date_decision ?? "—", c.montant ?? "—", c.statut]));
  addSection("Consentements", ["Date", "Accepté", "Version", "Conservation (mois)"],
    (consents ?? []).map(c => [new Date(c.date_consentement).toLocaleString("fr-FR"), c.accepte ? "Oui" : "Non", c.version, String(c.duree_conservation_mois)]));
  addSection("Notes", ["Date", "Contenu"],
    (notes ?? []).map(n => [new Date(n.created_at).toLocaleDateString("fr-FR"), (n.contenu ?? "").slice(0, 100)]));

  doc.save(`donnees-${u.nom}-${u.prenom}-${new Date().toISOString().slice(0,10)}.pdf`);
}
