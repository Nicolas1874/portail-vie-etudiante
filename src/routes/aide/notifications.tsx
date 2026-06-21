import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/labels";
import { Bell, Check, ChevronDown, ChevronRight, Calendar, Package, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_app/notifications")({
  component: NotifPage,
});

type Notif = {
  id: string;
  titre: string;
  message: string;
  lien: string | null;
  lue: boolean;
  created_at: string;
};

type Cat = "rdv" | "stocks" | "autre";

function categorize(n: Notif): Cat {
  const t = n.titre.toLowerCase();
  if (t.startsWith("rdv") || t.includes("rendez-vous")) return "rdv";
  if (t.includes("stock") || t.includes("péremption") || t.includes("perimé") || t.includes("périmé"))
    return "stocks";
  return "autre";
}

const CAT_META: Record<Cat, { label: string; icon: typeof Bell }> = {
  rdv: { label: "Rendez-vous", icon: Calendar },
  stocks: { label: "Stocks & péremption", icon: Package },
  autre: { label: "Autres", icon: Megaphone },
};

function NotifPage() {
  const [rows, setRows] = useState<Notif[]>([]);
  const [open, setOpen] = useState<Record<Cat, boolean>>({ rdv: true, stocks: true, autre: true });

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as Notif[]);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ lue: true }).eq("id", id);
    load();
  };

  const markAllReadInCat = async (cat: Cat) => {
    const ids = rows.filter((n) => !n.lue && categorize(n) === cat).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ lue: true }).in("id", ids);
    load();
  };

  const grouped = useMemo(() => {
    const acc: Record<Cat, Notif[]> = { rdv: [], stocks: [], autre: [] };
    rows.forEach((n) => acc[categorize(n)].push(n));
    return acc;
  }, [rows]);

  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="p-6 space-y-3 max-w-3xl">
        {rows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune notification.</p>
            </CardContent>
          </Card>
        )}

        {(Object.keys(grouped) as Cat[]).map((cat) => {
          const list = grouped[cat];
          if (list.length === 0) return null;
          const unread = list.filter((n) => !n.lue).length;
          const Icon = CAT_META[cat].icon;
          const isOpen = open[cat];
          return (
            <Card key={cat}>
              <button
                type="button"
                onClick={() => setOpen({ ...open, [cat]: !isOpen })}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm flex-1">{CAT_META[cat].label}</span>
                {unread > 0 && (
                  <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">
                    {unread} nouveau{unread > 1 ? "x" : ""}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{list.length}</span>
                {unread > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllReadInCat(cat);
                    }}
                  >
                    Tout lire
                  </Button>
                )}
              </button>
              {isOpen && (
                <CardContent className="pt-0 pb-2 space-y-1">
                  {list.map((n) => {
                    const inner = (
                      <div className="flex-1">
                        <div className={`text-sm ${n.lue ? "" : "font-medium"}`}>{n.titre}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">{n.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(n.created_at)}
                        </div>
                      </div>
                    );
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 p-3 rounded-md border ${n.lue ? "opacity-60" : "bg-muted/30"}`}
                      >
                        {n.lien ? (
                          <Link to={n.lien} className="flex-1">
                            {inner}
                          </Link>
                        ) : (
                          inner
                        )}
                        {!n.lue && (
                          <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} title="Marquer comme lu">
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
