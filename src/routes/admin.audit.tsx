import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { listAuditLogs, exportAuditLogsCsv, checkSuperAdmin } from "@/lib/audit.functions";
import { PortalHeader } from "@/components/PortalHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Download, ScrollText, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
});

interface AuditLog {
  id: string;
  actor_email: string | null;
  action: string;
  target_email: string | null;
  target_type: string | null;
  application: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  "login.success": "Connexion réussie",
  "login.failed": "Connexion échouée",
  "login.password_invalid": "Mot de passe invalide",
  "login.mfa_challenge_sent": "Code 2FA envoyé",
  "login.mfa_verified": "2FA validée",
  "login.mfa_failed": "Code 2FA invalide",
  "logout": "Déconnexion",
  "password_reset.requested": "Reset MDP demandé",
  "invitation.created": "Invitation créée",
  "invitation.revoked": "Invitation supprimée",
  "role.granted": "Rôle attribué",
  "role.revoked": "Rôle retiré",
  "profile.updated": "Profil modifié",
  "admin.page_viewed": "Page admin consultée",
};

function AuditPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(listAuditLogs);
  const exportFn = useServerFn(exportAuditLogsCsv);
  const checkFn = useServerFn(checkSuperAdmin);

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterApp, setFilterApp] = useState<string>("all");
  const [filterEmail, setFilterEmail] = useState("");
  const [sinceDays, setSinceDays] = useState(30);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    checkFn({ data: undefined })
      .then((res) => {
        setAuthorized(res.isSuperAdmin);
        if (!res.isSuperAdmin) navigate({ to: "/" });
      })
      .catch(() => navigate({ to: "/" }));
  }, [user, loading, navigate, checkFn]);

  const load = async () => {
    setLoadingLogs(true);
    try {
      const res = await listFn({
        data: {
          limit: 200,
          action: filterAction !== "all" ? filterAction : undefined,
          application: filterApp !== "all" ? (filterApp as "AIDE" | "HANDICAP" | "CVEC") : undefined,
          actorEmail: filterEmail.trim() || undefined,
          sinceDays,
        },
      });
      setLogs(res.logs as AuditLog[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (authorized) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  const handleExport = async () => {
    try {
      const res = await exportFn({ data: { sinceDays: 90 } });
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${res.count} entrées exportées`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export impossible");
    }
  };

  if (loading || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Vérification des droits…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour au portail
        </Link>

        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary p-2 text-primary-foreground">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Journal d'audit</h1>
              <p className="text-sm text-muted-foreground">
                Traçabilité de toutes les actions sensibles (conforme RGPD / DSI)
              </p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Exporter CSV (90 j)
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Filtres</CardTitle>
            <CardDescription>Affiner la recherche dans les logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="space-y-1.5">
                <Label>Action</Label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Application</Label>
                <Select value={filterApp} onValueChange={setFilterApp}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="AIDE">AIDE</SelectItem>
                    <SelectItem value="HANDICAP">HANDICAP</SelectItem>
                    <SelectItem value="CVEC">CVEC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Email auteur</Label>
                <Input value={filterEmail} onChange={(e) => setFilterEmail(e.target.value)} placeholder="recherche…" />
              </div>
              <div className="space-y-1.5">
                <Label>Période</Label>
                <Select value={String(sinceDays)} onValueChange={(v) => setSinceDays(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">24 heures</SelectItem>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                    <SelectItem value="365">1 an</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={load} disabled={loadingLogs}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingLogs ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {logs.length} évènement(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun évènement pour ces filtres.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Auteur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-xs">{l.actor_email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ACTION_LABELS[l.action] ?? l.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{l.application ?? "—"}</TableCell>
                        <TableCell className="text-xs">{l.target_email ?? l.target_id ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{l.ip_address ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
