import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  PlusCircle, 
  Search, 
  Download,
  LayoutDashboard,
  ArrowLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MessageSquare,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardAlertes } from "@/components/aide/DashboardAlertes";
import { useAuth } from "@/lib/aide/auth";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { fullName, formatDate } from "@/lib/aide/labels";

export const Route = createFileRoute("/aide/")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [recentUsagers, setRecentUsagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("usagers")
        .select("id, nom, prenom, created_at")
        .eq("archive", false)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentUsagers(data || []);
      setLoading(false);
    };
    fetchRecent();
  }, []);

  return (
    <div className="min-h-screen bg-background/50">
      {/* En-tête de page Lovable Style */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = "/"}
              className="flex items-center gap-2 text-muted-foreground border-border hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Retour au Portail
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Guichet de l'AIDE</h1>
              <p className="text-sm text-muted-foreground">Tableau de bord de gestion des aides financières</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Download className="w-4 h-4" /> Exporter
            </Button>
            <Button 
              className="bg-aide hover:bg-aide/90 text-white gap-2 h-9 shadow-sm"
              onClick={() => navigate({ to: "/aide/usagers/nouveau" })}
            >
              <PlusCircle className="w-4 h-4" /> Nouveau Dossier
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Alertes temps réel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <DashboardAlertes />
        </motion.div>

        {/* Statistiques avec le vrai composant Stat de Lovable */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Total Dossiers"
            value={2845}
            icon={FileText}
            delta={12}
            tone="primary"
          />
          <Stat
            label="En Attente"
            value={148}
            icon={Clock}
            delta={-5}
            tone="warning"
          />
          <Stat
            label="Validés"
            value={2150}
            icon={CheckCircle}
            suffix=" dossiers"
            tone="success"
          />
          <Stat
            label="Usagers"
            value={1120}
            icon={Users}
            delta={48}
            tone="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section Dossiers Récents */}
          <Card className="lg:col-span-2 border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Dossiers Récents</CardTitle>
                  <CardDescription>Les dernières fiches usagers créées</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-aide" onClick={() => navigate({ to: "/aide/usagers/" })}>
                  Voir tout <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
              ) : recentUsagers.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentUsagers.map((u) => (
                    <Link
                      key={u.id}
                      to="/aide/usagers/$id"
                      params={{ id: u.id }}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-aide/10 flex items-center justify-center text-aide font-bold text-sm">
                          {u.prenom?.charAt(0)}{u.nom?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-aide transition-colors">
                            {fullName(u)}
                          </p>
                          <p className="text-xs text-muted-foreground">Créé le {formatDate(u.created_at)}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-aide transition-colors" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">Aucun dossier récent</div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar Actions & Calendrier */}
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 gap-3 border-border hover:border-aide hover:bg-aide/5 transition-all group"
                  onClick={() => navigate({ to: "/aide/usagers/" })}
                >
                  <Search className="h-4 w-4 text-muted-foreground group-hover:text-aide" />
                  <span>Recherche Usagers</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 gap-3 border-border hover:border-aide hover:bg-aide/5 transition-all group"
                  onClick={() => navigate({ to: "/aide/admin/utilisateurs" })}
                >
                  <Users className="h-4 w-4 text-muted-foreground group-hover:text-aide" />
                  <span>Gestion Utilisateurs</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 gap-3 border-border hover:border-aide hover:bg-aide/5 transition-all group"
                  onClick={() => navigate({ to: "/aide/messagerie" })}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-aide" />
                  <span>Messagerie</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Calendrier</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-dashed border-border p-8 flex flex-col items-center justify-center text-center space-y-2 bg-muted/20">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Aucun rendez-vous aujourd'hui</p>
                  <Button variant="link" size="sm" className="text-aide text-xs h-auto p-0" onClick={() => navigate({ to: "/aide/calendrier" })}>
                    Voir l'agenda
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-aide/5 border-aide/20 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <LayoutDashboard className="h-12 w-12 text-aide" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-aide">Navigation Portail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-aide/80">
                  Retournez au menu principal pour accéder aux autres services (Passerelle, CVEC).
                </p>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between text-aide hover:bg-aide/10 hover:text-aide px-2"
                  onClick={() => window.location.href = "/"}
                >
                  <span className="flex items-center gap-2 text-xs font-bold">
                    <LayoutDashboard className="h-4 w-4" /> Portail Principal
                  </span>
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
