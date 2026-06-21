import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, CheckCircle2, Pencil, Printer, RefreshCw, XCircle } from "lucide-react";
import {
  DispositifPartenairePermission,
  ChampPerso,
} from "@/lib/aide/coups-pouce-types";
import { CustomFieldsForm } from "@/components/aide/coups-pouce/CustomFieldsForm";

/**
 * Simulation visuelle de ce qu'un partenaire d'une structure verrait et pourrait faire
 * sur un coup de pouce donné, en fonction des permissions paramétrées.
 */
export function PartenairePreviewDialog({
  open,
  onClose,
  dispositifLibelle,
  structureNom,
  permissions,
  champs,
}: {
  open: boolean;
  onClose: () => void;
  dispositifLibelle: string;
  structureNom: string;
  permissions: DispositifPartenairePermission;
  champs: ChampPerso[];
}) {
  const champsVisibles = champs.filter(
    (c) => (c.remplissable_par ?? "guichetier") !== "guichetier",
  );

  const Item = ({
    ok,
    label,
    icon: Icon,
  }: {
    ok: boolean;
    label: string;
    icon: any;
  }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground/40" />
      )}
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className={ok ? "" : "text-muted-foreground line-through"}>
        {label}
      </span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Aperçu vue partenaire — <span className="text-primary">{structureNom}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Voici ce qu'un utilisateur rattaché à <strong>{structureNom}</strong> verra
            et pourra faire sur un coup de pouce de type «&nbsp;{dispositifLibelle}&nbsp;».
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Permissions actives
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                <Item ok={permissions.peut_voir} label="Voir le coup de pouce" icon={Eye} />
                <Item
                  ok={permissions.peut_confirmer_passage}
                  label="Confirmer le passage / l'utilisation"
                  icon={CheckCircle2}
                />
                <Item
                  ok={permissions.peut_remplir_fiche}
                  label="Remplir / modifier les champs"
                  icon={Pencil}
                />
                <Item ok={permissions.peut_imprimer} label="Imprimer la fiche" icon={Printer} />
                <Item
                  ok={permissions.peut_changer_statut}
                  label="Changer le statut (accordé / refusé / clôturé)"
                  icon={RefreshCw}
                />
              </div>
            </CardContent>
          </Card>

          {!permissions.peut_voir ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Cette structure ne peut pas voir ce dispositif — aucune fiche ne lui
                sera proposée.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Fiche telle qu'elle apparaîtra
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dispositifLibelle}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        en attente
                      </Badge>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Usager : <em>Jean Exemple</em> · demandé le {new Date().toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  {champsVisibles.length > 0 && (
                    <div className="mt-4 border-t pt-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Champs accessibles à la structure
                      </div>
                      <CustomFieldsForm
                        champs={champsVisibles}
                        values={{}}
                        onChange={() => {}}
                        audience="partenaire"
                        readOnly={!permissions.peut_remplir_fiche}
                      />
                      {!permissions.peut_remplir_fiche && (
                        <p className="text-[11px] text-muted-foreground mt-2 italic">
                          Lecture seule — la structure ne peut pas modifier ces champs.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                    {permissions.peut_confirmer_passage && (
                      <Button size="sm" variant="outline">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Confirmer le passage
                      </Button>
                    )}
                    {permissions.peut_imprimer && (
                      <Button size="sm" variant="outline">
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        Imprimer
                      </Button>
                    )}
                    {permissions.peut_changer_statut && (
                      <>
                        <Button size="sm" variant="outline">
                          Marquer accordé
                        </Button>
                        <Button size="sm" variant="outline">
                          Marquer refusé
                        </Button>
                      </>
                    )}
                    {!permissions.peut_confirmer_passage &&
                      !permissions.peut_imprimer &&
                      !permissions.peut_changer_statut && (
                        <p className="text-xs text-muted-foreground italic">
                          Aucune action disponible — vue lecture seule.
                        </p>
                      )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
