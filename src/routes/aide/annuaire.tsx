import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Phone, Mail, Globe, Building2, Briefcase } from "lucide-react";
import { useTerritoireScope } from "@/lib/aide/territoire-scope";

export const Route = createFileRoute("/aide/annuaire")({
  component: Annuaire,
});

function Annuaire() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [liens, setLiens] = useState<{ partenaire_id: string; theme_id: string }[]>([]);
  const [territoires, setTerritoires] = useState<any[]>([]);
  const { selected: globalTerritoire, setSelected: setGlobalTerritoire } = useTerritoireScope();
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState<string>("all");
  const territoire = globalTerritoire;
  const setTerritoire = setGlobalTerritoire;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, s, t, l, ter] = await Promise.all([
        supabase.from("partenaires").select("*").eq("actif", true).order("nom"),
        supabase.from("partenaire_structures").select("*"),
        supabase.from("themes_besoins").select("id, libelle, code").order("ordre"),
        supabase.from("partenaires_themes").select("partenaire_id, theme_id"),
        supabase.from("territoires").select("id, nom").order("nom"),
      ]);
      setContacts(p.data ?? []);
      setStructures(s.data ?? []);
      setThemes(t.data ?? []);
      setLiens(l.data ?? []);
      setTerritoires(ter.data ?? []);
      setLoading(false);
    })();
  }, []);

  const structById = useMemo(() => {
    const m = new Map<string, any>();
    structures.forEach((s) => m.set(s.id, s));
    return m;
  }, [structures]);

  const themesByPart = useMemo(() => {
    const m = new Map<string, string[]>();
    liens.forEach((l) => {
      const cur = m.get(l.partenaire_id) ?? [];
      cur.push(l.theme_id);
      m.set(l.partenaire_id, cur);
    });
    return m;
  }, [liens]);

  const themeMap = useMemo(() => {
    const m = new Map<string, any>();
    themes.forEach((t) => m.set(t.id, t));
    return m;
  }, [themes]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return contacts.filter((p) => {
      const struct = p.structure_partenaire_id ? structById.get(p.structure_partenaire_id) : null;
      if (territoire !== "all" && struct?.territoire_id !== territoire) return false;
      if (theme !== "all") {
        const ts = themesByPart.get(p.id) ?? [];
        if (!ts.includes(theme)) return false;
      }
      if (t) {
        const hay = `${p.prenom ?? ""} ${p.nom} ${p.fonction ?? ""} ${struct?.nom ?? ""} ${struct?.ville ?? ""}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [contacts, structById, q, theme, territoire, themesByPart]);

  return (
    <div>
      <PageHeader
        title="Annuaire des partenaires"
        description="Contacts vers lesquels orienter les usagers."
      />
      <div className="p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un contact ou structure…"
              className="pl-9"
            />
          </div>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les thématiques" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les thématiques</SelectItem>
              {themes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={territoire} onValueChange={setTerritoire}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les territoires" />
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
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              Aucun contact ne correspond aux filtres.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((p) => {
              const struct = p.structure_partenaire_id ? structById.get(p.structure_partenaire_id) : null;
              const ts = (themesByPart.get(p.id) ?? [])
                .map((id) => themeMap.get(id))
                .filter(Boolean);
              return (
                <Card key={p.id}>
                  <CardContent className="pt-5 space-y-3">
                    <div>
                      <div className="font-semibold">
                        {[p.prenom, p.nom].filter(Boolean).join(" ")}
                      </div>
                      {p.fonction && (
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {p.fonction}
                        </div>
                      )}
                      {struct && (
                        <div className="text-sm mt-1 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{struct.nom}</span>
                          {struct.type && (
                            <span className="text-xs text-muted-foreground">· {struct.type}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {ts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {ts.map((t: any) => (
                          <Badge key={t.id} variant="secondary" className="text-xs">
                            {t.libelle}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1 text-sm">
                      {p.telephone && (
                        <a
                          href={`tel:${p.telephone}`}
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {p.telephone}
                        </a>
                      )}
                      {p.email && (
                        <a
                          href={`mailto:${p.email}`}
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {p.email}
                        </a>
                      )}
                      {struct && (struct.adresse || struct.ville) && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>
                            {[struct.adresse, [struct.code_postal, struct.ville].filter(Boolean).join(" ")]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      {struct?.site_web && (
                        <a
                          href={struct.site_web}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {struct.site_web.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
