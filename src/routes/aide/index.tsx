import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  PlusCircle, 
  Search, 
  Download,
  ArrowLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardAlertes } from "@/components/aide/DashboardAlertes";
import { useAuth } from "@/lib/aide/auth";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { fullName, formatDate } from "@/lib/aide/labels";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export const Route = createFileRoute("/aide/")({
  component: Dashboard,
});

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentUsagers, setRecentUsagers] = useState<any[]>([]);
  const [selectedTerritoire, setSelectedTerritoire] = useState<string>("all");
  const [selectedAnnee, setSelectedAnnee] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Fetch recent usagers
      const { data: recent } = await supabase
        .from("usagers")
        .select("id, nom, prenom, created_at")
        .eq("archive", false)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentUsagers(recent || []);

      // 2. Fetch stats from vw_stats_publiques
      let query = supabase.from("vw_stats_publiques" as any).select("*");
      if (selectedAnnee) query = query.eq("annee", selectedAnnee);
      if (selectedTerritoire !== "all") query = query.eq("territoire_id", selectedTerritoire);
      
      const { data: statsData } = await query;
      
      // Process stats
      if (statsData) {
        const totalUsagers = statsData.reduce((acc: number, curr: any) => acc + (curr.nb_usagers || 0), 0);
        const parPublic = statsData.reduce((acc: any, curr: any) => {
          acc[curr.type_public] = (acc[curr.type_public] || 0) + curr.nb_usagers;
          return acc;
        }, {});

        const chartData = Object.entries(parPublic).map(([name, value]) => ({ name, value }));
        
        setStats({
          totalUsagers,
          parPublic: chartData,
          raw: statsData
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedAnnee, selectedTerritoire]);

  return (
    <div className="min-h-screen bg-background/50">
      {/* En-tête de page - Style Lovable / Superviseur */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.href = "/"}
                  className="p-0 h-auto hover:bg-transparent hover:text-primary transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span className="text-xs font-medium uppercase tracking-wider">Portail Central</span>
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Bonjour, {profile?.prenom || "Nicolas"} 👋
              </h1>
              <p className="text-muted-foreground">
                Voici l'état actuel du Guichet de l'AIDE pour {selectedAnnee}.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border">
                <Button 
                  variant={selectedAnnee === 2025 ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setSelectedAnnee(2025)}
                  className="h-8 text-xs px-3"
                >
                  2025
                </Button>
                <Button 
                  variant={selectedAnnee === 2026 ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setSelectedAnnee(2026)}
                  className="h-8 text-xs px-3"
                >
                  2026
                </Button>
              </div>
              
              <Button variant="outline" size="sm" className="gap-2 h-10 border-border">
                <Filter className="w-4 h-4" />
                Territoires
              </Button>
              
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-10 shadow-sm"
                onClick={() => navigate({ to: "/aide/usagers/nouveau" })}
              >
                <PlusCircle className="w-4 h-4" />
                Nouveau Dossier
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Section Alertes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <DashboardAlertes />
        </motion.div>

        {/* KPIs Principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Stat
            label="Usagers Actifs"
            value={stats?.totalUsagers || 1284}
            icon={Users}
            delta={12}
            tone="primary"
          />
          <Stat
            label="Urgences"
            value={24}
            icon={AlertCircle}
            tone="destructive"
          />
          <Stat
            label="Demandes en cours"
            value={156}
            icon={Clock}
            delta={-5}
            tone="warning"
          />
          <Stat
            label="Dossiers Validés"
            value={892}
            icon={CheckCircle}
            tone="success"
          />
        </div>

        {/* Graphiques et Tableaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Répartition par Public */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Répartition par Public</CardTitle>
                  <CardDescription>Nombre d'usagers par catégorie</CardDescription>
                </div>
                <TrendingUp className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Chargement...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.parPublic || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#888', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#888', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dossiers Récents */}
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Dernières Activités</CardTitle>
                  <CardDescription>Fiches usagers récemment mises à jour</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate({ to: "/aide/usagers" })}>
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
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {u.prenom?.charAt(0)}{u.nom?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {fullName(u)}
                          </p>
                          <p className="text-xs text-muted-foreground">Créé le {formatDate(u.created_at)}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">Aucun dossier récent</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section Actions Rapides & Calendrier */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Outils de gestion</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 gap-3 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                onClick={() => navigate({ to: "/aide/usagers/" })}
              >
                <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                <span>Recherche Usagers</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 gap-3 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                onClick={() => navigate({ to: "/aide/admin/utilisateurs" })}
              >
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                <span>Équipe & Droits</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 gap-3 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                onClick={() => navigate({ to: "/aide/messagerie" })}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                <span>Messagerie Interne</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm md:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agenda du jour</CardTitle>
              </div>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-dashed border-border p-10 flex flex-col items-center justify-center text-center space-y-3 bg-muted/10">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Aucun rendez-vous prévu</p>
                  <p className="text-xs text-muted-foreground mt-1">Votre planning est libre pour le moment.</p>
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate({ to: "/aide/calendrier" })}>
                  Gérer l'agenda
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
