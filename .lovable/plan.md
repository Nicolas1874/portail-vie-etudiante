# Intégration de Guichet Connect sous `/aide/*`

## Ce qui sera copié depuis le projet *Guichet Connect*

- **40 routes** `_app.*` (usagers, logement, ateliers, dons, calendrier, messagerie, annuaire, exports, notifications, paramètres, presto, partenaire, admin.*) → renommées sous `src/routes/aide/`.
- **Layout `_app.tsx`** (AppShell + navigation latérale) → devient `src/routes/aide/route.tsx`.
- **Composants** : `src/components/aide/` (AppShell, PageHeader, StatusBadge, GlobalSearch, DashboardAlertes, CoupsPouceTab, sous-dossiers `coups-pouce/`, `presto/`, `usager/`, etc.).
- **Libs métier** : `src/lib/aide/` (besoins-correspondance, coups-pouce-print/types, fiche-usager-pdf, labels, motion, presto-*, rapport-annuel*, reorientation-mail, rgpd-export, role-switch, territoire-scope, usager-shortcuts, xlsx-export).
- **Hook** : `use-browser-notifications` (le `use-mobile` du portail est réutilisé).
- **Types Supabase** : `src/integrations/aide-supabase/types.ts` (gardés pour le typage uniquement, voir plus bas).
- **Assets** éventuels du dossier `src/assets/`.

## Routes **non** copiées (à ta demande)

`login.tsx`, `sso.tsx`, `portail.$token.tsx`, `inscription-atelier.$id.tsx`, `__root.tsx`, `router.tsx`, `routeTree.gen.ts`, `styles.css` (les tokens utiles seront fusionnés dans le `styles.css` du portail).

## Convention de chemins

```text
src/routes/_app.usagers.index.tsx  →  src/routes/aide/usagers.index.tsx
src/routes/_app.admin.*.tsx        →  src/routes/aide/admin.*.tsx
src/routes/_app.tsx                →  src/routes/aide/route.tsx   (layout avec <Outlet/>)
```

Le bouton **AIDE** du portail pointera vers `/aide` (modification de `SI_AIDE_URL` dans `src/lib/apps-config.ts` pour ouvrir en interne, plus le `Link` adapté).

## Authentification — point dur à arbitrer

Tu as demandé deux choses **incompatibles** :

1. *« Utiliser l'auth localStorage `uo_user` du portail »* → on injecte cet utilisateur comme contexte d'auth pour Guichet Connect.
2. *« Garder 100 % des fonctionnalités »* → toutes les pages Guichet Connect lisent/écrivent dans **Supabase** (tables `usagers`, `coups_pouce`, `dons`, `ateliers`, `logement_*`, `presto_*`, `rgpd_*`, `partenaires`, `audit_logs`, …) avec des policies RLS basées sur `auth.uid()`. Sans session Supabase, ces requêtes retourneront `[]` ou échoueront en 401.

L'API Clever Cloud que tu as mentionnée (`/login`, `/register`) ne réplique pas ces ~30 tables. Trois options réalistes :

- **A. Garder le client Supabase de Guichet Connect** (recopier `src/integrations/aide-supabase/`, ses propres `VITE_AIDE_SUPABASE_URL` / `_PUBLISHABLE_KEY`). L'utilisateur du portail signe silencieusement avec Supabase via un mapping email → compte AIDE. C'est la seule façon de garder 100 % des fonctionnalités intactes.
- **B. Ne migrer vers l'API Clever Cloud QUE l'admin `utilisateurs` + `rôles`** (les seules données pertinentes pour les tuiles du portail). Le reste (usagers, dons, ateliers, etc.) continue sur Supabase Guichet Connect.
- **C. Tout réécrire pour Clever Cloud** : il faut alors étendre l'API MySQL avec ~30 endpoints REST (CRUD usagers, coups-pouce, dons, ateliers, logement, presto, rgpd, audit, etc.). Délai important, hors scope d'un simple « import ».

**Recommandation** : option **B**.

## Étapes d'exécution (option B)

1. Lister exhaustivement les fichiers du projet source via `cross_project--list_project_dir` (récursif sur `components/`, `routes/`, `lib/`).
2. Copier les fichiers en lot avec `cross_project--copy_project_asset` (texte/binaires) vers leurs nouveaux chemins.
3. Réécrire tous les imports `@/components/...` → `@/components/aide/...`, `@/lib/...` → `@/lib/aide/...`, `@/integrations/supabase/...` → `@/integrations/aide-supabase/...`, `@/hooks/use-mobile` reste tel quel.
4. Renommer les fichiers de routes `_app.*` → `aide/*` et adapter chaque `createFileRoute("/_app/...")` → `createFileRoute("/aide/...")`.
5. Remplacer l'auth Guichet Connect (`@/lib/auth`) par un adaptateur qui lit `localStorage.uo_user` et expose la même API (`useAuth`, `useUserRole`, etc.).
6. Sur les pages `aide/admin/utilisateurs` et `aide/admin/partenaires`, brancher les mutations sur l'API Clever Cloud (`https://portail-vie-etudiante-uo.cleverapps.io`) — endpoints à préciser.
7. Ajouter une variable `VITE_AIDE_SUPABASE_URL` + `VITE_AIDE_SUPABASE_PUBLISHABLE_KEY` (tu devras me les fournir, ce sont les clés publiques du backend de Guichet Connect).
8. Modifier `src/lib/apps-config.ts` : `SI_AIDE_URL = "/aide"` + ajuster la tuile pour utiliser `<Link>` au lieu de `window.open`.
9. Charger les variables manquantes ; lancer le build pour s'assurer qu'il n'y a pas d'imports cassés.

## Ce dont j'ai besoin de toi avant de coder

1. **Confirmer l'option A / B / C** ci-dessus.
2. Si **B** : la liste exacte des endpoints REST que ton API Clever Cloud expose pour gérer les utilisateurs et leurs droits aux 3 tuiles (`GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`, `POST /users/:id/roles`, etc.).
3. Si **A** ou **B** : l'URL et la clé publishable du Supabase de Guichet Connect (sans elles, aucune page ne peut afficher de données).
4. Confirmer que le design du portail (header / palette) **disparaît** dans `/aide/*` au profit de l'AppShell propre à Guichet Connect (tu as dit « 100 % du design »).

Une fois ces 4 points tranchés, je copie l'ensemble en un seul lot et je te confirme le résultat.
