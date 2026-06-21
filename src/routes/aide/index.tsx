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
  ArrowLeft,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardAlertes } from "@/components/aide/DashboardAlertes";

export const Route = createFileRoute("/aide/")({
  component: Dashboard,
});

function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          {trend && <span className="text-xs font-medium text-muted-foreground">{trend}</span>}
        </div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-4 hover:bg-accent transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
    </button>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/" })}
            className="mb-2 -ml-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Portail
          </Button>
          <h1 className="text-3xl font-bold">Guichet de l'Aide</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des aides financières et dossiers étudiants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exporter
          </Button>
          <Button
            className="gap-2"
            onClick={() => navigate({ to: "/aide/usagers/nouveau" })}
          >
            <PlusCircle className="w-4 h-4" /> Nouveau dossier
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total dossiers" value="—" icon={<FileText className="w-5 h-5" />} />
          <StatCard title="En attente" value="—" icon={<Clock className="w-5 h-5" />} />
          <StatCard title="Validés" value="—" icon={<CheckCircle className="w-5 h-5" />} />
          <StatCard title="Usagers" value="—" icon={<Users className="w-5 h-5" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alertes & dossiers récents</CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardAlertes />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <ActionCard
              title="Rechercher un usager"
              description="Annuaire et fiches"
              icon={<Search className="w-6 h-6" />}
              onClick={() => navigate({ to: "/aide/usagers" })}
            />
            <ActionCard
              title="Vue Portail"
              description="Toutes les applications"
              icon={<LayoutDashboard className="w-6 h-6" />}
              onClick={() => navigate({ to: "/" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
