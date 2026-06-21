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

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        // On force l'affichage des tuiles si superadmin
        if (userData.role && userData.role.toLowerCase() === 'superadmin') {
          setApplications([
            { name: "AIDE", code: "AIDE", url: "#" },
            { name: "HANDICAP", code: "HANDICAP", url: "#" },
            { name: "CVEC", code: "CVEC", url: "#" }
          ]);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center shadow-lg">
          <LayoutDashboard className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-4">Portail Vie Étudiante</h1>
          <Button onClick={() => window.location.href = "/login"} className="bg-blue-600">
            <LogIn className="w-4 h-4 mr-2" /> Se connecter
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" />
            <h1 className="text-2xl font-bold">Portail SI</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold">{user.prenom} {user.nom}</p>
              <p className="text-xs font-bold text-blue-600 uppercase">{user.role}</p>
            </div>
            <Button variant="outline" onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
              Déconnexion
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {applications.map((app) => (
            <Card key={app.code} className="border-t-4 border-t-blue-600">
              <CardHeader><CardTitle>{app.name}</CardTitle></CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600" onClick={() => window.open(app.url, '_blank')}>
                  Ouvrir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
