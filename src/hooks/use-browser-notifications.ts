import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Demande la permission Notification et déclenche une notif système
 * à chaque nouvelle ligne `notifications` adressée à l'utilisateur courant.
 */
export function useBrowserNotifications() {
  const { user } = useAuth();
  const askedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (askedRef.current) return;
    askedRef.current = true;
    if (Notification.permission === "default") {
      // Déclenchement différé pour éviter le prompt immédiat au chargement
      const t = setTimeout(() => { void Notification.requestPermission(); }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined" || !("Notification" in window)) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `destinataire_id=eq.${user.id}` },
        (payload) => {
          const n: any = payload.new;
          if (Notification.permission !== "granted") return;
          if (document.visibilityState === "visible") return; // évite le doublon avec sonner
          try {
            const notif = new Notification(n.titre ?? "Notification", {
              body: n.message ?? "",
              tag: n.id,
            });
            notif.onclick = () => {
              window.focus();
              if (n.lien) window.location.assign(n.lien);
              notif.close();
            };
          } catch { /* ignore */ }
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);
}
