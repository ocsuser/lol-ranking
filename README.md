# lol-rating

Système de ranking de joueurs professionnels League of Legends, inspiré de HLTV pour CS:GO.

Ligues supportées : **LCK**, **LPL**, **LEC**, **LCS**, **First Stand**, **MSI**, **Worlds** — saisons 2025 et 2026.

## Stack

- **Scraper** — Node.js + TypeScript, source : [gol.gg](https://gol.gg)
- **Frontend** — React + Vite 5
- **Rating** — LIR (LoL Impact Rating) : note sur 100 basée sur des percentiles par rôle

## Lancer l'application

```bash
npm run dev
```

Lance le frontend sur http://localhost:5173. Pour mettre à jour les données, utiliser `npm run scrape` séparément.

## Commandes disponibles

```bash
npm run dev          # lance le frontend sur http://localhost:5173
npm run scrape       # lance tous les scrapers (2025 + 2026)
npm run scrape:2026  # scrapers 2026 uniquement
npm run scrape:2025  # scrapers 2025 uniquement
```

Pour détecter de nouveaux tournois sur gol.gg :

```bash
npx tsx leagues/detect.ts             # saison S16 (défaut)
npx tsx leagues/detect.ts --season S15  # saison 2025
npx tsx leagues/detect.ts --all       # sans filtre de ligue
```

## Ajouter une ligue

1. Créer `leagues/<année>/<id>/scrape.ts` en s'inspirant d'un scraper existant
2. Définir `SPLITS` (tournois gol.gg) et `COMBINED_NAME`
3. Ajouter la ligue dans `frontend/src/leagues.ts`
4. Créer le dossier de sortie : `frontend/public/leagues/<id>/`
5. Lancer `npx tsx leagues/<année>/<id>/scrape.ts`

## Système de rating (LIR)

### Principe

Chaque stat est convertie en **percentile (0–100)** parmi les joueurs du même rôle — pas de z-score, pas de scaling arbitraire. Un percentile de 80 signifie "ce joueur fait mieux que 80% des joueurs à son poste". La moyenne de tous les joueurs est toujours ~50.

```
percentile(valeur) = (joueurs_en_dessous + égaux × 0.5) / total × 100
```

Pour les stats où moins = mieux (morts), le percentile est inversé : `100 - percentile(deaths)`.

---

### Les 4 piliers

**Laning** — domination en early game
```
laning = (pct(GD@15) + pct(CSD@15) + pct(XPD@15)) / 3
```
- GD@15 : différentiel d'or à 15 min
- CSD@15 : différentiel de CS à 15 min
- XPD@15 : différentiel d'XP à 15 min

**Damage** — production de dégâts
```
damage = 0.6 × pct(DPM) + 0.4 × pct(DMG% / Gold%)
```
- DPM : dégâts par minute (volume brut)
- DMG%/Gold% : efficacité des dégâts par rapport aux ressources consommées

**Presence** — implication dans le jeu
```
presence = pct(KP%)
```
- KP% : participation aux kills de l'équipe

**Efficiency** — solidité individuelle
```
efficiency (non-SUP) = 0.35 × pct_inv(Deaths) + 0.35 × pct(KDA) + 0.3 × pct(CSM)
efficiency (SUP)     = 0.5  × pct_inv(Deaths) + 0.5  × pct(KDA)
```
- Deaths : inversé (mourir peu = bon score)
- KDA : ratio kills+assists/deaths
- CSM : CS par minute (supprimé pour les supports)

---

### Poids par rôle

| Rôle | Laning | Damage | Presence | Efficiency |
|------|--------|--------|----------|------------|
| TOP  | 35%    | 30%    | 10%      | 25%        |
| JGL  | 15%    | 20%    | 35%      | 30%        |
| MID  | 25%    | 30%    | 20%      | 25%        |
| BOT  | 25%    | 35%    | 15%      | 25%        |
| SUP  | 15%    | 10%    | 40%      | 35%        |

```
rating_brut = wL×laning + wD×damage + wP×presence + wE×efficiency
```

---

### Facteur de confiance

Un joueur avec peu de games est ramené vers 50 :

```
rating_final = 50 + (rating_brut - 50) × min(1, games / médiane_games)
```

Exemple : un joueur à 80 de rating brut avec la moitié des games du médian → `50 + (80-50) × 0.5 = 65`.

---

### Interprétation

| Plage  | Niveau        |
|--------|---------------|
| 75–100 | Élite         |
| 60–75  | Très bon      |
| 45–60  | Moyen         |
| 25–45  | En difficulté |
| 0–25   | Faible        |
