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
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/aide")({
  component: Dashboard,
});

const StatCard = ({ title, value, icon, trend, color }: any) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>{icon}</div>
        <span className="text-xs font-medium text-gray-500">{trend}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </CardContent>
  </Card>
);

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
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
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <PlusCircle className="w-4 h-4" /> Nouveau Dossier
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Dossiers" value="1,284" icon={<FileText />} trend="+12% ce mois" color="blue" />
          <StatCard title="En Attente" value="156" icon={<Clock />} trend="24 urgents" color="orange" />
          <StatCard title="Validés" value="892" icon={<CheckCircle />} trend="98% succès" color="green" />
          <StatCard title="Usagers" value="1,120" icon={<Users />} trend="+48 nouveaux" color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Dossiers Récents</CardTitle>
              <CardDescription>Les dernières demandes déposées sur la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: "DOS-2024-001", user: "Jean Dupont", date: "Il y a 2h", status: "En attente", amount: "150€" },
                  { id: "DOS-2024-002", user: "Marie Curie", date: "Il y a 5h", status: "Validé", amount: "300€" },
                  { id: "DOS-2024-003", user: "Paul Valéry", date: "Hier", status: "En cours", amount: "200€" },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {item.user.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{item.user}</p>
                        <p className="text-xs text-gray-500">{item.id} • {item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900">{item.amount}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="link" className="w-full mt-4 text-blue-600">Voir tous les dossiers</Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-blue-600 text-white">
              <CardHeader><CardTitle className="text-white">Recherche Rapide</CardTitle></CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-blue-300" />
                  <input className="w-full bg-blue-700 border-none rounded-md py-2 pl-10 text-white placeholder:text-blue-300" placeholder="N° de dossier..." />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
