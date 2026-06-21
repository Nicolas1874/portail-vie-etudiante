/**
 * « Liste de courses » — demandes que l'usager a faites mais qu'on n'a
 * pas pu satisfaire (ex. on n'avait pas de brosse à dents en stock).
 *
 * Mode mixte : libellé libre + rattachement optionnel à un article du
 * catalogue Dons (pour consolidation et future alerte stock).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ShoppingBasket, Check, X, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/labels";

type DNS = {
  id: string;
  libelle: string;
  quantite: number;
  article_id: string | null;
  statut: "en_attente" | "satisfait" | "abandonne";
  note: string | null;
  created_at: string;
  date_satisfaction: string | null;
};

type Article = { id: string; nom: string; unite: string };

export function DemandesNonSatisfaitesSection({
  usagerId,
  structureId,
  territoireId,
}: {
  usagerId: string;
  structureId: string | null;
  territoireId: string | null;
}) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<DNS[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [openNew, setOpenNew] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("demandes_non_satisfaites")
      .select("*")
      .eq("usager_id", usagerId)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as DNS[]);
  };

  useEffect(() => {
    load();
    void supabase
      .from("dons_articles")
      .select("id, nom, unite")
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => setArticles((data ?? []) as Article[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usagerId]);

  const setStatut = async (
    id: string,
    statut: "en_attente" | "satisfait" | "abandonne",
  ) => {
    const { error } = await supabase
      .from("demandes_non_satisfaites")
      .update({
        statut,
        date_satisfaction: statut === "satisfait" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Statut mis à jour");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette demande ?")) return;
    const { error } = await supabase
      .from("demandes_non_satisfaites")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShoppingBasket className="h-4 w-4" />
          Demandes non satisfaites
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpenNew(true)}
          disabled={!structureId}
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          Aucune demande en attente. Quand un usager demande quelque chose qu'on
          n'a pas, ajoutez-le ici pour le retrouver dans la liste de courses.
        </Card>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2">Demande</th>
                <th className="text-right px-4 py-2">Quantité</th>
                <th className="text-left px-4 py-2">Statut</th>
                <th className="text-left px-4 py-2">Demandé le</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.libelle}</div>
                    {r.note && (
                      <div className="text-xs text-muted-foreground">{r.note}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">{r.quantite}</td>
                  <td className="px-4 py-2">
                    {r.statut === "en_attente" && (
                      <Badge variant="outline">En attente</Badge>
                    )}
                    {r.statut === "satisfait" && (
                      <Badge className="bg-success/10 text-success border-success/30 border">
                        Satisfait
                      </Badge>
                    )}
                    {r.statut === "abandonne" && (
                      <Badge variant="outline" className="opacity-60">
                        Abandonné
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-4 py-2 text-right space-x-1">
                    {r.statut === "en_attente" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatut(r.id, "satisfait")}
                          title="Marquer satisfait"
                        >
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatut(r.id, "abandonne")}
                          title="Abandonner"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(r.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <NewDNSDialog
        open={openNew}
        onOpenChange={setOpenNew}
        articles={articles}
        onCreate={async (payload) => {
          if (!structureId) return;
          const { error } = await supabase
            .from("demandes_non_satisfaites")
            .insert({
              usager_id: usagerId,
              structure_id: structureId,
              territoire_id: territoireId,
              cree_par: profile?.id,
              libelle: payload.libelle,
              quantite: payload.quantite,
              article_id: payload.article_id,
              note: payload.note,
            });
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("Demande enregistrée");
          setOpenNew(false);
          load();
        }}
      />
    </div>
  );
}

function NewDNSDialog({
  open,
  onOpenChange,
  articles,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  articles: Article[];
  onCreate: (p: {
    libelle: string;
    quantite: number;
    article_id: string | null;
    note: string | null;
  }) => Promise<void>;
}) {
  const [libelle, setLibelle] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [articleId, setArticleId] = useState<string>("none");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLibelle("");
      setQuantite(1);
      setArticleId("none");
      setNote("");
    }
  }, [open]);

  const onPickArticle = (id: string) => {
    setArticleId(id);
    if (id !== "none") {
      const a = articles.find((x) => x.id === id);
      if (a && !libelle.trim()) setLibelle(a.nom);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une demande non satisfaite</DialogTitle>
          <DialogDescription>
            Notez ce que l'usager a demandé et qu'on n'a pas pu fournir.
            Ça apparaîtra dans la liste de courses de la structure.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Article du catalogue (optionnel)</Label>
            <Select value={articleId} onValueChange={onPickArticle}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Aucun (texte libre) —</SelectItem>
                {articles.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dns-lib">Libellé *</Label>
            <Input
              id="dns-lib"
              className="mt-1.5"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex. brosse à dents, sac de couchage…"
            />
          </div>
          <div>
            <Label htmlFor="dns-qte">Quantité</Label>
            <Input
              id="dns-qte"
              type="number"
              min={1}
              className="mt-1.5 w-24"
              value={quantite}
              onChange={(e) => setQuantite(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div>
            <Label htmlFor="dns-note">Note (optionnel)</Label>
            <Textarea
              id="dns-note"
              className="mt-1.5"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Précisions, contexte…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={saving || !libelle.trim()}
            onClick={async () => {
              setSaving(true);
              await onCreate({
                libelle: libelle.trim(),
                quantite,
                article_id: articleId === "none" ? null : articleId,
                note: note.trim() || null,
              });
              setSaving(false);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
