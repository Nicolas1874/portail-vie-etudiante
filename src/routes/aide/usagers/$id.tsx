import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/aide-supabase/client";
import { useAuth } from "@/lib/aide/auth";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Edit, Archive, User, Trash, RotateCcw } from "lucide-react";
import { UsagerHero } from "@/components/aide/usager/UsagerHero";
import { UsagerSidePanel } from "@/components/aide/usager/UsagerSidePanel";
import { UsagerTimeline } from "@/components/aide/usager/UsagerTimeline";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/aide/usagers/$id")({
  component: UsagerDetail,
});

function UsagerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { profile, isAdmin, hasRole } = useAuth();
  const [usager, setUsager] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUsager = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("usagers")
      .select("*, demandes(*)")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement de l'usager", { description: error.message });
      navigate({ to: "/aide/usagers" });
    } else {
      setUsager(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshUsager();
  }, [id]);

  const handleArchive = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("usagers")
      .update({ archive: !usager.archive })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de l'archivage/désarchivage", { description: error.message });
    } else {
      toast.success(`Usager ${usager.archive ? "désarchivé" : "archivé"} avec succès !`);
      refreshUsager();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("usagers")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression de l'usager", { description: error.message });
    } else {
      toast.success("Usager supprimé avec succès !");
      navigate({ to: "/aide/usagers" });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Chargement de l'usager...
      </div>
    );
  }

  if (!usager) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Usager introuvable.
      </div>
    );
  }

  const canEdit = isAdmin || hasRole("agent") || hasRole("superviseur");
  const canDelete = isAdmin;

  return (
    <div className="min-h-screen bg-background/50">
      <PageHeader
        title="Fiche Usager"
        description="Détails et historique des demandes de l'usager."
      />
      <div className="p-6 space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: "/aide/usagers" })} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des usagers
        </Button>

        <UsagerHero usager={usager} onRefresh={refreshUsager} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Informations générales</CardTitle>
                <div className="flex gap-2">
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => navigate({ to: `/aide/usagers/${id}/edit` as any })}>
                      <Edit className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                  )}
                  {canEdit && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className={usager.archive ? "text-green-600" : "text-orange-600"}>
                          {usager.archive ? <RotateCcw className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />} 
                          {usager.archive ? "Désarchiver" : "Archiver"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action va {usager.archive ? "désarchiver" : "archiver"} l'usager {usager.prenom} {usager.nom}.
                            Vous pourrez toujours le retrouver dans la liste des usagers {usager.archive ? "actifs" : "archivés"}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleArchive}>
                            {usager.archive ? "Désarchiver" : "Archiver"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash className="mr-2 h-4 w-4" /> Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Toutes les données liées à cet usager seront définitivement supprimées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{usager.email || "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Téléphone</p>
                    <p>{usager.tel || "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sexe</p>
                    <p>{usager.sexe || "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date de naissance</p>
                    <p>{usager.date_naissance ? formatDate(usager.date_naissance) : "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type de public</p>
                    <p>{usager.type_public || "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Situation familiale</p>
                    <p>{usager.situation_familiale || "Non renseigné"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <UsagerTimeline usagerId={id} />
          </div>

          <UsagerSidePanel usager={usager} onRefresh={refreshUsager} />
        </div>
      </div>
    </div>
  );
}
