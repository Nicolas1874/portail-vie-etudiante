import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, fullName } from "@/lib/labels";
import { toast } from "sonner";
import {
  Package,
  Plus,
  PackagePlus,
  HandCoins,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { DonsListeDeCoursesTab } from "@/components/DonsListeDeCoursesTab";

export const Route = createFileRoute("/_app/dons")({
  component: DonsPage,
});

type Categorie = { id: string; libelle: string; code: string; ordre: number };
type Article = {
  id: string;
  structure_id: string;
  categorie_id: string;
  nom: string;
  unite: string;
  suivi_peremption: boolean;
  seuil_alerte: number;
  actif: boolean;
};
type StockRow = {
  article_id: string;
  structure_id: string;
  nom: string;
  unite: string;
  seuil_alerte: number;
  suivi_peremption: boolean;
  actif: boolean;
  categorie_id: string;
  categorie_libelle: string;
  categorie_code: string;
  stock_total: number;
  nb_lots_actifs: number;
  nb_lots_bientot_perimes: number;
  prochaine_peremption: string | null;
};
type Lot = {
  id: string;
  article_id: string;
  date_arrivage: string;
  date_peremption: string | null;
  quantite_initiale: number;
  quantite_restante: number;
  provenance: string | null;
  notes: string | null;
};
type Distribution = {
  id: string;
  date_distribution: string;
  quantite: number;
  article_id: string;
  usager_id: string;
  notes: string | null;
};

function DonsPage() {
  const { profile, isAdmin } = useAuth();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [usagersById, setUsagersById] = useState<Record<string, any>>({});

  const [openArticle, setOpenArticle] = useState<Article | null | undefined>(undefined);
  const [openLot, setOpenLot] = useState<{ article?: StockRow } | null>(null);
  const [openDistrib, setOpenDistrib] = useState<{ article?: StockRow } | null>(null);

  const structureId = profile?.structure_id ?? null;

  const load = async () => {
    const [{ data: cats }, { data: st }, { data: arts }, { data: lts }, { data: dists }] =
      await Promise.all([
        supabase.from("dons_categories").select("*").order("ordre"),
        supabase.from("vue_dons_stock").select("*").order("nom"),
        supabase.from("dons_articles").select("*").order("nom"),
        supabase.from("dons_lots").select("*").order("date_arrivage", { ascending: false }),
        supabase
          .from("dons_distributions")
          .select("*")
          .order("date_distribution", { ascending: false })
          .limit(200),
      ]);
    setCategories((cats ?? []) as Categorie[]);
    setStock((st ?? []) as StockRow[]);
    setArticles((arts ?? []) as Article[]);
    setLots((lts ?? []) as Lot[]);
    setDistributions((dists ?? []) as Distribution[]);

    const ids = Array.from(new Set((dists ?? []).map((d: any) => d.usager_id)));
    if (ids.length) {
      const { data: us } = await supabase
        .from("usagers")
        .select("id, prenom, nom")
        .in("id", ids);
      const map: Record<string, any> = {};
      (us ?? []).forEach((u: any) => (map[u.id] = u));
      setUsagersById(map);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categoriesById = useMemo(() => {
    const m: Record<string, Categorie> = {};
    categories.forEach((c) => (m[c.id] = c));
    return m;
  }, [categories]);

  const groupedStock = useMemo(() => {
    const groups: Record<string, StockRow[]> = {};
    stock.forEach((r) => {
      groups[r.categorie_libelle] = groups[r.categorie_libelle] || [];
      groups[r.categorie_libelle].push(r);
    });
    return groups;
  }, [stock]);

  const alerts = stock.filter(
    (s) =>
      s.actif &&
      (s.stock_total <= s.seuil_alerte || s.nb_lots_bientot_perimes > 0),
  );

  if (!structureId && !isAdmin) {
    return (
      <div>
        <PageHeader title="Stock de dons" />
        <div className="p-6">
          <Card className="p-6 text-sm text-muted-foreground">
            Votre profil n'est rattaché à aucune structure. Contactez un administrateur
            pour accéder au module dons.
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Stock de dons"
        description="Gestion des articles, arrivages et distributions de votre structure."
        actions={
          <Button onClick={() => setOpenArticle(null)}>
            <Plus className="h-4 w-4 mr-2" /> Nouvel article
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {alerts.length > 0 && (
          <Card className="p-4 border-destructive/40 bg-destructive/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-2">
              <AlertTriangle className="h-4 w-4" /> {alerts.length} alerte(s) sur le stock
            </div>
            <ul className="text-sm space-y-1">
              {alerts.map((a) => (
                <li key={a.article_id} className="flex flex-wrap gap-2">
                  <span className="font-medium">{a.nom}</span>
                  <span className="text-muted-foreground">
                    ({a.categorie_libelle})
                  </span>
                  {a.stock_total <= a.seuil_alerte && (
                    <Badge variant="destructive">
                      Stock bas : {a.stock_total} {a.unite} (seuil {a.seuil_alerte})
                    </Badge>
                  )}
                  {a.nb_lots_bientot_perimes > 0 && (
                    <Badge variant="outline" className="border-orange-500 text-orange-700">
                      <CalendarClock className="h-3 w-3 mr-1" />
                      {a.nb_lots_bientot_perimes} lot(s) à péremption proche
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="lots">Arrivages</TabsTrigger>
            <TabsTrigger value="distributions">Distributions</TabsTrigger>
            <TabsTrigger value="liste-courses">Liste de courses</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-4 space-y-6">
            {Object.keys(groupedStock).length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">
                Aucun article. Créez votre premier article pour commencer à suivre vos
                stocks.
              </Card>
            ) : (
              Object.entries(groupedStock).map(([cat, rows]) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" /> {cat}
                  </h3>
                  <Card className="p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2">Article</th>
                          <th className="text-right px-4 py-2">Stock</th>
                          <th className="text-right px-4 py-2">Seuil</th>
                          <th className="text-left px-4 py-2">Prochaine pérem.</th>
                          <th className="text-right px-4 py-2 w-1">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((r) => {
                          const stockBas = r.stock_total <= r.seuil_alerte;
                          return (
                            <tr key={r.article_id}>
                              <td className="px-4 py-2">
                                <div className="font-medium">{r.nom}</div>
                                <div className="text-xs text-muted-foreground">
                                  unité : {r.unite}
                                </div>
                              </td>
                              <td
                                className={`px-4 py-2 text-right font-semibold ${
                                  stockBas ? "text-destructive" : ""
                                }`}
                              >
                                {Number(r.stock_total)} {r.unite}
                                <div className="text-[11px] font-normal text-muted-foreground">
                                  {r.nb_lots_actifs} lot(s)
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {r.seuil_alerte}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {r.suivi_peremption
                                  ? formatDate(r.prochaine_peremption)
                                  : "—"}
                              </td>
                              <td className="px-4 py-2 text-right whitespace-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mr-1"
                                  onClick={() => setOpenLot({ article: r })}
                                >
                                  <PackagePlus className="h-3.5 w-3.5 mr-1" />
                                  Arrivage
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setOpenDistrib({ article: r })}
                                  disabled={r.stock_total <= 0}
                                >
                                  <HandCoins className="h-3.5 w-3.5 mr-1" />
                                  Distribuer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ml-1"
                                  onClick={() =>
                                    setOpenArticle(
                                      articles.find((a) => a.id === r.article_id) ?? null,
                                    )
                                  }
                                >
                                  Éditer
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="lots" className="mt-4">
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2">Article</th>
                    <th className="text-left px-4 py-2">Arrivage</th>
                    <th className="text-left px-4 py-2">Péremption</th>
                    <th className="text-right px-4 py-2">Restant / Initial</th>
                    <th className="text-left px-4 py-2">Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Aucun arrivage enregistré.
                      </td>
                    </tr>
                  ) : (
                    lots.map((l) => {
                      const art = articles.find((a) => a.id === l.article_id);
                      const perimee =
                        l.date_peremption && new Date(l.date_peremption) < new Date();
                      return (
                        <tr key={l.id}>
                          <td className="px-4 py-2 font-medium">{art?.nom ?? "—"}</td>
                          <td className="px-4 py-2">{formatDate(l.date_arrivage)}</td>
                          <td className="px-4 py-2">
                            {l.date_peremption ? (
                              <span className={perimee ? "text-destructive font-medium" : ""}>
                                {formatDate(l.date_peremption)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {Number(l.quantite_restante)} / {Number(l.quantite_initiale)}{" "}
                            {art?.unite ?? ""}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {l.provenance ?? "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="distributions" className="mt-4">
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">Usager</th>
                    <th className="text-left px-4 py-2">Article</th>
                    <th className="text-right px-4 py-2">Quantité</th>
                    <th className="text-left px-4 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {distributions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Aucune distribution enregistrée.
                      </td>
                    </tr>
                  ) : (
                    distributions.map((d) => {
                      const art = articles.find((a) => a.id === d.article_id);
                      const u = usagersById[d.usager_id];
                      return (
                        <tr key={d.id}>
                          <td className="px-4 py-2">{formatDate(d.date_distribution)}</td>
                          <td className="px-4 py-2 font-medium">{fullName(u)}</td>
                          <td className="px-4 py-2">{art?.nom ?? "—"}</td>
                          <td className="px-4 py-2 text-right">
                            {Number(d.quantite)} {art?.unite ?? ""}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {d.notes ?? "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="liste-courses" className="mt-4">
            <DonsListeDeCoursesTab />
          </TabsContent>
        </Tabs>
      </div>

      {openArticle !== undefined && (
        <ArticleDialog
          article={openArticle}
          categories={categories}
          structureId={structureId!}
          onClose={() => setOpenArticle(undefined)}
          onSaved={() => {
            setOpenArticle(undefined);
            load();
          }}
        />
      )}

      {openLot && (
        <LotDialog
          articles={articles}
          categoriesById={categoriesById}
          presetArticle={openLot.article}
          structureId={structureId!}
          onClose={() => setOpenLot(null)}
          onSaved={() => {
            setOpenLot(null);
            load();
          }}
        />
      )}

      {openDistrib && (
        <DistributionDialog
          articles={articles}
          presetArticle={openDistrib.article}
          lots={lots}
          structureId={structureId!}
          onClose={() => setOpenDistrib(null)}
          onSaved={() => {
            setOpenDistrib(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ---------- ARTICLE DIALOG ----------
type Ligne = { categorie_id: string; nom: string; unite: string; seuil_alerte: number };

function ArticleDialog({
  article,
  categories,
  structureId,
  onClose,
  onSaved,
}: {
  article: Article | null;
  categories: Categorie[];
  structureId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!article;
  const defaultCat = categories[0]?.id ?? "";

  // --- Mode édition (1 article) ---
  const [form, setForm] = useState({
    nom: article?.nom ?? "",
    categorie_id: article?.categorie_id ?? defaultCat,
    unite: article?.unite ?? "unité",
    seuil_alerte: article?.seuil_alerte ?? 0,
    actif: article?.actif ?? true,
  });

  // --- Mode création (plusieurs lignes, chacune avec sa catégorie) ---
  const [lignes, setLignes] = useState<Ligne[]>([
    { categorie_id: defaultCat, nom: "", unite: "unité", seuil_alerte: 0 },
  ]);
  const updateLigne = (i: number, patch: Partial<Ligne>) =>
    setLignes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addLigne = () =>
    setLignes((rows) => [
      ...rows,
      { categorie_id: defaultCat, nom: "", unite: "unité", seuil_alerte: 0 },
    ]);
  const removeLigne = (i: number) =>
    setLignes((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isEdit) {
      if (!form.nom || !form.categorie_id) {
        setLoading(false);
        return toast.error("Nom et catégorie requis");
      }
      const cat = categories.find((c) => c.id === form.categorie_id);
      const { error } = await supabase
        .from("dons_articles")
        .update({ ...form, suivi_peremption: cat?.code === "alimentaire" })
        .eq("id", article!.id);
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Article mis à jour");
      onSaved();
    } else {
      const valides = lignes.filter((l) => l.nom.trim() && l.categorie_id);
      if (valides.length === 0) {
        setLoading(false);
        return toast.error("Saisissez au moins un article (nom + catégorie)");
      }
      const payload = valides.map((l) => {
        const cat = categories.find((c) => c.id === l.categorie_id);
        return {
          nom: l.nom.trim(),
          unite: l.unite || "unité",
          seuil_alerte: l.seuil_alerte || 0,
          suivi_peremption: cat?.code === "alimentaire",
          categorie_id: l.categorie_id,
          structure_id: structureId,
          actif: true,
        };
      });
      const { error } = await supabase.from("dons_articles").insert(payload);
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success(`${valides.length} article(s) créé(s)`);
      onSaved();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'article" : "Nouveaux articles"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {isEdit ? (
            <>
              <div>
                <Label>Catégorie *</Label>
                <Select
                  value={form.categorie_id}
                  onValueChange={(v) => setForm({ ...form, categorie_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nom *</Label>
                <Input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unité</Label>
                  <Input
                    value={form.unite}
                    onChange={(e) => setForm({ ...form, unite: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Seuil d'alerte</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.seuil_alerte}
                    onChange={(e) => setForm({ ...form, seuil_alerte: Number(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le suivi des dates de péremption est automatique pour la catégorie « Aide alimentaire ».
              </p>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.actif}
                  onCheckedChange={(v) => setForm({ ...form, actif: !!v })}
                />
                Article actif
              </label>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Articles à créer</Label>
                <p className="text-xs text-muted-foreground">
                  Une ligne = un article. Chaque ligne porte sa propre catégorie.
                </p>
                <div className="rounded-md border divide-y">
                  <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <div className="col-span-4">Catégorie</div>
                    <div className="col-span-4">Nom</div>
                    <div className="col-span-2">Unité</div>
                    <div className="col-span-1 text-right">Seuil</div>
                    <div className="col-span-1" />
                  </div>
                  {lignes.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                      <div className="col-span-4">
                        <Select
                          value={l.categorie_id}
                          onValueChange={(v) => updateLigne(i, { categorie_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Catégorie…" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.libelle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        className="col-span-4"
                        placeholder="Ex : Couette, Lait…"
                        value={l.nom}
                        onChange={(e) => updateLigne(i, { nom: e.target.value })}
                      />
                      <Input
                        className="col-span-2"
                        value={l.unite}
                        onChange={(e) => updateLigne(i, { unite: e.target.value })}
                      />
                      <Input
                        className="col-span-1 text-right"
                        type="number"
                        min={0}
                        value={l.seuil_alerte}
                        onChange={(e) =>
                          updateLigne(i, { seuil_alerte: Number(e.target.value) })
                        }
                      />
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLigne(i)}
                          disabled={lignes.length === 1}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une ligne
                </Button>
                <p className="text-xs text-muted-foreground">
                  La date de péremption sera demandée à l'arrivage uniquement pour les articles d'aide alimentaire.
                </p>
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- LOT DIALOG ----------
function LotDialog({
  articles,
  categoriesById,
  presetArticle,
  structureId,
  onClose,
  onSaved,
}: {
  articles: Article[];
  categoriesById: Record<string, Categorie>;
  presetArticle?: StockRow;
  structureId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    article_id: presetArticle?.article_id ?? articles[0]?.id ?? "",
    date_arrivage: new Date().toISOString().slice(0, 10),
    date_peremption: "",
    quantite_initiale: 1,
    provenance: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const article = articles.find((a) => a.id === form.article_id);
  const articleCat = article ? categoriesById[article.categorie_id] : undefined;
  const suiviPeremption = articleCat?.code === "alimentaire" || (article?.suivi_peremption ?? false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.article_id || !form.quantite_initiale)
      return toast.error("Article et quantité requis");
    setLoading(true);
    const { error } = await supabase.from("dons_lots").insert({
      article_id: form.article_id,
      structure_id: structureId,
      date_arrivage: form.date_arrivage,
      date_peremption: form.date_peremption || null,
      quantite_initiale: form.quantite_initiale,
      quantite_restante: form.quantite_initiale,
      provenance: form.provenance || null,
      notes: form.notes || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Arrivage enregistré");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel arrivage</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Article *</Label>
            <Select
              value={form.article_id}
              onValueChange={(v) => setForm({ ...form, article_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {articles.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nom} ({categoriesById[a.categorie_id]?.libelle})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date d'arrivage *</Label>
              <Input
                type="date"
                value={form.date_arrivage}
                onChange={(e) =>
                  setForm({ ...form, date_arrivage: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Quantité ({article?.unite}) *</Label>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={form.quantite_initiale}
                onChange={(e) =>
                  setForm({ ...form, quantite_initiale: Number(e.target.value) })
                }
              />
            </div>
          </div>
          {suiviPeremption && (
            <div>
              <Label>Date de péremption</Label>
              <Input
                type="date"
                value={form.date_peremption}
                onChange={(e) =>
                  setForm({ ...form, date_peremption: e.target.value })
                }
              />
            </div>
          )}
          <div>
            <Label>Provenance</Label>
            <Input
              value={form.provenance}
              onChange={(e) => setForm({ ...form, provenance: e.target.value })}
              placeholder="Ex : Banque alimentaire, don particulier…"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer l'arrivage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- DISTRIBUTION DIALOG ----------
function DistributionDialog({
  articles,
  presetArticle,
  lots,
  structureId,
  onClose,
  onSaved,
}: {
  articles: Article[];
  presetArticle?: StockRow;
  lots: Lot[];
  structureId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    article_id: presetArticle?.article_id ?? "",
    lot_id: "",
    usager_id: "",
    quantite: 1,
    date_distribution: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [usagerSearch, setUsagerSearch] = useState("");
  const [usagerResults, setUsagerResults] = useState<any[]>([]);
  const [selectedUsager, setSelectedUsager] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const article = articles.find((a) => a.id === form.article_id);
  const articleLots = lots
    .filter((l) => l.article_id === form.article_id && l.quantite_restante > 0)
    .sort((a, b) => {
      // FIFO : péremption la plus proche d'abord
      if (a.date_peremption && b.date_peremption)
        return a.date_peremption.localeCompare(b.date_peremption);
      if (a.date_peremption) return -1;
      if (b.date_peremption) return 1;
      return a.date_arrivage.localeCompare(b.date_arrivage);
    });

  // recherche usagers
  useEffect(() => {
    if (usagerSearch.length < 2) {
      setUsagerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("usagers")
        .select("id, prenom, nom, email")
        .or(`nom.ilike.%${usagerSearch}%,prenom.ilike.%${usagerSearch}%`)
        .eq("archive", false)
        .limit(8);
      setUsagerResults((data ?? []) as any[]);
    }, 200);
    return () => clearTimeout(t);
  }, [usagerSearch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.article_id || !form.usager_id || !form.quantite)
      return toast.error("Article, usager et quantité requis");
    setLoading(true);
    const { error } = await supabase.from("dons_distributions").insert({
      structure_id: structureId,
      usager_id: form.usager_id,
      article_id: form.article_id,
      lot_id: form.lot_id || null,
      quantite: form.quantite,
      date_distribution: form.date_distribution,
      agent_id: user?.id ?? null,
      notes: form.notes || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Distribution enregistrée");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Distribuer à un usager</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Article *</Label>
            <Select
              value={form.article_id}
              onValueChange={(v) =>
                setForm({ ...form, article_id: v, lot_id: "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {articles.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {article && articleLots.length > 0 && (
            <div>
              <Label>Lot (FIFO suggéré)</Label>
              <Select
                value={form.lot_id || "auto"}
                onValueChange={(v) =>
                  setForm({ ...form, lot_id: v === "auto" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Auto (premier lot disponible)
                  </SelectItem>
                  {articleLots.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      Arrivage {formatDate(l.date_arrivage)} —{" "}
                      {Number(l.quantite_restante)} {article.unite}
                      {l.date_peremption ? ` — pér. ${formatDate(l.date_peremption)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!form.lot_id && articleLots[0] && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sera décrémenté du lot : arrivage {formatDate(articleLots[0].date_arrivage)}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantité ({article?.unite ?? ""}) *</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={form.quantite}
                onChange={(e) =>
                  setForm({ ...form, quantite: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date_distribution}
                onChange={(e) =>
                  setForm({ ...form, date_distribution: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label>Usager bénéficiaire *</Label>
            {selectedUsager ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <div>
                  <div className="font-medium text-sm">{fullName(selectedUsager)}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedUsager.email ?? "—"}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedUsager(null);
                    setForm({ ...form, usager_id: "" });
                  }}
                >
                  Changer
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Rechercher (nom ou prénom)…"
                  value={usagerSearch}
                  onChange={(e) => setUsagerSearch(e.target.value)}
                />
                {usagerResults.length > 0 && (
                  <div className="mt-1 rounded-md border border-border bg-popover divide-y divide-border max-h-44 overflow-auto">
                    {usagerResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          setSelectedUsager(u);
                          setForm({ ...form, usager_id: u.id });
                          setUsagerResults([]);
                          setUsagerSearch("");
                        }}
                      >
                        <div className="font-medium">{fullName(u)}</div>
                        <div className="text-xs text-muted-foreground">{u.email ?? ""}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer la distribution"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
