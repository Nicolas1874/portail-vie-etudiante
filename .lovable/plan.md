## Objectif

Quand un agent connecté au portail clique sur « Ouvrir le SI AIDE », il arrive directement authentifié dans SI AIDE avec **la même adresse e-mail** que celle utilisée sur le portail. Les partenaires qui n'ont d'accès qu'au SI AIDE conservent leur login email/mot de passe classique côté SI AIDE.

## Architecture

```text
[Portail Lovable Cloud]                          [SI AIDE Lovable Cloud]
  user connecté (Supabase A)                       Supabase B (séparé)
        │                                                ▲
        │ 1. clic "Ouvrir"                               │
        ▼                                                │
  serverFn issueAideSsoToken()                           │
   - vérifie session portail                             │
   - signe JWT HS256 (secret partagé)                    │
   - { sub, email, name, iat, exp=60s, aud:"si-aide" }   │
        │                                                │
        │ 2. open(`${SI_AIDE_URL}/sso?token=...`)        │
        ▼                                                │
                              ──────────────────────►  /sso (route SI AIDE)
                                                         │
                                          3. serverFn consumeSsoToken(token)
                                             - vérifie signature + exp + aud
                                             - upsert profiles (email)
                                             - magic link admin pour cet email
                                             - retourne { access_token, refresh_token }
                                                         │
                              ◄──────────────────────  4. supabase.auth.setSession(...)
                                                         │
                                                         ▼
                                              utilisateur logué dans SI AIDE
                                              avec ses rôles locaux
```

**Sécurité du JWT :**
- Algo HS256, secret partagé `AIDE_SSO_SECRET` (32+ caractères aléatoires)
- `exp = iat + 60s` (token à usage quasi-immédiat)
- `aud = "si-aide"`, `iss = "portail-vie-etudiante"` (vérifiés côté SI AIDE)
- Stockage côté SI AIDE des `jti` consommés (table `sso_used_tokens`) pour empêcher le rejeu

## Travaux côté portail (ce projet — ce que je fais)

### 1. Ajouter le secret partagé
- `secrets--add_secret` pour `AIDE_SSO_SECRET` (l'utilisateur saisira une valeur aléatoire forte ; il devra copier la même dans le projet SI AIDE)

### 2. Nouvelle server function `src/lib/sso.functions.ts`
- `issueAideSsoToken` (POST, protégée par `requireSupabaseAuth`)
  - Vérifie que l'utilisateur a `has_app_access('AIDE')` (sinon 403)
  - Lit son `email` + `full_name` depuis `profiles`
  - Génère un JWT HS256 avec `jose` (déjà dispo en dépendance Vite ou à ajouter)
  - Audit log dans `audit_logs` : `action='sso.issue'`, `application='AIDE'`

### 3. Modifier l'ouverture du SI AIDE
- Fichier `src/routes/index.tsx` (ou le composant `PortalAppCard`) :
  - Au clic sur la carte AIDE : appeler `issueAideSsoToken()`, puis `window.open(\`\${SI_AIDE_URL}/sso?token=\${token}\`, '_blank')`
  - Fallback : si la serverFn échoue, ouvrir `SI_AIDE_URL` brut (l'utilisateur tombe sur l'écran de login classique du SI AIDE)
  - État de chargement sur la carte pendant la génération du token

### 4. Mettre à jour `apps-config.ts` (rien à changer dans l'URL, juste documenter)

## Travaux côté SI AIDE (autre projet — à demander à son agent)

Je fournirai à la fin un prompt clé en main à coller dans le projet SI AIDE. Il contiendra :

1. **Ajouter le secret** `AIDE_SSO_SECRET` (même valeur que portail) côté Lovable Cloud du SI AIDE
2. **Migration SQL** : créer `public.sso_used_tokens(jti text primary key, consumed_at timestamptz default now())` pour anti-rejeu
3. **Server function `consumeSsoToken`** :
   - Vérifier signature HS256 + `exp` + `aud` + `iss`
   - Vérifier que `jti` n'est pas dans `sso_used_tokens` (sinon 401)
   - Insérer le `jti` (lock anti-rejeu)
   - `supabaseAdmin.auth.admin.getUserByEmail(email)` → si absent : `createUser({ email, email_confirm: true })` puis trigger crée le profil
   - `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })` puis `verifyOtp` pour obtenir une vraie session, OU plus simple : utiliser `signInWithIdToken` si Supabase le permet, sinon créer un OTP unique et le valider
   - Retourner `{ access_token, refresh_token }`
4. **Route publique `/sso`** : page qui lit `?token=`, appelle `consumeSsoToken`, `supabase.auth.setSession(...)`, redirige vers `/`
5. **Garder le login email/mdp existant** pour les partenaires AIDE-only

## Détails techniques

- **Bibliothèque JWT** : `jose` (Web Crypto API natif, fonctionne dans le worker TanStack) — `bun add jose` côté portail et SI AIDE
- **Format URL** : `${SI_AIDE_URL}/sso?token=<jwt>` — token visible mais durée 60s + usage unique
- **Rotation du secret** : prévue, il suffira de mettre à jour `AIDE_SSO_SECRET` des deux côtés
- **Domaines accessibles** : pas besoin de configurer CORS car la route `/sso` est rendue côté SI AIDE puis appelle sa propre serverFn

## Gestion des rôles (validé : 100 % côté SI AIDE)

- À l'upsert de l'utilisateur dans SI AIDE, **aucun rôle n'est attribué automatiquement**
- L'admin SI AIDE gère ses rôles localement (interface existante)
- Si l'utilisateur n'a pas de rôle dans SI AIDE, il voit l'écran « accès non autorisé » classique — le SSO ne donne pas de droits par lui-même
- Conséquence : la première fois qu'un agent du portail clique sur AIDE, il sera loggé mais sans droits tant que l'admin SI AIDE ne lui en a pas attribué

## Ce qui n'est PAS dans ce plan

- Pas de migration des données SI AIDE vers le Supabase du portail
- Pas de synchro automatique des rôles portail ↔ SI AIDE
- Pas de logout cross-app (un logout sur le portail ne déconnecte pas SI AIDE)

## Livrables à la fin

1. Code modifié côté portail (3 fichiers + 1 nouvelle dépendance + 1 secret)
2. Un **prompt prêt à coller** dans le projet SI AIDE décrivant exactement les changements à y faire
3. Procédure de test : se connecter au portail, cliquer sur AIDE, vérifier qu'on arrive loggé avec le même e-mail
