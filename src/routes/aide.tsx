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
  const { loading, profile, roles } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" />;

  // Superviseur "pur" : accès limité au tableau de bord, notifications et paramètres.
  const isSuperviseurOnly =
    roles.length > 0 && roles.every((r) => r === "superviseur");
  if (isSuperviseurOnly) {
    const allowed = ["/aide", "/aide/notifications", "/aide/parametres"];
    const ok = allowed.some((p) =>
      p === "/aide" ? loc.pathname === "/aide" || loc.pathname === "/aide/" : loc.pathname.startsWith(p),
    );
    if (!ok) return <Navigate to="/aide" />;
  }

  return (
    <TerritoireScopeProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </TerritoireScopeProvider>
  );
}

