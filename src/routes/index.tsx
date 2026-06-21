import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("uo_user");
    if (saved) {
      setUser(JSON.parse(saved));
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Bienvenue sur votre Portail !</h1>
      <p className="text-lg text-gray-600 mb-8">Votre rôle : {user.role}</p>
      <Button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 text-white">
        <LogOut className="w-4 h-4 mr-2" /> Déconnexion
      </Button>
    </div>
  );
}
