import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, LayoutDashboard, LogIn } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // On récupère les données
    const userStr = localStorage.getItem("user");
    const appsStr = localStorage.getItem("applications");

    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        // Vérification du rôle (on accepte Superadmin ou superadmin)
        if (userData.role && userData.role.toLowerCase() === 'superadmin') {
          setApplications([
            { name: "AIDE", code: "AIDE", url: "#" },
            { name: "HANDICAP", code: "HANDICAP", url: "#" },
            { name: "CVEC", code: "CVEC", url: "#" }
          ]);
        } else if (appsStr) {
          setApplications(JSON.parse(appsStr));
        }
      } catch (e) {
        console.error("Erreur de lecture session", e);
      }
    }
    setIsReady(true);
  }, []);

  // Fonction de déconnexion forcée
  const forceLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Fonction de connexion forcée
  const forceLogin = () => {
    window.location.href = "/login";
  };

  if (!isReady) return null;

  // SI PAS CONNECTÉ
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="max-w-md w-full text-center p-8 shadow-lg">
          <LayoutDashboard className="w-16 h-16 text-blue-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Portail Vie Étudiante</h1>
          <p className="text-gray-600 mb-8">Veuillez vous identifier pour accéder à vos outils.</p>
          <Button 
            onClick={forceLogin} 
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
          >
            <LogIn className="w-5 h-5 mr-2" /> Se connecter
          </Button>
        </Card>
      </div>
    );
  }

  // SI CONNECTÉ
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-600 w-6 h-6" />
            <span className="text-xl font-bold">Portail SI</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-bold text-gray-900">{user.prenom || ''} {user.nom || user.email}</p>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{user.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={forceLogout} className="text-red-600 border-red-200 hover:bg-red-50">
              <LogOut className="w-4 h-4 mr-2" /> Quitter
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Vos Applications</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {applications.map((app) => (
            <Card key={app.code} className="border-t-4 border-t-blue-600 hover:scale-105 transition-transform duration-200">
              <CardHeader>
                <CardTitle className="text-xl">{app.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={() => window.open(app.url, '_blank')}
                >
                  Ouvrir l'outil
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {applications.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 p-8 rounded-xl text-center">
            <p className="text-amber-800 font-medium text-lg">Aucun accès n'est configuré pour votre compte.</p>
            <p className="text-amber-600">Contactez l'assistance si cela vous semble être une erreur.</p>
          </div>
        )}
      </main>
    </div>
  );
}
