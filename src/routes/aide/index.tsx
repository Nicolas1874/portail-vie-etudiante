import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  PlusCircle, 
  Search, 
  Download,
  LayoutDashboard,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardAlertes } from "@/components/aide/DashboardAlertes";
import { useAuth } from "@/lib/aide/auth";

export const Route = createFileRoute("/aide/")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      {/* Barre d'outils supérieure avec bouton retour */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = "/"}
            className="flex items-center gap-2 text-gray-600 border-gray-300"
          >
            <ArrowLeft className="w-4 h-4" /> Retour au Portail
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Guichet de l'AIDE</h1>
            <p className="text-gray-500">Tableau de bord de gestion des aides financières</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            onClick={() => navigate({ to: "/aide/usagers/nouveau" })}
          >
            <PlusCircle className="w-4 h-4" />
            Nouveau Dossier
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Alertes temps réel */}
        <DashboardAlertes />

        {/* Statistiques avec le vrai composant Stat de Lovable */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Total Dossiers"
            value="2845"
            icon={FileText}
            delta={12}
            tone="primary"
          />
          <Stat
            label="En Attente"
            value="148"
            icon={Clock}
            delta={-5}
            tone="warning"
          />
          <Stat
            label="Validés"
            value="2150"
            icon={CheckCircle}
            suffix=" dossiers"
            tone="success"
          />
          <Stat
            label="Usagers"
            value="1120"
            icon={Users}
            delta={48}
            tone="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2 items-center justify-center border-dashed"
                onClick={() => navigate({ to: "/aide/usagers/" })}
              >
                <Search className="h-6 w-6 text-primary" />
                <span>Recherche Usagers</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2 items-center justify-center border-dashed"
                onClick={() => navigate({ to: "/aide/admin/utilisateurs" })}
              >
                <Users className="h-6 w-6 text-primary" />
                <span>Gestion Utilisateurs</span>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Vue d'ensemble</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Accédez aux différents modules de la plateforme Vie Étudiante.
                </p>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between"
                  onClick={() => window.location.href = "/"}
                >
                  <span className="flex items-center gap-2">
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
