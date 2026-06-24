import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, LayoutDashboard, ShieldCheck, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [user, setUser] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("uo_user");
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        setUser(userData);
        
        // On définit les tuiles dynamiquement
        const userApps = [];
        const userRole = userData.role?.toLowerCase();

        // 1. Si Superadmin, il voit tout
        if (userRole === 'superadmin' || userRole === 'admin') {
          userApps.push(
            { 
              name: "AIDE", 
              desc: "Gestion des aides financières et dossiers usagers",
              url: "/aide"
            },
            { 
              name: "PASSERELLE", 
              desc: "Interface de liaison et coordination",
              url: "/passerelle" 
            },
            { 
              name: "CVEC", 
              desc: "Gestion de la Contribution Vie Étudiante et de Campus",
              url: "/cvec" 
            }
          );
        } else {
          // 2. Sinon, on peut vérifier si l'utilisateur a accès au module AIDE
          // (On pourrait faire un appel API ici, mais pour l'instant on se base sur les apps déclarées dans uo_user)
          if (userData.apps?.includes('aide') || userRole === 'agent' || userRole === 'superviseur') {
            userApps.push({ 
              name: "AIDE", 
              desc: "Gestion des aides financières et dossiers usagers",
              url: "/aide"
            });
          }
        }
        
        setApps(userApps);
      } catch (e) {
        console.error("Erreur de lecture session", e);
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-blue-600 w-6 h-6" />
            <h1 className="text-xl font-bold text-gray-900">Portail Vie Étudiante</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-sm">{user.prenom} {user.nom}</p>
              <p className="text-[10px] text-red-600 font-bold uppercase flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3" /> {user.role}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>Déconnexion</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-8">Vos Applications</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map(app => (
            <Card key={app.name} className="border-t-4 border-t-blue-600 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{app.name}</CardTitle>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm mb-6">{app.desc}</p>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={() => {
                    if (app.url.startsWith('/')) {
                      window.location.href = app.url;
                    } else {
                      window.open(app.url, '_blank');
                    }
                  }}
                >
                  Ouvrir l'application
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
