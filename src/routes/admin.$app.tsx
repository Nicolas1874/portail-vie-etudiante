import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth, type AppName, type AppRole } from "@/lib/auth-context";
import { APPS } from "@/lib/apps-config";
import {
  listAppMembership,
  createInvitation,
  revokeInvitation,
  removeUserRole,
} from "@/lib/admin.functions";
import { PortalHeader } from "@/components/PortalHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Mail, Shield } from "lucide-react";

const VALID_APPS: AppName[] = ["AIDE", "HANDICAP", "CVEC"];

export const Route = createFileRoute("/admin/$app")({
  component: AdminApp,
});

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string | null;
  full_name: string | null;
}

function AdminApp() {
  const { app } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading, isAppAdmin } = useAuth();
  const appKey = app as AppName;
  const validApp = VALID_APPS.includes(appKey);
  const cfg = validApp ? APPS[appKey] : null;

  const listMembershipFn = useServerFn(listAppMembership);
  const createInvitationFn = useServerFn(createInvitation);
  const revokeInvitationFn = useServerFn(revokeInvitation);
  const removeUserRoleFn = useServerFn(removeUserRole);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("partenaire");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!validApp || !isAppAdmin(appKey)) navigate({ to: "/" });
    }
  }, [user, loading, validApp, appKey, isAppAdmin, navigate]);

  const load = useCallback(async () => {
    if (!validApp) return;
    try {
      const res = await listMembershipFn({ data: { application: appKey } });
      setInvitations(res.invitations as Invitation[]);
      setMembers(res.members);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement.";
      toast.error(msg);
    }
  }, [validApp, appKey, listMembershipFn]);

  useEffect(() => {
    if (user && validApp && isAppAdmin(appKey)) load();
  }, [user, validApp, appKey, isAppAdmin, load]);

  if (loading || !user || !cfg) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createInvitationFn({
        data: { application: appKey, email: email.trim().toLowerCase(), role },
      });
      toast.success("Invitation créée", {
        description: `${email} aura accès à ${cfg.name} dès son inscription.`,
      });
      setEmail("");
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Création impossible.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await revokeInvitationFn({ data: { invitationId: id } });
      toast.success("Invitation supprimée");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const removeRole = async (id: string) => {
    try {
      await removeUserRoleFn({ data: { roleId: id } });
      toast.success("Accès retiré");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour au portail
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-md p-2 text-white" style={{ backgroundColor: cfg.accent }}>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Administration · {cfg.name}</h1>
            <p className="text-sm text-muted-foreground">Gestion des accès et invitations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" /> Inviter un utilisateur
              </CardTitle>
              <CardDescription>L'accès sera attribué à la création du compte.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invemail">Email</Label>
                  <Input id="invemail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rôle</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="partenaire">Partenaire</SelectItem>
                      <SelectItem value="direction">Direction (multi-SI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Création…" : "Créer l'invitation"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Invitations en attente</CardTitle>
              <CardDescription>{invitations.filter((i) => i.status === "pending").length} en attente</CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune invitation.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.email}</TableCell>
                        <TableCell><Badge variant="outline">{inv.role}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "pending" ? "secondary" : "default"}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => revoke(inv.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilisateurs avec accès</CardTitle>
            <CardDescription>{members.length} utilisateur(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun utilisateur n'a accès à cette application.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.email ?? "—"}</TableCell>
                      <TableCell>{m.full_name ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeRole(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
