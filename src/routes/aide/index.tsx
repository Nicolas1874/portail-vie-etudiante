import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  PlusCircle, 
  Search, 
  Download,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { RecentRequests } from "@/components/dashboard/RecentRequests";
import { Calendar } from "@/components/dashboard/Calendar";

export const Route = createFileRoute("/aide")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      {/* Barre d'outils supérieure */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate({ to: "/" })}
            className="mb-2 -ml-2 text-gray-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Portail Central
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Système AIDE</h1>
          <p className="text-gray-500 mt-1">Gestion des aides financières et dossiers étudiants</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exporter
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="w-4 h-4" /> Nouveau Dossier
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Dossiers"
            value="1,284"
            icon={<FileText className="w-5 h-5" />}
            trend="+12% ce mois"
            variant="default"
          />
          <StatCard
            title="En Attente"
            value="156"
            icon={<Clock className="w-5 h-5" />}
            trend="24 urgents"
            variant="warning"
          />
          <StatCard
            title="Validés"
            value="892"
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
          {/* Colonne principale : Dossiers récents */}
          <div className="lg:col-span-2 space-y-6">
            <RecentRequests />
          </div>

          {/* Colonne latérale : Actions et Calendrier */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <ActionCard
                title="Recherche Avancée"
                description="Filtrer les dossiers par critères"
                icon={<Search className="w-6 h-6" />}
                onClick={() => {}}
              />
              <ActionCard
                title="Tableau de bord"
                description="Vue d'ensemble des SI"
                icon={<LayoutDashboard className="w-6 h-6" />}
                onClick={() => navigate({ to: "/" })}
              />
            </div>
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  );
}
