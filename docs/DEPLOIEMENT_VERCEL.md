# Guide de Déploiement sur Vercel — Javeroo-Billeterie (V1)

Ce projet est configuré pour un déploiement direct sur **Vercel** (`vercel.json` en région **Paris `cdg1`** pour une latence minimale vers l'Afrique de l'Ouest UEMOA).

---

## 1. Préparer le dépôt GitHub

Si ce n'est pas encore fait, poussez le projet sur un dépôt GitHub privé :

```bash
git init
git add .
git commit -m "feat: initial Javeroo-Billeterie V1 ready for Vercel"
git branch -M main
git remote add origin https://github.com/<votre-compte>/javeroo-billeterie.git
git push -u origin main
```

---

## 2. Importer le projet sur Vercel

1. Ouvrez [vercel.com/new](https://vercel.com/new) et importez le dépôt `javeroo-billeterie`.
2. Vercel détecte automatiquement **Next.js** (Build Command : `npm run build`, Output Directory : `.next`).
3. Avant de cliquer sur **Deploy**, ajoutez les variables d'environnement ci-dessous dans **Settings → Environment Variables**.

---

## 3. Variables d'environnement à configurer sur Vercel

### Indispensables (Sécurité & URL)

Générez deux clés aléatoires distinctes de 64 caractères hexadécimaux en terminal :
```bash
openssl rand -hex 32
openssl rand -hex 32
```

| Variable | Valeur recommandée | Obligatoire ? |
| :--- | :--- | :---: |
| `APP_ENV` | `production` | Oui |
| `NEXT_PUBLIC_APP_URL` | `https://votre-domaine.com` *(ou laissez vide : Vercel résout automatiquement `VERCEL_PROJECT_PRODUCTION_URL`)* | Recommandé |
| `SESSION_SECRET` | Clé générée (≥ 32 car.) | **Oui** |
| `TICKET_SIGNING_SECRET` | Autre clé générée (≥ 32 car.) | **Oui** |
| `CRON_SECRET` | Clé aléatoire pour protéger le cron `/api/internal/expire-holds` | **Oui** |
| `ENABLE_DEMO_ACCOUNTS` | `true` uniquement si vous déployez une démo ; **`false`** en vraie production | Optionnel |
| `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS` | Identique à `ENABLE_DEMO_ACCOUNTS` | Optionnel |

### Comptes SuperAdmin (Équipe Javeroo — accès `/admin`)

Pour créer des accès SuperAdmin sécurisés en production (sans activer les comptes de démo), ajoutez ces variables dans **Vercel → Settings → Environment Variables** (jusqu'à `SUPER_ADMIN_10_*`) :

| Variable | Exemple de valeur |
| :--- | :--- |
| `SUPER_ADMIN_1_NAME` | Votre nom (ex. `Kim — Direction Javeroo`) |
| `SUPER_ADMIN_1_EMAIL` | Votre adresse e-mail de connexion |
| `SUPER_ADMIN_1_PASSWORD` | Mot de passe fort (≥ 8 caractères) |
| `SUPER_ADMIN_2_NAME` | `Elvis Jethro` |
| `SUPER_ADMIN_2_EMAIL` | Adresse e-mail d'Elvis |
| `SUPER_ADMIN_2_PASSWORD` | Mot de passe fort d'Elvis (≥ 8 caractères) |

> **Astuce :** Vous pouvez aussi ajouter `SUPER_ADMIN_1_PHONE` / `SUPER_ADMIN_2_PHONE` pour autoriser la connexion par numéro WhatsApp. Dès la connexion sur `/connexion`, les comptes SuperAdmin sont automatiquement redirigés vers `/admin`.

### Base de données PostgreSQL managée (Neon / Supabase / Vercel Storage)

1. Dans Vercel → onglet **Storage** → créez une base **Neon Postgres** (ou branchez un projet **Supabase**).
2. Vérifiez que `DATABASE_URL` est bien présent dans les variables d'environnement (SSL activé automatiquement sur Vercel).
3. Depuis votre machine locale, synchronisez le schéma SQL vers votre base distante :
   ```bash
   DATABASE_URL="postgresql://..." npm run db:push
   ```

### Stockage des affiches événements (Vercel Blob)

Le système de fichiers serverless de Vercel est en lecture seule :
1. Dans Vercel → onglet **Storage** → créez un store **Vercel Blob** (public).
2. Vercel injecte automatiquement `BLOB_READ_WRITE_TOKEN` : les uploads d'affiches sur `/dashboard` basculent automatiquement sur le CDN mondial Vercel Blob (`Cache-Control: 1 an immutable`).

### Paiements Mobile Money UEMOA & Notifications (lors du passage en réel)

| Variable | Rôle |
| :--- | :--- |
| `PAYMENT_PROVIDER` | `sandbox` (démo), `cinetpay` ou `pawapay` |
| `PAYMENT_WEBHOOK_SECRET` | Secret HMAC webhook |
| `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY` | Si `PAYMENT_PROVIDER=cinetpay` — Webhook à déclarer : `https://<domaine>/api/webhooks/payments/cinetpay` |
| `PAWAPAY_API_TOKEN`, `PAWAPAY_API_URL` | Si `PAYMENT_PROVIDER=pawapay` — Webhook : `https://<domaine>/api/webhooks/payments/pawapay` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envoi des billets par e-mail |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Envoi des billets sur WhatsApp Cloud API |

---

## 4. Vérification juste après déploiement

1. Ouvrez `https://<votre-url-vercel>/api/health` et vérifiez :
   - `"status": "ok"`
   - `"region": "cdg1"`
   - `"secretsConfigured": true`
   - `"database": "connected"` (une fois Neon/Supabase branché)
   - `"storageDriver": "vercel_blob"` (une fois Vercel Blob activé)
2. Testez un parcours complet : `/evenements` → achat billet → téléchargement `/api/orders/[token]/pdf` → vérification sur `/scan`.
3. Mettez à jour vos coordonnées réelles (RCCM, IFU, WhatsApp, adresse) dans `src/config/site.ts` avant ouverture publique.

