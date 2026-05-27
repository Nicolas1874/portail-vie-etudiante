import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { APPS, APP_LIST } from "@/lib/apps-config";
import { PortalHeader } from "@/components/PortalHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Settings, Lock, Loader2 } from "lucide-react";
import { issueAideSsoToken } from "@/lib/sso.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Portal,
});

function Portal() {
  const { user, loading, accessibleApps, roles, isAppAdmin } = useAuth();
  const navigate = useNavigate();
  const issueSso = useServerFn(issueAideSsoToken);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);

  const openApp = async (appKey: string, url: string) => {
    if (!url || url === "#") return;
    if (appKey !== "AIDE") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setSsoLoading(appKey);
    try {
      const { token } = await issueSso();
      const sep = url.includes("?") ? "&" : "?";
      window.open(`${url}/sso${sep}token=${encodeURIComponent(token)}`, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("[sso] échec génération token", e);
      toast.error("Connexion automatique impossible, ouverture en mode standard.");
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setSsoLoading(null);
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Plus d'auto-redirect : l'utilisateur choisit explicitement le SI à ouvrir
  // (clic sur "Ouvrir" → nouvel onglet).


  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Vos applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sélectionnez une application pour y accéder. Vos droits sont gérés par les administrateurs de chaque SI.
          </p>
        </div>

        {accessibleApps.length === 0 ? (
          <Card className="p-8 text-center">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-medium">Aucun accès attribué</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Votre compte est créé mais aucun droit ne vous a été attribué.
              Contactez l'administrateur de l'application concernée pour obtenir une invitation.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {APP_LIST.map((app) => {
              const accessible = accessibleApps.includes(app.key);
              const appRoles = roles.filter((r) => r.application === app.key);
              return (
                <Card
                  key={app.key}
                  className={`relative overflow-hidden p-6 transition-all ${
                    accessible ? "hover:shadow-md cursor-pointer" : "opacity-50"
                  }`}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: app.accent }}
                  />
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="rounded-md p-2 text-white"
                      style={{ backgroundColor: app.accent }}
                    >
                      <Building2Icon />
                    </div>
                    {accessible ? (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold">{app.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">{app.description}</p>

                  {accessible && (
                    <>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {appRoles.map((r) => (
                          <Badge key={r.role} variant="secondary" className="text-[10px] uppercase tracking-wide">
                            {r.role}
                          </Badge>
                        ))}
                        {appRoles.length === 0 && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            Direction
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 text-center text-xs font-medium rounded-md border px-3 py-1.5 transition ${
                            app.url && app.url !== "#"
                              ? "hover:bg-accent"
                              : "opacity-50 pointer-events-none"
                          }`}
                          aria-disabled={!app.url || app.url === "#"}
                        >
                          Ouvrir
                        </a>
                        {isAppAdmin(app.key) && (
                          <Link
                            to="/admin/$app"
                            params={{ app: app.key }}
                            className="inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 hover:bg-accent transition"
                            title="Administration"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Building2Icon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
      <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
