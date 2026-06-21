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
        
        // Logique d'affichage des tuiles selon le rôle
        if (userData.role && userData.role.toLowerCase() === 'superadmin') {
          setApps([
            { name: "AIDE", url: "https://aide.univ-orleans.fr", desc: "Gestion des aides financières" },
            { name: "HANDICAP", url: "https://handicap.univ-orleans.fr", desc: "Accompagnement spécifique" },
            { name: "CVEC", url: "https://cvec.univ-orleans.fr", desc: "Gestion de la contribution vie étudiante" }
          ] );
        }
      } catch (e) {
        console.error("Erreur session");
      }
    } else {
        // Si aucune session, retour au login
        window.location.href = "/login";
    }
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-600 w-6 h-6" />
            <span className="font-bold text-xl text-gray-900">Portail Vie Étudiante</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-sm text-gray-900">{user.prenom} {user.nom}</p>
              <p className="text-[10px] text-red-600 font-bold uppercase flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3" /> {user.role}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="text-gray-600 hover:text-red-600">
              Déconnexion
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 md:p-12">
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Bonjour, {user.prenom} !</h2>
          <p className="text-gray-500">Voici vos applications de gestion disponibles.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {apps.map(app => (
            <Card key={app.name} className="border-t-4 border-t-blue-600 hover:shadow-xl transition-all duration-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-2xl font-bold">{app.name}</CardTitle>
                <ExternalLink className="w-5 h-5 text-gray-300" />
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm mb-6">{app.desc}</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-semibold" onClick={() => {
                  if (app.url.startsWith("/")) window.location.href = app.url;
                  else window.open(app.url, '_blank');
                }}>
                  Ouvrir l'application
                </Button>

              </CardContent>
            </Card>
          ))}
        </div>

        {apps.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 p-8 rounded-xl text-center">
            <p className="text-amber-800 font-medium">Aucun droit d'accès configuré pour votre compte.</p>
          </div>
        )}
      </main>
    </div>
  );
}
