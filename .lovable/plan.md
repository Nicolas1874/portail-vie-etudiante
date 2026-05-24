
# Plan de durcissement sécurité pour validation DSI

## Phase 1 — Correction des vulnérabilités critiques (PRIORITÉ ABSOLUE)

### 1.1 Backend — Server-side authorization
Toutes les opérations sensibles d'administration sont actuellement exécutées via le SDK Supabase côté navigateur. Un attaquant avec un token valide peut contourner les contrôles UI.

**Action** :
- Créer `src/lib/admin.functions.ts` avec des server functions protégées par `requireSupabaseAuth` :
  - `createInvitation(app, email, role)`
  - `revokeInvitation(invitationId)`
  - `removeUserRole(roleId)`
  - `listAppUsers(app)` (pour consulter les utilisateurs)
- Chaque function re-vérifie côté serveur que `auth.uid()` est bien admin du SI concerné via `supabaseAdmin`
- Refactorer `src/routes/admin.$app.tsx` pour utiliser `useServerFn` au lieu du SDK direct

### 1.2 Wiring `attachSupabaseAuth`
Le middleware client n'est pas enregistré dans `src/start.ts`, ce qui casserait tous les server functions authentifiés.

**Action** : Enregistrer `attachSupabaseAuth` comme `functionMiddleware` global.

### 1.3 Restriction des fonctions SECURITY DEFINER
Les fonctions PostgreSQL `has_role`, `is_app_admin`, `has_app_access` sont exécutables par tout utilisateur connecté.

**Action** : Migration SQL `REVOKE EXECUTE FROM authenticated, anon` sur ces 3 fonctions (elles restent utilisables par les policies RLS).

### 1.4 Masquage des erreurs serveur
`src/routes/__root.tsx` affiche `error.message` brut au visiteur.

**Action** : En production, afficher un message générique. Logs complets côté serveur uniquement.

---

## Phase 2 — Politique d'authentification renforcée

### 2.1 Configuration Supabase Auth
- **HIBP activé** : refus des mots de passe compromis (Have I Been Pwned)
- **Auto-confirm désactivé** : obligation de vérifier l'email
- **Politique mot de passe** : 12 caractères min, complexité (chiffres + majuscules + caractères spéciaux)
- **Désactiver les inscriptions publiques** (uniquement par invitation admin — cohérent avec un SI institutionnel)

### 2.2 Emails d'authentification personnalisés
Configurer le domaine email + templates auth aux couleurs de l'Université d'Orléans (vérification email, reset mot de passe, invitation).

---

## Phase 3 — Double authentification (2FA email)

Flux : utilisateur saisit email + mot de passe → si valides, un code à 6 chiffres est envoyé par email → utilisateur saisit le code → session ouverte.

**Approche technique** :
- Nouvelle table `mfa_challenges` : id, user_id, code_hash (bcrypt), expires_at (5 min), attempts, used_at
- Server function `requestMfaChallenge(email, password)` : vérifie credentials, génère code, envoie email
- Server function `verifyMfaChallenge(challengeId, code)` : vérifie code, ouvre session via `supabase.auth.signInWithPassword`
- Page `/login` refondue en 2 étapes (saisie credentials → saisie code)
- Template email transactionnel "code de connexion"
- Rate limiting : max 5 tentatives / code, max 3 codes / 15 min / email
- Obligatoire pour TOUS les utilisateurs

---

## Phase 4 — Audit & traçabilité

### Table `audit_logs`
Champs : `id, actor_id, actor_email, action, target_type, target_id, target_email, application, details (jsonb), ip_address, user_agent, created_at`

Événements tracés automatiquement :
- Connexion réussie / échouée / 2FA échouée
- Demande de reset mot de passe
- Création / révocation d'invitation
- Attribution / retrait de rôle
- Modification de profil
- Accès aux pages d'administration

### Consultation
- Page `/admin/audit` accessible aux super-admins (utilisateurs ayant les 3 rôles admin)
- Filtres : par utilisateur, par action, par SI, par date
- Export CSV pour audits DSI

### RLS
- Insertion : autorisée à toute fonction `SECURITY DEFINER` (via server functions)
- Lecture : super-admins uniquement
- Aucune modification ni suppression possible (append-only)

---

## Phase 5 — Documentation sécurité pour la DSI

Création d'un document `/admin/security` (visible super-admin) résumant :
- Modèle d'authentification (email + MDP + 2FA email obligatoire)
- Politique de mot de passe (12 caractères, HIBP)
- Stockage des secrets (variables d'environnement, jamais en clair)
- RLS sur toutes les tables, double vérification serveur des opérations admin
- Audit log complet, append-only
- Conformité RGPD (donnée minimisée, droit à l'effacement via suppression de compte)
- Architecture (schéma de séparation portail / SI)

---

## Détails techniques (pour info)

**Fichiers créés** :
- `src/lib/admin.functions.ts` (server functions admin sécurisées)
- `src/lib/audit.functions.ts` (lecture des logs)
- `src/lib/mfa.functions.ts` (2FA email)
- `src/lib/email-templates/mfa-code.tsx` (template code 2FA)
- `src/lib/email-templates/registry.ts`
- `src/routes/admin.audit.tsx` (page consultation audit)
- `src/routes/admin.security.tsx` (page documentation sécurité)
- `src/routes/login.tsx` refondue (flow 2 étapes)
- Migration SQL : table `audit_logs`, table `mfa_challenges`, REVOKE des fonctions SECURITY DEFINER, RLS

**Fichiers modifiés** :
- `src/start.ts` (enregistrement middleware)
- `src/routes/__root.tsx` (masquage erreurs)
- `src/routes/admin.$app.tsx` (utilisation server functions)
- `src/lib/auth-context.tsx` (état 2FA)

**Configuration backend** :
- Auth : HIBP activé, auto-confirm désactivé, inscriptions publiques désactivées
- Domaine email à configurer pour envoi des codes 2FA

**Estimation** : ~15-20 fichiers à créer/modifier. Travail conséquent mais nécessaire pour passer la validation DSI.

---

## Ordre d'exécution recommandé

1. **Phase 1** complète (corrections critiques) — base saine
2. **Phase 2** (config auth + emails) — prérequis pour la 2FA
3. **Phase 4** (audit logs) — infrastructure de traçabilité  
4. **Phase 3** (2FA) — couche finale d'auth
5. **Phase 5** (documentation) — synthèse pour la DSI

Validez-vous ce plan ? Une fois approuvé, je démarre par la Phase 1.
