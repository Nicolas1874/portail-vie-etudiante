import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, LayoutDashboard, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

interface Application {
  name: string;
  code: string;
  url: string;
}

interface User {
  email: string;
  nom: string;
  prenom?: string;
  role?: string;
}

function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const appsStr = localStorage.getItem("applications");

    if (!userStr) {
      navigate({ to: "/login" });
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);
    
    // Logique de gestion des rôles pour l'affichage des tuiles
    const role = userData.role?.toLowerCase();
    let defaultApps: Application[] = [];

    if (role === 'superadmin') {
      defaultApps = [
        { name: "AIDE", code: "AIDE", url: "#" },
        { name: "HANDICAP", code: "HANDICAP", url: "#" },
        { name: "CVEC", code: "CVEC", url: "#" }
      ];
    } else if (role === 'admin_aide') {
      defaultApps = [{ name: "AIDE", code: "AIDE", url: "#" }];
    } else if (role === 'admin_handicap') {
      defaultApps = [{ name: "HANDICAP", code: "HANDICAP", url: "#" }];
    } else if (role === 'admin_cvec') {
      defaultApps = [{ name: "CVEC", code: "CVEC", url: "#" }];
    }

    // On combine les tuiles par défaut du rôle avec les accès spécifiques de la base de données
    const dbApps = appsStr ? JSON.parse(appsStr) : [];
    
    // Fusion sans doublons (basé sur le code)
    const combinedApps = [...defaultApps];
    dbApps.forEach((dbApp: Application) => {
      if (!combinedApps.find(a => a.code === dbApp.code)) {
        combinedApps.push(dbApp);
      }
    });

    setApplications(combinedApps);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate({ to: "/login" });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Portail Vie Étudiante</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4">
            <p className="text-sm font-medium text-gray-900">{user.prenom} {user.nom}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
              {user.role === 'superadmin' ? (
                <ShieldAlert className="w-3 h-3 text-red-600" />
              ) : (
                user.role?.startsWith('admin_') && <ShieldCheck className="w-3 h-3 text-green-600" />
              )}
              {user.role || 'Agent'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue sur votre espace</h2>
          <p className="text-gray-600">Sélectionnez l'application que vous souhaitez consulter.</p>
        </div>

        {applications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <Card key={app.code} className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-600">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center text-lg">
                    {app.name}
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>Interface de gestion {app.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open(app.url, '_blank')}
                  >
                    Ouvrir l'application
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-800">Aucun accès attribué</CardTitle>
              <CardDescription className="text-amber-700">
                Votre compte est créé mais aucun droit ne vous a été attribué. 
                Contactez l'administrateur pour obtenir des accès.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
}
