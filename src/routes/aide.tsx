import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TerritoireScopeProvider } from "@/lib/territoire-scope";
import { AppShell } from "@/components/AppShell";

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
  const { loading, session, roles } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" />;

  // Superviseur "pur" : accès limité au tableau de bord (statistiques),
  // notifications et paramètres. Pas d'accès aux fiches usagers.
  const isSuperviseurOnly =
    roles.length > 0 && roles.every((r) => r === "superviseur");
  if (isSuperviseurOnly) {
    const allowed = ["/", "/notifications", "/parametres"];
    const ok = allowed.some((p) =>
      p === "/" ? loc.pathname === "/" : loc.pathname.startsWith(p),
    );
    if (!ok) return <Navigate to="/" />;
  }

  return (
    <TerritoireScopeProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </TerritoireScopeProvider>
  );
}
