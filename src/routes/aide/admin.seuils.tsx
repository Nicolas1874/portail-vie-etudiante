import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Sliders } from "lucide-react";

export const Route = createFileRoute("/aide/admin/seuils")({
  component: SeuilsPage,
});

interface Seuil {
  cle: string;
  libelle: string;
  valeur: number;
  description: string | null;
}

function SeuilsPage() {
  const { isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<Seuil[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("parametres_alertes" as never)
      .select("*")
      .order("cle")
      .then(({ data }) => setRows((data as Seuil[]) ?? []));
  }, [isAdmin]);

  if (loading) return <div className="p-8">Chargement…</div>;
  if (!isAdmin) return <Navigate to="/" />;

  const save = async (s: Seuil) => {
    setSaving(s.cle);
    const { error } = await supabase
      .from("parametres_alertes" as never)
      .update({ valeur: s.valeur, updated_at: new Date().toISOString() } as never)
      .eq("cle", s.cle);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Seuil enregistré");
  };

  return (
    <div>
      <PageHeader
        title="Seuils d'alerte"
        description="Configurez les seuils qui déclenchent les alertes du tableau de bord."
      />
      <div className="p-6 space-y-3 max-w-3xl">
        {rows.map((s) => (
          <Card key={s.cle} className="p-4">
            <div className="flex items-start gap-3">
              <Sliders className="h-5 w-5 text-muted-foreground mt-1" />
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="font-semibold">{s.libelle}</Label>
                  {s.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    className="w-32"
                    value={s.valeur}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) => (r.cle === s.cle ? { ...r, valeur: Number(e.target.value) } : r)),
                      )
                    }
                  />
                  <Button size="sm" onClick={() => save(s)} disabled={saving === s.cle}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving === s.cle ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
