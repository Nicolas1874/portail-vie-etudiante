import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/aide-supabase/client";
import { Users, CalendarDays, FileText, GraduationCap } from "lucide-react";
import { fullName } from "@/lib/aide/labels";

interface UsagerRow {
  id: string;
  nom: string;
  prenom: string;
  ville: string | null;
  numero_etudiant: string | null;
}
interface RdvRow {
  id: string;
  objet: string;
  date_debut: string;
  usager_id: string;
}
interface DemandeRow {
  id: string;
  titre: string;
  usager_id: string;
}
interface AtelierRow {
  id: string;
  titre: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [usagers, setUsagers] = useState<UsagerRow[]>([]);
  const [rdvs, setRdvs] = useState<RdvRow[]>([]);
  const [demandes, setDemandes] = useState<DemandeRow[]>([]);
  const [ateliers, setAteliers] = useState<AtelierRow[]>([]);
  const navigate = useNavigate();

  // Raccourci global Cmd/Ctrl + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const search = useCallback(async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setUsagers([]);
      setRdvs([]);
      setDemandes([]);
      setAteliers([]);
      return;
    }
    const like = `%${term}%`;
    const [u, d, a] = await Promise.all([
      supabase
        .from("usagers")
        .select("id, nom, prenom, ville, numero_etudiant")
        .eq("archive", false)
        .or(
          `nom.ilike.${like},prenom.ilike.${like},ville.ilike.${like},numero_etudiant.ilike.${like}`,
        )
        .limit(8),
      supabase
        .from("demandes")
        .select("id, titre, usager_id")
        .ilike("titre", like)
        .limit(5),
      supabase
        .from("ateliers")
        .select("id, titre")
        .ilike("titre", like)
        .limit(5),
    ]);
    setUsagers((u.data as UsagerRow[]) ?? []);
    setDemandes((d.data as DemandeRow[]) ?? []);
    setAteliers((a.data as AtelierRow[]) ?? []);

    // RDV : recherche par objet ou par nom usager
    const { data: rdvData } = await supabase
      .from("rendez_vous")
      .select("id, objet, date_debut, usager_id")
      .ilike("objet", like)
      .order("date_debut", { ascending: false })
      .limit(5);
    setRdvs((rdvData as RdvRow[]) ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 200);
    return () => clearTimeout(t);
  }, [q, search]);

  const go = (path: string, params?: Record<string, string>) => {
    setOpen(false);
    setQ("");
    navigate({ to: path as never, params: params as never });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Rechercher un usager, un RDV, une demande, un atelier…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>
          {q.length < 2
            ? "Tapez au moins 2 caractères…"
            : "Aucun résultat."}
        </CommandEmpty>

        {usagers.length > 0 && (
          <CommandGroup heading="Usagers">
            {usagers.map((u) => (
              <CommandItem
                key={u.id}
                value={`usager-${u.id}-${u.nom}-${u.prenom}`}
                onSelect={() => go("/usagers/$id", { id: u.id })}
              >
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{fullName(u)}</span>
                <span className="text-xs text-muted-foreground">
                  {u.numero_etudiant || u.ville || ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {rdvs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Rendez-vous">
              {rdvs.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`rdv-${r.id}-${r.objet}`}
                  onSelect={() => go("/rendez-vous")}
                >
                  <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1">{r.objet}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.date_debut).toLocaleDateString("fr-FR")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {demandes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Demandes">
              {demandes.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`demande-${d.id}-${d.titre}`}
                  onSelect={() => go("/usagers/$id", { id: d.usager_id })}
                >
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1 truncate">{d.titre}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {ateliers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Ateliers">
              {ateliers.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`atelier-${a.id}-${a.titre}`}
                  onSelect={() => go("/ateliers")}
                >
                  <GraduationCap className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1 truncate">{a.titre}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
