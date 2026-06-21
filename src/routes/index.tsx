import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, LayoutDashboard, LogIn } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        if (userData.role === 'superadmin') {
          setApplications([
            { name: "AIDE", code: "AIDE", url: "#" },
            { name: "HANDICAP", code: "HANDICAP", url: "#" },
            { name: "CVEC", code: "CVEC", url: "#" }
          ]);
        } else {
          const appsStr = localStorage.getItem("applications");
          if (appsStr) setApplications(JSON.parse(appsStr));
        }
      } catch (e) {
        console.error("Erreur de lecture", e);
      }
    }
    setChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login"; // Redirection brutale et propre
  };

  if (!checked) return <div className="p-8 text-center">Vérification de la session...</div>;

  // SI PAS D'UTILISATEUR : On affiche un écran de bienvenue au lieu de rediriger
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center p-6">
          <LayoutDashboard className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <CardTitle className="text-2xl mb-2">Portail Vie Étudiante</CardTitle>
          <p className="text-gray-600 mb-6">Veuillez vous connecter pour accéder à vos applications.</p>
          <Button asChild className="w-full bg-blue-600">
            <Link to="/login">
              <LogIn className="w-4 h-4 mr-2" /> Se connecter
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  // SI UTILISATEUR CONNECTÉ : On affiche les tuiles
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" />
            <h1 className="text-xl md:text-2xl font-bold">Portail Vie Étudiante</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-bold">{user.prenom || ''} {user.nom || user.email}</p>
              <p className="text-sm text-blue-600 font-medium">{user.role || 'Agent'}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </Button>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-6">Vos Applications</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {applications.map((app) => (
            <Card key={app.code} className="border-t-4 border-t-blue-600 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{app.name}</CardTitle>
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
          <Card className="bg-amber-50 p-6 text-amber-800 border-amber-200">
            Aucun accès spécifique n'a été trouvé pour votre compte.
          </Card>
        )}
      </div>
    </div>
  );
}
