import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X } from "lucide-react";

export const Route = createFileRoute("/aide/presto/parametres")({
  component: PrestoParametres,
});

const VARIABLES_DISPO: { token: string; label: string }[] = [
  { token: "{prenom}", label: "Prénom" },
  { token: "{nom}", label: "Nom" },
  { token: "{type_pret}", label: "Type de prêt" },
  { token: "{date_demande}", label: "Date de demande" },
  { token: "{date_retour_prevue}", label: "Date de retour prévue" },
];

const VARIABLES_AVENANT: { token: string; label: string }[] = [
  ...VARIABLES_DISPO,
  { token: "{nouvelle_date_retour}", label: "Nouvelle date de retour" },
];

function PrestoParametres() {
  const [mails, setMails] = useState<string[]>([]);
  const [newMail, setNewMail] = useState("");
  const [stockPc, setStockPc] = useState(0);
  const [stockChr, setStockChr] = useState(0);
  const [subject, setSubject] = useState("");
  const [tpl, setTpl] = useState("");
  const [subjectAv, setSubjectAv] = useState("");
  const [tplAv, setTplAv] = useState("");
  const [loading, setLoading] = useState(true);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const focusTarget = useRef<"subject" | "body">("body");

  const bodyAvRef = useRef<HTMLTextAreaElement>(null);
  const subjectAvRef = useRef<HTMLInputElement>(null);
  const focusTargetAv = useRef<"subject" | "body">("body");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("presto_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        const d = data as Record<string, any>;
        setMails(d.mails_scd ?? []);
        setStockPc(d.stock_pc ?? 0);
        setStockChr(d.stock_chromebook ?? 0);
        setTpl(d.template_mail_dispo ?? "");
        setSubject(d.subject_mail_dispo ?? "");
        setTplAv(d.template_mail_avenant ?? "");
        setSubjectAv(d.subject_mail_avenant ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const { error } = await supabase
      .from("presto_settings")
      .update({
        mails_scd: mails,
        stock_pc: stockPc,
        stock_chromebook: stockChr,
        template_mail_dispo: tpl,
        subject_mail_dispo: subject,
        template_mail_avenant: tplAv,
        subject_mail_avenant: subjectAv,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) toast.error(error.message);
    else toast.success("Paramètres enregistrés");
  };

  const addMail = () => {
    const m = newMail.trim();
    if (!m || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) {
      toast.error("Adresse mail invalide");
      return;
    }
    if (mails.includes(m)) return;
    setMails([...mails, m]);
    setNewMail("");
  };

  const insertVarGeneric = (token: string, where: "dispo" | "avenant") => {
    const isAv = where === "avenant";
    const target = isAv ? focusTargetAv.current : focusTarget.current;
    if (target === "subject") {
      const el = isAv ? subjectAvRef.current : subjectRef.current;
      const cur = isAv ? subjectAv : subject;
      const setter = isAv ? setSubjectAv : setSubject;
      const start = el?.selectionStart ?? cur.length;
      const end = el?.selectionEnd ?? cur.length;
      setter(cur.slice(0, start) + token + cur.slice(end));
      setTimeout(() => {
        el?.focus();
        el?.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else {
      const el = isAv ? bodyAvRef.current : bodyRef.current;
      const cur = isAv ? tplAv : tpl;
      const setter = isAv ? setTplAv : setTpl;
      const start = el?.selectionStart ?? cur.length;
      const end = el?.selectionEnd ?? cur.length;
      setter(cur.slice(0, start) + token + cur.slice(end));
      setTimeout(() => {
        el?.focus();
        el?.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div>
      <PageHeader
        title="PRESTO — Paramètres"
        description="Configurer les destinataires SCD, le stock et les mails envoyés à l'étudiant."
      />
      <div className="p-6 grid gap-4 md:grid-cols-2 max-w-5xl">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">Destinataires SCD</h3>
            <p className="text-xs text-muted-foreground">
              Ces adresses reçoivent une notification à chaque nouvelle demande PRESTO.
            </p>
            <div className="space-y-1">
              {mails.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune adresse.</p>
              )}
              {mails.map((m) => (
                <div
                  key={m}
                  className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-sm"
                >
                  <span>{m}</span>
                  <button onClick={() => setMails(mails.filter((x) => x !== m))}>
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="adresse@univ.fr"
                value={newMail}
                onChange={(e) => setNewMail(e.target.value)}
              />
              <Button variant="outline" onClick={addMail}>
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">Disponibilité du parc</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>PC disponibles</Label>
                <Input
                  type="number"
                  min={0}
                  value={stockPc}
                  onChange={(e) => setStockPc(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label>Chromebooks disponibles</Label>
                <Input
                  type="number"
                  min={0}
                  value={stockChr}
                  onChange={(e) => setStockChr(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold">Mail étudiant — « Ordinateur disponible »</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Cliquez sur une variable pour l'insérer à l'endroit du curseur. Elle sera
                remplacée automatiquement à l'envoi.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {VARIABLES_DISPO.map((v) => (
                <Button
                  key={v.token}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => insertVarGeneric(v.token, "dispo")}
                  title={`Insère ${v.token}`}
                >
                  {v.label}{" "}
                  <span className="ml-1 font-mono text-muted-foreground">{v.token}</span>
                </Button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Objet du mail</Label>
              <Input
                ref={subjectRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => (focusTarget.current = "subject")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Corps du message</Label>
              <Textarea
                ref={bodyRef}
                rows={10}
                value={tpl}
                onChange={(e) => setTpl(e.target.value)}
                onFocus={() => (focusTarget.current = "body")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold">Mail étudiant — « Avenant (renouvellement) prêt »</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Envoyé lorsqu'un renouvellement est accepté. La variable{" "}
                <code className="font-mono">{`{nouvelle_date_retour}`}</code> sera renseignée
                automatiquement.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {VARIABLES_AVENANT.map((v) => (
                <Button
                  key={v.token}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => insertVarGeneric(v.token, "avenant")}
                  title={`Insère ${v.token}`}
                >
                  {v.label}{" "}
                  <span className="ml-1 font-mono text-muted-foreground">{v.token}</span>
                </Button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Objet du mail</Label>
              <Input
                ref={subjectAvRef}
                value={subjectAv}
                onChange={(e) => setSubjectAv(e.target.value)}
                onFocus={() => (focusTargetAv.current = "subject")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Corps du message</Label>
              <Textarea
                ref={bodyAvRef}
                rows={10}
                value={tplAv}
                onChange={(e) => setTplAv(e.target.value)}
                onFocus={() => (focusTargetAv.current = "body")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end">
          <Button onClick={save}>Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}
