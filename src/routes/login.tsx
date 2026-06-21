import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("https://uo-api-vie-etudiante.cleverapps.io/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password } ),
      });

      const data = await response.json();

      if (response.ok) {
        // --- ÉTAPE CRUCIALE : ON FORCE L'ENREGISTREMENT ---
        localStorage.clear(); // On nettoie tout avant
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("applications", JSON.stringify(data.applications || []));
        
        toast.success("Connexion réussie !");
        
        // On attend 500ms pour être SÛR que le navigateur a écrit sur le disque
        setTimeout(() => {
          window.location.href = "/"; 
        }, 500);
      } else {
        toast.error(data.message || "Erreur de connexion");
      }
    } catch (error) {
      toast.error("Impossible de contacter l'API");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <LayoutDashboard className="w-12 h-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>Accédez au Portail Vie Étudiante</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email institutionnel</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nom.prenom@univ-orleans.fr" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
