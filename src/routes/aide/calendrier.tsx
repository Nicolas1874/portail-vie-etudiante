import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useTerritoireScope } from "@/lib/aide/territoire-scope";
import { PageHeader } from "@/components/aide/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Users } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addDays, format, isSameMonth, isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/aide/calendrier")({
  component: CalendrierPage,
});

type Evt = {
  id: string;
  type: "rdv" | "atelier";
  date: Date;
  titre: string;
  sous_titre?: string | null;
  lien?: string;
};

function CalendrierPage() {
  const { selected } = useTerritoireScope();
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<Evt[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  useEffect(() => {
    const load = async () => {
      const from = gridStart.toISOString();
      const to = gridEnd.toISOString();
      const rdvQuery = supabase
        .from("rendez_vous")
        .select("id,date_debut,objet,statut,modalite,lieu,usager:usagers(id,nom,prenom,territoire_id)")
        .gte("date_debut", from).lte("date_debut", to);
      const atelierQuery = supabase
        .from("ateliers_sessions")
        .select("id,date_debut,lieu,atelier:ateliers(id,titre,territoire_id)")
        .gte("date_debut", from).lte("date_debut", to);
      const [{ data: rdvs }, { data: sessions }] = await Promise.all([rdvQuery, atelierQuery]);

      const collected: Evt[] = [];
      (rdvs ?? []).forEach((r: any) => {
        if (selected !== "all" && r.usager?.territoire_id && r.usager.territoire_id !== selected) return;
        collected.push({
          id: `rdv-${r.id}`,
          type: "rdv",
          date: new Date(r.date_debut),
          titre: r.objet,
          sous_titre: r.usager ? `${r.usager.prenom} ${r.usager.nom}` : null,
          lien: "/rendez-vous",
        });
      });
      (sessions ?? []).forEach((s: any) => {
        if (selected !== "all" && s.atelier?.territoire_id && s.atelier.territoire_id !== selected) return;
        collected.push({
          id: `at-${s.id}`,
          type: "atelier",
          date: new Date(s.date_debut),
          titre: s.atelier?.titre ?? "Atelier",
          sous_titre: s.lieu,
          lien: "/ateliers",
        });
      });
      collected.sort((a, b) => a.date.getTime() - b.date.getTime());
      setEvents(collected);
    };
    void load();
  }, [cursor, selected]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) { arr.push(d); d = addDays(d, 1); }
    return arr;
  }, [gridStart.toISOString(), gridEnd.toISOString()]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, Evt[]>();
    events.forEach(e => {
      const k = format(e.date, "yyyy-MM-dd");
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    });
    return m;
  }, [events]);

  const dayEvents = selectedDay
    ? (eventsByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [])
    : [];

  return (
    <div>
      <PageHeader
        title="Calendrier"
        description="Vue unifiée des rendez-vous et ateliers"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="font-semibold min-w-[140px] text-center">
              {format(cursor, "LLLL yyyy", { locale: fr })}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { setCursor(new Date()); setSelectedDay(new Date()); }}>Aujourd'hui</Button>
          </div>
        }
      />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-px text-xs font-semibold text-muted-foreground mb-1">
              {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => (
                <div key={d} className="p-2 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border">
              {days.map(d => {
                const k = format(d, "yyyy-MM-dd");
                const evs = eventsByDay.get(k) ?? [];
                const isCurMonth = isSameMonth(d, cursor);
                const isToday = isSameDay(d, new Date());
                const isSel = selectedDay && isSameDay(d, selectedDay);
                return (
                  <button
                    key={k}
                    onClick={() => setSelectedDay(d)}
                    className={`bg-background min-h-[90px] p-1.5 text-left transition-colors hover:bg-accent ${
                      isSel ? "ring-2 ring-primary z-10" : ""
                    } ${!isCurMonth ? "opacity-40" : ""}`}
                  >
                    <div className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                      {format(d, "d")}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {evs.slice(0, 3).map(e => (
                        <div key={e.id} className={`text-[10px] truncate rounded px-1 py-0.5 ${
                          e.type === "rdv" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                        }`}>
                          {format(e.date, "HH:mm")} {e.titre}
                        </div>
                      ))}
                      {evs.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{evs.length - 3}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">
              {selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr }) : "Sélectionner un jour"}
            </h3>
            {dayEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun événement ce jour.</p>
            )}
            {dayEvents.map(e => (
              <Link key={e.id} to={e.lien ?? "/"} className="block">
                <div className="border rounded p-3 hover:bg-accent transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={e.type === "rdv" ? "default" : "secondary"} className="text-[10px]">
                          {e.type === "rdv" ? <CalendarDays className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                          {e.type === "rdv" ? "RDV" : "Atelier"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{format(e.date, "HH:mm")}</span>
                      </div>
                      <div className="font-medium text-sm truncate">{e.titre}</div>
                      {e.sous_titre && <div className="text-xs text-muted-foreground truncate">{e.sous_titre}</div>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
