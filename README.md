# Javeroo-Billeterie (V1 — Zone UEMOA)

Plateforme de billetterie événementielle **Web-First & Mobile Money** pour les 8 pays de la zone UEMOA (FCFA / XOF).

## Documentation projet
- Cahier des charges fonctionnel (non technique, PDF) : `docs/CAHIER_DES_CHARGES_FONCTIONNEL_JAVEROO.pdf`
- Cahier des charges & architecture technique : `docs/CAHIER_DES_CHARGES_ARCHITECTURE.md`

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Copier la configuration locale
cp .env.example .env.local

# 3. (Optionnel) Démarrer PostgreSQL 16 + Redis en local via Docker
docker compose up -d
npm run db:push
npm run db:seed

# 4. Lancer l'application en développement
npm run dev
```

L'application fonctionne également immédiatement en mode développement sans PostgreSQL grâce au jeu de données UEMOA local.

## Scripts utiles
- `npm run dev` — Serveur de développement Next.js (Turbopack)
- `npm run typecheck` — Vérification TypeScript stricte
- `npm run test` — Tests unitaires Vitest (tarification, QR cryptographique, référentiel UEMOA)
- `npm run build` — Build de production Next.js
- `npm run db:push` / `npm run db:seed` — Synchronisation et seed PostgreSQL (bloqué en production)

# Javeroo-Billieterie
