/**
 * Bus d'événements pour ouvrir les dialogs depuis n'importe où (raccourcis clavier).
 */
export type UsagerActionKind = "suivi" | "demande" | "rdv" | "note" | "coup-pouce";

const EVT = (kind: UsagerActionKind) => `usager:open:${kind}`;

export function dispatchUsagerAction(kind: UsagerActionKind) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT(kind)));
}

export function onUsagerAction(kind: UsagerActionKind, handler: () => void) {
  if (typeof window === "undefined") return () => {};
  const fn = () => handler();
  window.addEventListener(EVT(kind), fn);
  return () => window.removeEventListener(EVT(kind), fn);
}
