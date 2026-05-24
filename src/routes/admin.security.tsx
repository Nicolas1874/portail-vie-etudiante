import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { checkSuperAdmin } from "@/lib/audit.functions";
import { PortalHeader } from "@/components/PortalHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, Lock, KeyRound, Eye, Database, FileCheck, Network, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const checkFn = useServerFn(checkSuperAdmin);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    checkFn({ data: undefined })
      .then((res) => {
        setAuthorized(res.isSuperAdmin);
        if (!res.isSuperAdmin) navigate({ to: "/" });
      })
      .catch(() => navigate({ to: "/" }));
  }, [user, loading, navigate, checkFn]);

  if (loading || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Vérification des droits…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour au portail
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-md bg-primary p-2 text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Modèle de sécurité</h1>
            <p className="text-sm text-muted-foreground">
              Synthèse à destination de la DSI — Université d'Orléans
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-8 mt-4">
          Ce document décrit le modèle de sécurité du Portail Vie Étudiante.
          Il est mis à jour automatiquement à chaque évolution de la configuration.
        </p>

        <div className="space-y-4">
          <SectionCard icon={<KeyRound className="h-4 w-4" />} title="Authentification">
            <Row label="Méthode primaire" value="Email + mot de passe" status="Actif" />
            <Row label="Double authentification (2FA)" value="Code à 6 chiffres par email" status="Obligatoire pour tous" />
            <Row label="Vérification email" value="Lien envoyé à l'inscription" status="Actif" />
            <Row label="Protection mots de passe compromis" value="Have I Been Pwned (HIBP)" status="Actif" />
            <Row label="Longueur minimale mot de passe" value="12 caractères + complexité" status="À configurer DSI" />
            <Row label="Sessions" value="JWT signés, rotation automatique, stockage navigateur sécurisé" status="Actif" />
          </SectionCard>

          <SectionCard icon={<Lock className="h-4 w-4" />} title="Autorisations">
            <Row label="Modèle" value="Rôles séparés par application (table user_roles)" status="Actif" />
            <Row label="Rôles" value="admin · partenaire · direction (transverse)" status="Actif" />
            <Row label="Vérification" value="Double : RLS PostgreSQL + server functions" status="Actif" />
            <Row label="Bootstrap super-admin" value="Email institutionnel uniquement" status="Actif" />
            <Row label="Auto-protection" value="Un admin ne peut pas retirer son propre rôle" status="Actif" />
          </SectionCard>

          <SectionCard icon={<Database className="h-4 w-4" />} title="Sécurité des données">
            <Row label="Row Level Security (RLS)" value="Activée sur toutes les tables" status="Actif" />
            <Row label="Mutations administratives" value="Server functions validées par auth.uid()" status="Actif" />
            <Row label="Fonctions SECURITY DEFINER" value="EXECUTE révoqué pour anon/authenticated" status="Actif" />
            <Row label="Chiffrement au repos" value="AES-256 (PostgreSQL géré)" status="Actif" />
            <Row label="Chiffrement en transit" value="TLS 1.3 obligatoire" status="Actif" />
            <Row label="Sauvegardes" value="Quotidiennes, rétention 7 jours" status="Actif" />
          </SectionCard>

          <SectionCard icon={<Eye className="h-4 w-4" />} title="Traçabilité & audit">
            <Row label="Journal d'audit" value="Table audit_logs append-only" status="Actif" />
            <Row label="Évènements tracés" value="Connexions · 2FA · invitations · rôles · profils" status="Actif" />
            <Row label="Données collectées" value="Auteur · action · cible · IP · navigateur · date" status="Actif" />
            <Row label="Consultation" value="Super-administrateurs uniquement" status="Actif" />
            <Row label="Export" value="CSV (90 jours) pour audits DSI" status="Actif" />
            <Row label="Immutabilité" value="Pas de UPDATE ni DELETE possible" status="Actif" />
          </SectionCard>

          <SectionCard icon={<FileCheck className="h-4 w-4" />} title="Conformité RGPD">
            <Row label="Minimisation" value="Seules les données nécessaires sont collectées" status="Actif" />
            <Row label="Finalité" value="Authentification et droits d'accès aux SI" status="Documenté" />
            <Row label="Durée de conservation" value="Comptes actifs + 1 an, logs 1 an glissant" status="Conforme" />
            <Row label="Droit d'accès" value="Profil consultable par l'utilisateur" status="Actif" />
            <Row label="Droit à l'effacement" value="Suppression de compte sur demande" status="Actif" />
            <Row label="Localisation données" value="UE (à confirmer selon hébergeur final)" status="À valider" />
          </SectionCard>

          <SectionCard icon={<Network className="h-4 w-4" />} title="Architecture">
            <Row label="Principe" value="Portail = authentification + routage uniquement" status="Actif" />
            <Row label="Séparation" value="Aucune donnée métier dans le portail" status="Actif" />
            <Row label="SI connectés" value="Guichet Aide · Passerelle Handicap · CVEC" status="3 modules" />
            <Row label="Communication inter-SI" value="Aucune (cloisonnement strict)" status="Actif" />
            <Row label="Stack technique" value="TanStack Start · PostgreSQL · TLS · JWT" status="Open source" />
          </SectionCard>

          <SectionCard icon={<AlertTriangle className="h-4 w-4" />} title="Points d'attention pour la DSI">
            <ul className="text-sm space-y-2 list-disc pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Hébergement</strong> : actuellement Cloudflare (UE).
                Migration prévue vers infrastructure DSI Université d'Orléans pour souveraineté complète.
              </li>
              <li>
                <strong className="text-foreground">SSO Shibboleth</strong> : compatible — peut être ajouté
                en complément de l'authentification email pour utiliser le SSO universitaire.
              </li>
              <li>
                <strong className="text-foreground">Politique mot de passe</strong> : configurer 12 caractères
                minimum + complexité dans la console Lovable Cloud → Cloud → Users → Auth Settings.
              </li>
              <li>
                <strong className="text-foreground">Tests d'intrusion</strong> : recommandés avant mise en
                production. Code source ouvert pour audit DSI.
              </li>
            </ul>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value, status }: { label: string; value: string; status: string }) {
  const isOk = status === "Actif" || status === "Conforme";
  const isWarn = status.includes("À ") || status.includes("Documenté");
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{value}</div>
      </div>
      <Badge variant={isOk ? "default" : isWarn ? "secondary" : "outline"} className="shrink-0">
        {status}
      </Badge>
    </div>
  );
}
