/**
 * Vue 360° — Hero narratif de la fiche usager.
 * Présentation uniquement : ne touche pas la logique métier (CRUD reste dans la page parente).
 */
import { motion } from "motion/react";
import { ArrowLeft, Printer, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyHint } from "@/components/ui/key-hint";
import { fullName, TYPES_PUBLIC, SITUATIONS, formatDate } from "@/lib/labels";
import { ease, duration, staggerParent, staggerChild } from "@/lib/motion";
import { useNavigate } from "@tanstack/react-router";
import { genererFicheUsagerPDF } from "@/lib/fiche-usager-pdf";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  usager: any;
  suivis: any[];
  demandes: any[];
  rdvs: any[];
  coupsPouce: any[];
  notes: any[];
  onToggleUrgence: (next: boolean, motif?: string | null) => void;
  setActiveTab: (t: string) => void;
  isScdOnly?: boolean;
}

function initials(u: any) {
  return [u?.prenom?.[0], u?.nom?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 86_400_000);
}

export function UsagerHero({
  usager,
  suivis,
  demandes,
  rdvs,
  coupsPouce,
  notes,
  onToggleUrgence,
  setActiveTab,
  isScdOnly = false,
}: Props) {

  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);
  const handlePrint = async () => {
    setPrinting(true);
    try {
      await genererFicheUsagerPDF(usager.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de génération du PDF");
    } finally {
      setPrinting(false);
    }
  };
  const dernSuivi = suivis[0]?.date_visite ?? suivis[0]?.created_at ?? null;
  const joursDepuis = daysSince(dernSuivi);
  const demandesOuvertes = demandes.filter((d) => d.statut !== "cloturee" && d.statut !== "annulee").length;
  const rdvFutur = rdvs.find((r) => new Date(r.date_debut).getTime() > Date.now());
  const subtitle = [TYPES_PUBLIC[usager.type_public] ?? SITUATIONS[usager.situation], usager.composante]
    .filter(Boolean)
    .join(" · ");

  // Signaux IA inline (calculés à partir des données chargées)
  const signaux: { tone: "warning" | "info" | "success"; label: string; cta?: { label: string; tab: string } }[] = [];
  if (joursDepuis !== null && joursDepuis > 45 && !rdvFutur) {
    signaux.push({
      tone: "warning",
      label: `Aucune venue depuis ${joursDepuis} jours`,
      cta: { label: "Planifier un RDV", tab: "rdv" },
    });
  }
  if (demandesOuvertes >= 2) {
    signaux.push({
      tone: "info",
      label: `${demandesOuvertes} demandes ouvertes en parallèle`,
      cta: { label: "Voir les demandes", tab: "demandes" },
    });
  }
  if (!usager.consentement_actif) {
    signaux.push({
      tone: "warning",
      label: "Consentement RGPD non recueilli",
      cta: { label: "Régulariser", tab: "rgpd" },
    });
  }
  if (rdvFutur) {
    signaux.push({
      tone: "success",
      label: `Prochain RDV le ${formatDate(rdvFutur.date_debut)}`,
    });
  }

  return (
    <div className="relative overflow-hidden border-b border-border/60" data-no-print>
      <div
        className="absolute inset-0 pointer-events-none opacity-90"
        style={{
          background:
            "radial-gradient(at 15% 0%, oklch(0.88 0.045 70 / 0.35) 0px, transparent 55%), radial-gradient(at 90% 100%, oklch(0.68 0.12 60 / 0.18) 0px, transparent 55%)",
        }}
      />
      <div className="relative p-6 md:p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/usagers" })} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={printing}>
              <Printer className="h-4 w-4 mr-2" />
              {printing ? "Génération…" : "Imprimer la fiche (PDF)"}
            </Button>
            {!isScdOnly && (usager.urgence ? (
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => onToggleUrgence(false)}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Lever l'urgence
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const motif = window.prompt("Motif de l'urgence (optionnel) :") ?? "";
                  onToggleUrgence(true, motif || null);
                }}
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                Signaler une urgence
              </Button>
            ))}

          </div>
        </div>

        {/* Bandeau urgence animé */}
        {!isScdOnly && usager.urgence && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.base, ease: ease.outQuart }}
            className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="mt-0.5"
            >
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </motion.div>
            <div>
              <div className="font-display font-semibold text-destructive">Situation d'urgence active</div>
              {usager.urgence_motif && (
                <div className="text-sm text-muted-foreground mt-0.5">{usager.urgence_motif}</div>
              )}
            </div>
          </motion.div>
        )}

        {/* Identité */}
        <div className="flex items-start gap-5">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: duration.slow, ease: ease.outExpo }}
            className="shrink-0 h-20 w-20 md:h-24 md:w-24 rounded-3xl flex items-center justify-center text-2xl md:text-3xl font-display font-semibold text-primary-foreground shadow-lg"
            style={{ background: "var(--gradient-primary)" }}
          >
            {initials(usager)}
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: duration.base, ease: ease.outQuart }}
              className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight"
            >
              {fullName(usager)}
            </motion.h1>
            {subtitle && (
              <div className="mt-1 text-muted-foreground">{subtitle}</div>
            )}

            {/* Parcours condensé */}
            {!isScdOnly && (
              <motion.div
                variants={staggerParent(0.05, 0.1)}
                initial="initial"
                animate="animate"
                className="mt-4 flex flex-wrap gap-2"
              >
                <ParcoursChip n={suivis.length} label={suivis.length > 1 ? "venues" : "venue"} />
                <ParcoursChip n={demandesOuvertes} label={demandesOuvertes > 1 ? "demandes ouvertes" : "demande ouverte"} tone={demandesOuvertes > 0 ? "warm" : "neutral"} />
                <ParcoursChip n={rdvs.length} label="RDV" />
                <ParcoursChip n={coupsPouce.length} label={coupsPouce.length > 1 ? "coups de pouce" : "coup de pouce"} />
                <ParcoursChip n={notes.length} label="notes" />
                {joursDepuis !== null && (
                  <motion.span variants={staggerChild} className="px-3 py-1.5 rounded-full bg-surface-2 border border-border/60 text-xs text-muted-foreground">
                    Dernière venue il y a <span className="font-mono text-foreground">{joursDepuis}j</span>
                  </motion.span>
                )}
              </motion.div>
            )}

          </div>
        </div>

        {/* Signaux IA */}
        {!isScdOnly && signaux.length > 0 && (
          <motion.div
            variants={staggerParent(0.05, 0.2)}
            initial="initial"
            animate="animate"
            className="mt-6 grid gap-2 md:grid-cols-2"
          >
            {signaux.map((s, i) => (
              <motion.button
                key={i}
                variants={staggerChild}
                onClick={() => s.cta && setActiveTab(s.cta.tab)}
                className={`group text-left flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  s.tone === "warning"
                    ? "border-warning/40 bg-warning/5"
                    : s.tone === "success"
                      ? "border-success/40 bg-success/5"
                      : "border-info/40 bg-info/5"
                }`}
              >
                <Sparkles
                  className={`h-4 w-4 shrink-0 ${
                    s.tone === "warning" ? "text-warning" : s.tone === "success" ? "text-success" : "text-info"
                  }`}
                />
                <div className="flex-1 text-sm font-medium">{s.label}</div>
                {s.cta && (
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {s.cta.label} →
                  </span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Raccourcis visibles */}
        {!isScdOnly && (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-wider text-[10px] font-semibold">Raccourcis</span>
            <ShortcutTag k="n" label="Nouvelle venue" />
            <ShortcutTag k="d" label="Demande" />
            <ShortcutTag k="r" label="RDV" />
            <ShortcutTag k="t" label="Note" />
            <ShortcutTag k="c" label="Coup de pouce" />
          </div>
        )}

      </div>
    </div>
  );
}

function ParcoursChip({ n, label, tone = "neutral" }: { n: number; label: string; tone?: "neutral" | "warm" }) {
  return (
    <motion.span
      variants={staggerChild}
      className={`px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 ${
        tone === "warm" && n > 0
          ? "bg-accent/40 border-accent text-accent-foreground"
          : "bg-surface-2 border-border/60 text-foreground"
      }`}
    >
      <span className="font-mono font-semibold tabular-nums">{n}</span>
      <span className="text-muted-foreground">{label}</span>
    </motion.span>
  );
}

function ShortcutTag({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <KeyHint keys={k} />
      <span>{label}</span>
    </span>
  );
}
