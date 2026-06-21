import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      // URL de votre API sur Clever Cloud
      const response = await fetch("https://api-vie-etudiante-uo.cleverapps.io/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password } ),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        // On enregistre les données avec la clé qui a fonctionné
        localStorage.setItem("uo_user", JSON.stringify(data.user));
        toast.success("Connexion réussie !");
        
        // Redirection vers l'accueil
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      } else {
        toast.error(data.message || "Erreur de connexion");
      }
    } catch (error) {
      toast.error("L'API ne répond pas. Vérifiez l'URL dans le code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="text-center">
          <LayoutDashboard className="w-12 h-12 text-blue-600 mx-auto mb-2" />
          <CardTitle className="text-2xl font-bold">Connexion Portail</CardTitle>
          <CardDescription>Accès réservé aux agents</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
