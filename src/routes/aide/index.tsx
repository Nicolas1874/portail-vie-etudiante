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
import { StatCard } from "@/components/aide/dashboard/StatCard";
import { ActionCard } from "@/components/aide/dashboard/ActionCard";
import { RecentRequests } from "@/components/aide/dashboard/RecentRequests";
import { Calendar } from "@/components/aide/dashboard/Calendar";
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
            onClick={() => navigate({ to: "/aide/admin/utilisateurs" })}
          >
            <PlusCircle className="w-4 h-4" />
            Nouveau Dossier
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Dossiers"
            value="2,845"
            icon={<FileText className="w-5 h-5" />}
            trend="+12% vs mois dernier"
            variant="default"
          />
          <StatCard
            title="En Attente"
            value="148"
            icon={<Clock className="w-5 h-5" />}
            trend="-5% vs hier"
            variant="warning"
          />
          <StatCard
            title="Validés"
            value="2,150"
            icon={<CheckCircle className="w-5 h-5" />}
            trend="98% de succès"
            variant="success"
          />
          <StatCard
            title="Usagers"
            value="1,120"
            icon={<Users className="w-5 h-5" />}
            trend="+48 nouveaux"
            variant="info"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <RecentRequests />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <ActionCard
                title="Recherche Avancée"
                description="Filtrer les dossiers par critères"
                icon={<Search className="w-6 h-6" />}
                onClick={() => {}}
              />
              <ActionCard
                title="Gestion Utilisateurs"
                description="Gérer les accès et les rôles"
                icon={<Users className="w-6 h-6" />}
                onClick={() => navigate({ to: "/aide/admin/utilisateurs" })}
              />
              <ActionCard
                title="Tableau de bord"
                description="Vue d'ensemble des SI"
                icon={<LayoutDashboard className="w-6 h-6" />}
                onClick={() => window.location.href = "/"}
              />
            </div>
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  );
}
