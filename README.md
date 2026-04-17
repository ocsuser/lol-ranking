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
npm run scrape       # scrapers 2026 (LCK, LPL, LEC, LCS, First Stand)
npm run scrape:2026  # scrapers 2026 uniquement
npm run scrape:2025  # scrapers 2025 (LCK, LPL, LEC, First Stand, MSI, Worlds)
npm run logos        # télécharge les logos d'équipe depuis l'API Lolesports
```

Pour détecter de nouveaux tournois sur gol.gg :

```bash
npx tsx leagues/detect.ts             # saison S16 (défaut)
npx tsx leagues/detect.ts --season S15  # saison 2025
npx tsx leagues/detect.ts --all       # sans filtre de ligue
```

## Ajouter une ligue

Guide complet pour ajouter une nouvelle ligue (ex : `lcs-2025`).

---

### Étape 1 — Trouver les tournois sur gol.gg

Lance le détecteur pour repérer les noms exacts de tournois disponibles :

```bash
npx tsx leagues/detect.ts             # saison S16 (2026, défaut)
npx tsx leagues/detect.ts --season S15  # saison 2025
npx tsx leagues/detect.ts --all       # sans filtre de ligue
```

Note les noms exacts affichés (ex : `"LCS 2025 Spring"`, `"LCS 2025 Playoffs"`). Ces noms seront utilisés dans `SPLITS` et dans `frontend/src/leagues.ts`.

---

### Étape 2 — Créer le scraper

Crée le fichier `leagues/<année>/<id>/scrape.ts` en copiant un scraper existant :

```bash
cp -r leagues/2026/lck-2026 leagues/2025/lcs-2025
# renommer le fichier scrape.ts et l'adapter
```

Modifie les variables en haut du fichier :

```ts
const SPLITS = [
  { key: 'spring',   name: 'LCS 2025 Spring',   season: 'ALL' },
  { key: 'playoffs', name: 'LCS 2025 Playoffs',  season: 'ALL' },
  // ajoute autant de splits que nécessaire
];
const COMBINED_NAME = 'LCS 2025'; // nom du tournoi "combiné" (tous splits fusionnés)
```

> `key` : identifiant court libre (sera utilisé en interne).  
> `name` : nom **exact** du tournoi sur gol.gg (copier-coller depuis l'étape 1).  
> `COMBINED_NAME` : nom du tournoi virtuel qui agrège tous les splits.

Le scraper utilise un `roleMap` **par split** (et non global) pour que les joueurs ayant changé d'équipe en cours de saison conservent le bon team par période.

Dans la section export, chaque entrée `tournaments` doit inclure le champ `team` issu du split correspondant :

```ts
for (const split of SPLITS) {
  if (p.rows[split.key]) {
    tournaments[split.name] = {
      ...toStats(p.rows[split.key]),
      team: p.rows[split.key].team,
      ...(p[`lir_${split.key}`] ?? {}),
    };
  }
}
```

Pour les combinés (ex. Split 1 + Playoffs), le `team` vient du split le plus récent :

```ts
const s1team = p.rows.split1po?.team || p.rows.split1?.team || '';
tournaments['LCS 2025 Split 1 Combined'] = {
  ...toStats(p.split1Combined), team: s1team, ...(p.lirSplit1Combined ?? {})
};
```

Mets aussi à jour le chemin de sortie en bas du fichier :

```ts
fs.writeFileSync(
  path.join(__dirname, '../../../frontend/public/leagues/lcs-2025/export.json'),
  JSON.stringify(exportData, null, 2)
);
```

---

### Étape 3 — Créer le dossier de sortie

```bash
mkdir frontend/public/leagues/lcs-2025
```

---

### Étape 4 — Lancer le scraper

```bash
npx tsx leagues/2025/lcs-2025/scrape.ts
```

Le scraper affiche sa progression équipe par équipe. À la fin, vérifie que `frontend/public/leagues/lcs-2025/export.json` a bien été créé.

---

### Étape 5 — Déclarer la ligue dans le frontend

Ouvre `frontend/src/leagues.ts` et ajoute la ligue dans le bon bloc `year` :

```ts
{
  id:        'lcs-2025',
  label:     'LCS',           // affiché dans la sidebar
  title:     'LCS 2025',      // titre de la page
  file:      'lcs-2025/export.json',
  available: true,
  splits: [
    // "Combined" agrège tous les splits — son tournament = COMBINED_NAME du scraper
    { id: 'combined', label: 'Combined', tournament: 'LCS 2025' },
    // Un split par entrée dans SPLITS du scraper
    { id: 'spring',   label: 'Spring',   tournament: 'LCS 2025 Spring'   },
    { id: 'playoffs', label: 'Playoffs', tournament: 'LCS 2025 Playoffs' },
  ],
},
```

> Le champ `tournament` doit correspondre **exactement** à la clé utilisée dans `tournaments` du JSON exporté (= le `name` du split dans le scraper, ou `COMBINED_NAME`).

Pour grouper des splits avec un menu déroulant hiérarchique, utilise `children` :

```ts
{ id: 'spring', label: 'Spring', tournament: 'LCS 2025 Spring', children: [
  { id: 'spring',   label: 'Saison',   tournament: 'LCS 2025 Spring'   },
  { id: 'playoffs', label: 'Playoffs', tournament: 'LCS 2025 Playoffs' },
]},
```

---

### Étape 6 — Ajouter le script npm (optionnel)

Dans `package.json`, ajoute le scraper à `scrape:2025` (ou `scrape:2026`) :

```json
"scrape:2025": "... && tsx leagues/2025/lcs-2025/scrape.ts"
```

Puis lance `npm run logos` pour télécharger les logos de la nouvelle ligue :

```bash
npm run logos
```

---

### Étape 7 — Vérifier

```bash
npm run dev
```

La ligue doit apparaître dans la sidebar. Clique dessus et vérifie que les joueurs s'affichent correctement dans Rankings et Rosters.

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
