import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createUsager } from "@/lib/aide/usagers-actions";
import { getProfileByEmail } from "@/lib/aide/auth-actions";
import { useAuth } from "@/lib/aide/auth";
import { PageHeader } from "@/components/aide/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { USAGER_SEXES, USAGER_SITUATION_FAMILIALE, USAGER_TYPE_PUBLIC } from "@/lib/aide/labels";
import { usagerSchema, UsagerSchema } from "@/lib/aide/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/aide/usagers/nouveau")({
  component: NouveauUsager,
});

function NouveauUsager() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingEtu, setExistingEtu] = useState<any>(null);

  const form = useForm<UsagerSchema>({
    resolver: zodResolver(usagerSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      genre: undefined,
      date_naissance: "",
      type_public: undefined,
      situation: undefined,
    },
  });

  async function onSubmit(values: UsagerSchema) {
    if (!profile?.structure_id) {
      toast.error("Erreur de profil", { description: "Votre compte n'est rattaché à aucune structure. Veuillez configurer votre profil dans les paramètres." });
      return;
    }

    setLoading(true);
    
    // On récupère le profil complet via le serveur
    const profRes = await getProfileByEmail(profile.email);
    const fullProfile = profRes.data;

    if (!fullProfile?.territoire_id) {
      toast.error("Erreur de configuration", { description: "Votre structure n'est rattachée à aucun territoire." });
      setLoading(false);
      return;
    }

    const res = await createUsager({
      nom: values.nom,
      prenom: values.prenom,
      email: values.email || null,
      telephone: values.telephone || null,
      genre: (values.genre as any) || null,
      date_naissance: values.date_naissance || null,
      type_public: (values.type_public as any) || null,
      situation: (values.situation as any) || null,
      cree_par: fullProfile.id,
      structure_creatrice_id: fullProfile.structure_id,
      territoire_id: fullProfile.territoire_id,
    });

    if (res.error) {
      console.error("[USAGER-CREATE] Erreur détaillée:", res.error);
      toast.error("Erreur lors de la création de l'usager", { 
        description: res.error 
      });
    } else if (res.data) {
      toast.success("Usager créé avec succès !");
      navigate({ to: "/aide/usagers/$id", params: { id: res.data.id } });
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        title="Nouvel Usager"
        description="Créer une nouvelle fiche usager dans le système."
      />
      <div className="p-6 space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: "/aide/usagers" })} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des usagers
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Informations de l'usager</CardTitle>
            <CardDescription>Remplissez les champs pour créer un nouvel usager.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prenom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input placeholder="Prénom de l'usager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom de l'usager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                    name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="06 00 00 00 00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="genre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sexe</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le sexe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(USAGER_SEXES).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date_naissance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de naissance</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type_public"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de public</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type de public" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(USAGER_TYPE_PUBLIC).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="situation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situation familiale</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner la situation familiale" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(USAGER_SITUATION_FAMILIALE).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="bg-aide hover:bg-aide/90 text-white" disabled={loading}>
                  {loading ? "Création en cours..." : "Créer l'usager"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
