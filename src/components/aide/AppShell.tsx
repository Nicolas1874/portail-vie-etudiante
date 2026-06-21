import { Link, useLocation, useNavigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/aide/auth";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/aide/GlobalSearch";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Shield,
  Building2,
  Map,
  FileSearch,
  BookOpen,
  Handshake,
  Package,
  Home,
  HandCoins,
  GraduationCap,
  MessageSquare,
  Mail,
  Search,
  Download,
  ChevronRight,
  type LucideIcon,
  Lightbulb,
  MailPlus,
  Laptop,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { fullName } from "@/lib/aide/labels";
import { RoleSwitchBanner } from "@/components/aide/RoleSwitchBanner";
import { useTerritoireScope } from "@/lib/aide/territoire-scope";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/aide/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/usagers", label: "Usagers", icon: Users },
  { to: "/rendez-vous", label: "Rendez-vous", icon: CalendarDays },
  { to: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { to: "/annuaire", label: "Annuaire partenaires", icon: BookOpen },
  { to: "/dons", label: "Stock de dons", icon: Package },
  { to: "/logement", label: "Logement", icon: Home },
  { to: "/presto", label: "PRESTO — prêts PC", icon: Laptop },
  { to: "/ateliers", label: "Ateliers", icon: GraduationCap },
  { to: "/messagerie", label: "Messagerie", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/demandes-evolution", label: "Demandes d'évolution", icon: Lightbulb },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/exports", label: "Exports & audit", icon: Download, adminOnly: true },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Shield, adminOnly: true },
  { to: "/admin/partenaires", label: "Partenaires", icon: Handshake, adminOnly: true },
  { to: "/admin/structures", label: "Structures", icon: Building2, adminOnly: true },
  { to: "/admin/territoires", label: "Territoires", icon: Map, adminOnly: true },
  { to: "/admin/logement-programmes", label: "Programmes logement", icon: Home, adminOnly: true },
  { to: "/admin/coups-pouce", label: "Dispositifs coups de pouce", icon: HandCoins, adminOnly: true },
  { to: "/admin/invitations-partenaires", label: "Invitations partenaires", icon: Mail, adminOnly: true },
  { to: "/admin/audit", label: "Journal RGPD", icon: FileSearch, adminOnly: true },
  { to: "/admin/rgpd", label: "RGPD & purge", icon: ShieldCheck, adminOnly: true },
  { to: "/admin/seuils", label: "Seuils d'alerte", icon: Bell, adminOnly: true },
  { to: "/admin/reorientation", label: "Réorientation", icon: MailPlus, adminOnly: true },
  { to: "/admin/demandes-evolution", label: "Demandes d'évolution", icon: Lightbulb, adminOnly: true },
];

const PARTENAIRE_NAV: NavItem[] = [
  { to: "/partenaire", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/partenaire/coups-pouce", label: "Coups de pouce", icon: HandCoins },
];

const SUPERVISEUR_NAV: NavItem[] = [
  { to: "/", label: "Statistiques", icon: LayoutDashboard },
  { to: "/exports", label: "Exports & audit", icon: Download },
];

const SCD_NAV: NavItem[] = [
  { to: "/presto", label: "Demandes PRESTO", icon: Laptop },
  { to: "/presto/parametres", label: "Paramètres SCD", icon: Settings },
];

const PRESCRIPTEUR_NAV: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/usagers", label: "Mes usagers orientés", icon: Users },
];

const AGENT_CP_NAV: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/usagers", label: "Usagers", icon: Users },
];

const AGENT_PRESTO_NAV: NavItem[] = [
  { to: "/presto", label: "Demandes PRESTO", icon: Laptop },
];

const AGENT_LOGEMENT_NAV: NavItem[] = [
  { to: "/logement", label: "Logement", icon: Home },
];

const BREADCRUMB_LABELS: Record<string, string> = {
  "": "Tableau de bord",
  usagers: "Usagers",
  "rendez-vous": "Rendez-vous",
  calendrier: "Calendrier",
  annuaire: "Annuaire",
  dons: "Stock de dons",
  logement: "Logement",
  presto: "PRESTO",
  ateliers: "Ateliers",
  messagerie: "Messagerie",
  notifications: "Notifications",
  parametres: "Paramètres",
  exports: "Exports",
  admin: "Administration",
  partenaire: "Partenaire",
  nouveau: "Nouvelle fiche",
};

export function AppShell({ children }: { children?: ReactNode }) {
  const { profile, isAdmin, roles, signOut } = useAuth();
  const isPartenaireOnly = roles.length > 0 && roles.every((r) => r === "partenaire");
  const isSuperviseurOnly = roles.length > 0 && roles.every((r) => r === "superviseur");
  const isScdOnly = roles.length > 0 && roles.every((r) => r === "scd_presto");
  const isPrescripteurOnly = roles.length > 0 && roles.every((r) => r === "prescripteur");
  const isCcasOnly = roles.length > 0 && roles.every((r) => r === "ccas");
  const isAgentOnly = roles.length > 0 && roles.every((r) => r === "agent");
  const affectation = (profile as any)?.affectation as "cp" | "presto" | "logement" | null | undefined;
  const navItems = isAdmin
    ? NAV
    : isScdOnly
      ? SCD_NAV
      : isCcasOnly
        ? AGENT_LOGEMENT_NAV
        : isPartenaireOnly
          ? PARTENAIRE_NAV
          : isSuperviseurOnly
            ? SUPERVISEUR_NAV
            : isPrescripteurOnly
              ? PRESCRIPTEUR_NAV
              : isAgentOnly
                ? (affectation === "presto" ? AGENT_PRESTO_NAV
                  : affectation === "logement" ? AGENT_LOGEMENT_NAV
                  : AGENT_CP_NAV)
                : NAV;
  const navigate = useNavigate();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [logementCount, setLogementCount] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchCounts = async () => {
      const [{ count: nCount }, { count: lCount }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("lue", false),
        supabase
          .from("logement_dossiers")
          .select("*", { count: "exact", head: true })
          .not("statut", "in", "(cloture,abandonne)"),
      ]);

      let msgs = 0;
      if (profile?.id) {
        const { data: parts } = await supabase
          .from("conversation_participants")
          .select("conversation_id, derniere_lecture")
          .eq("user_id", profile.id);
        for (const p of parts ?? []) {
          const cutoff = (p as any).derniere_lecture ?? "1970-01-01";
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", (p as any).conversation_id)
            .gt("created_at", cutoff)
            .neq("auteur_id", profile.id);
          msgs += count ?? 0;
        }
      }

      if (active) {
        setUnread(nCount ?? 0);
        setLogementCount(lCount ?? 0);
        setUnreadMsgs(msgs);
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [loc.pathname, profile?.id]);

  const isActive = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);

  useBrowserNotifications();

  // Breadcrumb dynamique depuis le path
  const crumbs = loc.pathname
    .split("/")
    .filter(Boolean)
    .map((seg, idx, arr) => {
      const path = "/" + arr.slice(0, idx + 1).join("/");
      const label = BREADCRUMB_LABELS[seg] ?? seg;
      return { path, label };
    });

  return (
    <div className="flex min-h-dvh bg-background" data-app-shell>
      <GlobalSearch />

      {/* Sidebar « papier kraft » */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border relative">
        {/* Mesh décoratif subtil en haut */}
        <div className="absolute inset-x-0 top-0 h-32 mesh-bg pointer-events-none opacity-60" />

        <div className="relative px-4 pt-5 pb-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-display font-bold text-sm shadow-[var(--shadow-sm)] group-hover:scale-105 transition-transform">
              GA
            </div>
            <div>
              <div className="font-display text-[15px] font-semibold leading-tight tracking-tight">
                Guichet de l'AIDE
              </div>
              <div className="text-[10.5px] text-sidebar-foreground/60 mt-0.5">
                Accompagnement social
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
            }
            className="mt-4 w-full flex items-center gap-2 rounded-lg border border-sidebar-border bg-card/60 hover:bg-card px-2.5 py-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all shadow-[var(--shadow-xs)]"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="kbd text-[10px] h-5">⌘K</kbd>
          </button>
        </div>

        <nav className="relative flex-1 px-2.5 py-2 space-y-px overflow-y-auto">
          {navItems.map((it) => {
            const Icon = it.icon;
            const active = isActive(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "relative flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors group",
                  active
                    ? "text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-sidebar-accent rounded-lg"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-2.5">
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                  {it.label}
                </span>
                <span className="relative">
                  {it.to === "/notifications" && unread > 0 && (
                    <span className="text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 tabular">
                      {unread}
                    </span>
                  )}
                  {it.to === "/messagerie" && unreadMsgs > 0 && (
                    <span className="text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 tabular">
                      {unreadMsgs}
                    </span>
                  )}
                  {it.to === "/logement" && logementCount > 0 && (
                    <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded-full px-1.5 py-0.5 tabular">
                      {logementCount}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="mt-5 mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/45">
                Administration
              </div>
              {ADMIN_NAV.map((it) => {
                const Icon = it.icon;
                const active = isActive(it.to);
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                    {it.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="relative border-t border-sidebar-border p-3 bg-sidebar/80 backdrop-blur">
          <div className="flex items-center gap-2.5 px-1.5 pb-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary">
              {(profile?.prenom?.[0] ?? "") + (profile?.nom?.[0] ?? "")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium truncate leading-tight">
                {fullName(profile)}
              </div>
              <div className="text-[10.5px] text-sidebar-foreground/55 truncate">
                {profile?.email}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 justify-start h-8 text-xs"
              onClick={() => navigate({ to: "/parametres" })}
            >
              <Settings className="h-3.5 w-3.5 mr-2" />
              Paramètres
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 h-8 w-8 p-0"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0" data-app-content>
        {/* Header desktop avec breadcrumb */}
        <header
          className="hidden md:flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6 py-2.5 sticky top-0 z-30"
          data-app-header
        >
          <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground min-w-0">
            <Link to="/" className="hover:text-foreground transition-colors shrink-0">
              <Home className="h-3.5 w-3.5" />
            </Link>
            {crumbs.map((c, i) => (
              <span key={c.path} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                {i === crumbs.length - 1 ? (
                  <span className="text-foreground font-medium truncate">{c.label}</span>
                ) : (
                  <Link
                    to={c.path as never}
                    className="hover:text-foreground transition-colors truncate"
                  >
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
              }
              className="hidden lg:flex items-center gap-2 rounded-full bg-muted/60 hover:bg-muted border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Rechercher</span>
              <kbd className="kbd h-4 text-[9.5px]">⌘K</kbd>
            </button>
          </div>
        </header>

        {/* Header mobile */}
        <header className="md:hidden gouv-band text-primary-foreground px-4 py-3 flex items-center justify-between">
          <div className="font-display font-semibold text-sm">Guichet de l'AIDE</div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-white/10"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <RoleSwitchBanner />
        <TerritoireScopeBar />
        <motion.main
          key={loc.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="flex-1 overflow-auto"
          data-app-main
        >
          {children ?? <Outlet />}
        </motion.main>

        <footer
          className="border-t border-border bg-card/40 px-6 py-2.5 text-[10.5px] text-muted-foreground flex items-center justify-between"
          data-app-footer
        >
          <span>© Guichet de l'AIDE — Données protégées (RGPD)</span>
          <span className="hidden sm:inline">Connecté : {profile?.email ?? "—"}</span>
        </footer>
      </div>
    </div>
  );
}

function TerritoireScopeBar() {
  const { canSwitch, selected, setSelected, territoires } = useTerritoireScope();
  if (!canSwitch || territoires.length === 0) return null;
  return (
    <div className="border-b border-border bg-accent/30 px-4 md:px-6 py-2 flex items-center gap-2 text-xs">
      <MapPin className="h-3.5 w-3.5 text-primary" />
      <span className="text-muted-foreground">Périmètre&nbsp;:</span>
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-7 w-auto min-w-[180px] text-xs bg-background/60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les territoires</SelectItem>
          {territoires.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected !== "all" && (
        <span className="text-muted-foreground/80 hidden md:inline">
          · listes filtrées sur ce territoire
        </span>
      )}
    </div>
  );
}
