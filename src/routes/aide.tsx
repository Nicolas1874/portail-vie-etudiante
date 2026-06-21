import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/aide/auth";
import { TerritoireScopeProvider } from "@/lib/aide/territoire-scope";
import { AppShell } from "@/components/aide/AppShell";

export const Route = createFileRoute("/aide")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <Guard />
    </AuthProvider>
  );
}

function Guard() {
  const { loading, profile } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas trouvé dans le localStorage du Portail, on redirige vers le login
  if (!profile) {
    console.log("AIDE Guard: Pas de profil trouvé, redirection login");
    return <Navigate to="/login" />;
  }

  // On laisse passer tout le monde (puisqu'on a déjà filtré au niveau du Portail)
  // Cela évite les boucles de redirection si les rôles internes de l'AIDE ne sont pas encore synchronisés
  return (
    <TerritoireScopeProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </TerritoireScopeProvider>
  );
}
