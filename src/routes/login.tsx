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

      if (response.ok && data.user) {
        // --- SAUVEGARDE FORCÉE ---
        const userToStore = JSON.stringify(data.user);
        localStorage.setItem("uo_user", userToStore); // On utilise la clé qui a marché !
        
        console.log("Données sauvegardées :", localStorage.getItem("uo_user"));
        
        toast.success("Connexion réussie ! Redirection...");
        
        // On attend un peu pour être sûr
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      } else {
        toast.error(data.message || "Identifiants incorrects");
      }
    } catch (error) {
      toast.error("Erreur de connexion à l'API");
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
          <CardDescription>Utilisez vos identifiants institutionnels</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="nicolas.landry@univ-orleans.fr" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
