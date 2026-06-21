import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      const userData = JSON.parse(saved);
      setUser(userData);
      
      // Si superadmin, on affiche les tuiles
      if (userData.role && userData.role.toLowerCase() === 'superadmin') {
        setApps([
          { name: "AIDE", url: "https://aide.univ-orleans.fr" },
          { name: "HANDICAP", url: "https://handicap.univ-orleans.fr" },
          { name: "CVEC", url: "https://cvec.univ-orleans.fr" }
        ] );
      }
    }
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Button onClick={() => window.location.href = "/login"} className="bg-blue-600">
          Veuillez vous connecter
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" />
            <span className="font-bold text-xl">Portail Vie Étudiante</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-sm">{user.prenom} {user.nom}</p>
              <p className="text-[10px] text-red-600 font-bold uppercase flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3" /> {user.role}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>Déconnexion</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-8">Vos Applications Administrateur</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map(app => (
            <Card key={app.name} className="border-t-4 border-t-blue-600 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{app.name}</CardTitle>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600" onClick={() => window.open(app.url, '_blank')}>
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
