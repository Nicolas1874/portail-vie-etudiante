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
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/aide/")({
  component: Dashboard,
});

// --- COMPOSANTS INTERNES ---
const StatCard = ({ title, value, icon, trend, variant }: any) => {
  const colors: any = {
    default: "text-blue-600 bg-blue-50",
    warning: "text-amber-600 bg-amber-50",
    success: "text-emerald-600 bg-emerald-50",
    info: "text-sky-600 bg-sky-50"
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${colors[variant || 'default']}`}>{icon}</div>
          <span className="text-xs font-medium text-gray-500">{trend}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
};

const ActionCard = ({ title, description, icon, onClick }: any) => (
  <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={onClick}>
    <CardContent className="pt-6">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-gray-50 text-gray-600">{icon}</div>
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const RecentRequests = () => (
  <Card>
    <CardHeader><CardTitle>Dossiers Récents</CardTitle></CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">U</div>
              <div>
                <p className="font-bold text-gray-900">Usager {i}</p>
                <p className="text-xs text-gray-500">DOS-2024-00{i} • 21 Juin 2024</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const Calendar = () => (
  <Card>
    <CardHeader><CardTitle>Calendrier</CardTitle></CardHeader>
    <CardContent>
      <div className="h-48 flex items-center justify-center text-gray-400">
        (Composant Calendrier à implémenter)
      </div>
    </CardContent>
  </Card>
);

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/"} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour au Portail
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Guichet de l'AIDE</h1>
            <p className="text-gray-500">Tableau de bord de gestion</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> Exporter</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => navigate({ to: "/aide/admin/utilisateurs" })}>
            <PlusCircle className="w-4 h-4" /> Nouveau Dossier
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Dossiers" value="2,845" icon={<FileText className="w-5 h-5" />} trend="+12%" variant="default" />
          <StatCard title="En Attente" value="148" icon={<Clock className="w-5 h-5" />} trend="-5%" variant="warning" />
          <StatCard title="Validés" value="2,150" icon={<CheckCircle className="w-5 h-5" />} trend="98%" variant="success" />
          <StatCard title="Usagers" value="1,120" icon={<Users className="w-5 h-5" />} trend="+48" variant="info" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <RecentRequests />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <ActionCard title="Recherche Avancée" description="Filtrer les dossiers" icon={<Search className="w-6 h-6" />} onClick={() => {}} />
              <ActionCard title="Gestion Utilisateurs" description="Accès et rôles" icon={<Users className="w-6 h-6" />} onClick={() => navigate({ to: "/aide/admin/utilisateurs" })} />
              <ActionCard title="Tableau de bord" description="Vue d'ensemble" icon={<LayoutDashboard className="w-6 h-6" />} onClick={() => window.location.href = "/"} />
            </div>
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  );
}
