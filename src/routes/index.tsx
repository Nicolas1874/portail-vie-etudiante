import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate({ to: "/login" });
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Si l'utilisateur est superadmin, on affiche les 3 tuiles
      if (userData.role === 'superadmin') {
        setApplications([
          { name: "AIDE", code: "AIDE", url: "#" },
          { name: "HANDICAP", code: "HANDICAP", url: "#" },
          { name: "CVEC", code: "CVEC", url: "#" }
        ]);
      } else {
        // Sinon on regarde les applications stockées
        const appsStr = localStorage.getItem("applications");
        if (appsStr) setApplications(JSON.parse(appsStr));
      }
    } catch (e) {
      console.error("Erreur de lecture des données utilisateur", e);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate({ to: "/login" });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" />
            <h1 className="text-2xl font-bold">Portail Vie Étudiante</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-bold">{user.prenom} {user.nom}</p>
              <p className="text-sm text-blue-600 font-medium">{user.role}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </Button>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-6">Vos Applications</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {applications.map((app) => (
            <Card key={app.code} className="border-t-4 border-t-blue-600">
              <CardHeader>
                <CardTitle>{app.name}</CardTitle>
                <CardDescription>Accéder à {app.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600" onClick={() => window.open(app.url, '_blank')}>
                  Ouvrir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {applications.length === 0 && (
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-yellow-800">
            Aucun accès trouvé pour votre compte.
          </div>
        )}
      </div>
    </div>
  );
}
