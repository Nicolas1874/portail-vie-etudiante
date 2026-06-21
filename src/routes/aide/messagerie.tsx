import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Send, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDateTime, fullName } from "@/lib/labels";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/messagerie")({
  component: MessageriePage,
});

type ConvRow = {
  id: string;
  type: string;
  titre: string | null;
  updated_at: string;
  usager_id: string | null;
  usager?: { id: string; prenom: string; nom: string } | null;
  derniere_lecture: string | null;
  unread: number;
};

function MessageriePage() {
  const { profile } = useAuth();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    if (!profile?.id) return;
    const { data: parts } = await supabase
      .from("conversation_participants")
      .select(
        "conversation_id, derniere_lecture, conversations(id, type, titre, updated_at, usager_id, usagers:usager_id(id, prenom, nom))",
      )
      .eq("user_id", profile.id);

    const list = (parts ?? [])
      .map((p: any) => ({ ...p.conversations, derniere_lecture: p.derniere_lecture }))
      .filter(Boolean) as any[];

    // Compute unread per conv
    const enriched: ConvRow[] = await Promise.all(
      list.map(async (c: any) => {
        let unread = 0;
        const cutoff = c.derniere_lecture ?? "1970-01-01";
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .gt("created_at", cutoff)
          .neq("auteur_id", profile.id);
        unread = count ?? 0;
        return { ...c, usager: c.usagers ?? null, unread };
      }),
    );

    enriched.sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
    setConvs(enriched);
  };

  useEffect(() => {
    if (!profile?.id) return;
    loadConvs();
    supabase.from("profiles").select("id, prenom, nom, email").then(({ data }) => {
      setProfiles((data ?? []).filter((p: any) => p.id !== profile.id));
    });
  }, [profile?.id]);

  const markRead = async (convId: string) => {
    if (!profile?.id) return;
    await supabase
      .from("conversation_participants")
      .update({ derniere_lecture: new Date().toISOString() })
      .eq("conversation_id", convId)
      .eq("user_id", profile.id);
  };

  useEffect(() => {
    if (!active) return;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", active)
        .order("created_at");
      setMessages(data ?? []);
      setTimeout(
        () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
        100,
      );
      await markRead(active);
      loadConvs();
    };
    load();
    const ch = supabase
      .channel(`msgs-${active}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${active}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [active]);

  const send = async () => {
    if (!text.trim() || !active || !profile?.id) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: active,
      auteur_id: profile.id,
      contenu: text.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setText("");
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", active);
    }
  };

  const profilesById = useMemo(() => {
    const m = new Map<string, any>();
    profiles.forEach((p) => m.set(p.id, p));
    if (profile?.id) m.set(profile.id, profile);
    return m;
  }, [profiles, profile]);

  const activeConv = convs.find((c) => c.id === active);

  return (
    <div>
      <PageHeader
        title="Messagerie interne"
        description="Échangez avec les autres agents et partenaires."
        actions={
          <NewConvDialog
            currentUserId={profile?.id}
            profiles={profiles}
            onCreated={(id) => {
              loadConvs();
              setActive(id);
            }}
          />
        }
      />
      <div className="p-6 grid gap-4 md:grid-cols-[280px,1fr] h-[calc(100vh-180px)]">
        <Card className="overflow-y-auto">
          <CardContent className="pt-3 px-2 space-y-1">
            {convs.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">
                Aucune conversation.
              </p>
            ) : (
              convs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`w-full text-left p-2 rounded text-sm ${
                    active === c.id ? "bg-muted font-medium" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">
                      {c.titre ?? (c.usager ? `${c.usager.prenom} ${c.usager.nom}` : "Conversation interne")}
                    </span>
                    {c.unread > 0 && (
                      <span className="text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  {c.usager && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 ml-5 truncate">
                      Usager : {c.usager.prenom} {c.usager.nom}
                    </div>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {!active ? (
            <CardContent className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Sélectionnez une conversation.
            </CardContent>
          ) : (
            <>
              {activeConv && (
                <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">
                      {activeConv.titre ?? (activeConv.usager ? `${activeConv.usager.prenom} ${activeConv.usager.nom}` : "Conversation interne")}
                    </div>
                    {activeConv.usager ? (
                      <Link
                        to="/usagers/$id"
                        params={{ id: activeConv.usager.id }}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <User className="h-3 w-3" />
                        Fiche usager
                      </Link>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Sans usager rattaché</Badge>
                    )}
                  </div>
                </div>
              )}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => {
                  const me = m.auteur_id === profile?.id;
                  const author = profilesById.get(m.auteur_id);
                  return (
                    <div
                      key={m.id}
                      className={`flex ${me ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg p-2 px-3 text-sm ${
                          me ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {!me && (
                          <div className="text-[11px] font-semibold mb-0.5">
                            {fullName(author)}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{m.contenu}</p>
                        <div className="text-[10px] opacity-70 mt-1">
                          {formatDateTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Écrire un message…"
                />
                <Button onClick={send} disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function NewConvDialog({
  currentUserId,
  profiles,
  onCreated,
}: {
  currentUserId?: string;
  profiles: any[];
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [destinataireId, setDestinataireId] = useState("");
  const [usagerId, setUsagerId] = useState<string>("");
  const [usagerSearch, setUsagerSearch] = useState("");
  const [usagers, setUsagers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      let q = supabase.from("usagers").select("id, prenom, nom, email").limit(20);
      if (usagerSearch.trim()) {
        const s = `%${usagerSearch.trim()}%`;
        q = q.or(`prenom.ilike.${s},nom.ilike.${s},email.ilike.${s}`);
      }
      const { data } = await q.order("nom");
      setUsagers(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [open, usagerSearch]);

  const submit = async () => {
    if (!currentUserId || !destinataireId) {
      toast.error("Sélectionnez un destinataire");
      return;
    }
    setSaving(true);
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        type: "direct",
        titre: titre.trim() || null,
        cree_par: currentUserId,
        usager_id: usagerId || null,
      })
      .select()
      .single();
    if (error || !conv) {
      setSaving(false);
      toast.error(error?.message ?? "Erreur");
      return;
    }
    await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: currentUserId },
      { conversation_id: conv.id, user_id: destinataireId },
    ]);
    setSaving(false);
    setOpen(false);
    setTitre("");
    setDestinataireId("");
    setUsagerId("");
    setUsagerSearch("");
    toast.success("Conversation créée");
    onCreated(conv.id);
  };

  const selectedUsager = usagers.find((u) => u.id === usagerId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle conversation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Destinataire *</Label>
            <Select value={destinataireId} onValueChange={setDestinataireId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un agent" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {fullName(p)} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Usager concerné (optionnel)</Label>
            {selectedUsager ? (
              <div className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-sm">
                <span className="flex-1">
                  {selectedUsager.prenom} {selectedUsager.nom}
                  {selectedUsager.email ? ` — ${selectedUsager.email}` : ""}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setUsagerId("")}>
                  Retirer
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Rechercher un usager (nom, prénom, email)…"
                  value={usagerSearch}
                  onChange={(e) => setUsagerSearch(e.target.value)}
                />
                {usagers.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded border divide-y">
                    {usagers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUsagerId(u.id)}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        {u.prenom} {u.nom}
                        {u.email && (
                          <span className="text-xs text-muted-foreground"> · {u.email}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Laissez vide pour un échange interne entre professionnels.
            </p>
          </div>
          <div>
            <Label>Titre (optionnel)</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
