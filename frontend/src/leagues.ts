export interface SplitConfig {
  id: string;
  label: string;
  tournament: string;   // key in player.tournaments
  children?: SplitConfig[]; // sub-selector dropdown
}

export interface LeagueConfig {
  id: string;
  label: string;       // shown in the league selector
  title: string;       // titre header (ex: "LCK 2026")
  file: string;        // chemin du JSON sous /leagues/
  available: boolean;  // false = "coming soon"
  logo?: string;       // chemin du logo sous /league-logos/
  region?: string;     // region tag shown in sidebar (e.g. KR, CN, EU)
  lolEsportsId?: string; // ID LoLesports pour l'API matches
  splits?: SplitConfig[];
}

export interface YearConfig {
  year: number;
  leagues: LeagueConfig[];
}

export const YEARS: YearConfig[] = [
  {
    year: 2025,
    leagues: [
      {
        id:        'lck-2025',
        label:     'LCK',
        title:     'LCK 2025',
        file:      '2025/lck-2025/export.json',
        available: true,
        logo:      '/league-logos/lck-2025.png',
        region:    'KR',
        lolEsportsId: '98767991310872058',
        splits: [
          { id: 'combined',  label: 'Combined',         tournament: 'LCK 2025'                  },
          { id: 'cup',       label: 'Cup',              tournament: 'LCK Cup 2025'              },
          { id: 'rounds12',  label: 'Rounds 1-2',       tournament: 'LCK 2025 Rounds 1-2'       },
          { id: 'roadtomsi', label: 'Road to MSI',      tournament: 'LCK 2025 Road to MSI'      },
          { id: 'rounds35',  label: 'Rounds 3-5',       tournament: 'LCK 2025 Rounds 3-5'       },
          { id: 'playin',    label: 'Play-In',          tournament: 'LCK 2025 Season Play-In'   },
          { id: 'playoffs',  label: 'Playoffs',         tournament: 'LCK 2025 Season Playoffs'  },
        ],
      },
      {
        id:        'lpl-2025',
        label:     'LPL',
        title:     'LPL 2025',
        file:      '2025/lpl-2025/export.json',
        available: true,
        logo:      '/league-logos/lpl-2025.png',
        region:    'CN',
        lolEsportsId: '98767991314006698',
        splits: [
          { id: 'combined', label: 'Combined', tournament: 'LPL 2025' },
          { id: 'split1', label: 'Split 1', tournament: 'LPL 2025 Split 1 Combined', children: [
            { id: 'split1comb', label: 'Combined', tournament: 'LPL 2025 Split 1 Combined' },
            { id: 'split1s',    label: 'Season',   tournament: 'LPL 2025 Split 1'          },
            { id: 'split1po',   label: 'Playoffs', tournament: 'LPL 2025 Split 1 Playoffs' },
          ]},
          { id: 'split2', label: 'Split 2', tournament: 'LPL 2025 Split 2 Combined', children: [
            { id: 'split2comb',  label: 'Combined',    tournament: 'LPL 2025 Split 2 Combined'    },
            { id: 'split2s',     label: 'Season',      tournament: 'LPL 2025 Split 2'             },
            { id: 'split2po',    label: 'Playoffs',    tournament: 'LPL 2025 Split 2 Playoffs'    },
            { id: 'split2place', label: 'Placements',  tournament: 'LPL 2025 Split 2 Placements'  },
          ]},
          { id: 'split3', label: 'Split 3', tournament: 'LPL 2025 Split 3 Combined', children: [
            { id: 'split3comb',  label: 'Combined',        tournament: 'LPL 2025 Split 3 Combined' },
            { id: 'split3s',     label: 'Season',          tournament: 'LPL 2025 Split 3'          },
            { id: 'regionals',   label: 'Regional Finals', tournament: 'LPL 2025 Regional Finals'  },
            { id: 'grandfinals', label: 'Grand Finals',    tournament: 'LPL 2025 Grand Finals'     },
          ]},
        ],
      },
      {
        id:        'lec-2025',
        label:     'LEC',
        title:     'LEC 2025',
        file:      '2025/lec-2025/export.json',
        available: true,
        logo:      '/league-logos/lec-2025.png',
        region:    'EU',
        lolEsportsId: '98767991302996019',
        splits: [
          { id: 'combined', label: 'Combined', tournament: 'LEC 2025' },
          { id: 'winter', label: 'Winter', tournament: 'LEC 2025 Winter', children: [
            { id: 'winter',   label: 'Combined', tournament: 'LEC 2025 Winter'          },
            { id: 'winterS',  label: 'Season',   tournament: 'LEC Winter 2025'          },
            { id: 'winterPO', label: 'Playoffs', tournament: 'LEC 2025 Winter Playoffs' },
          ]},
          { id: 'spring', label: 'Spring', tournament: 'LEC 2025 Spring', children: [
            { id: 'spring',   label: 'Combined', tournament: 'LEC 2025 Spring'          },
            { id: 'springS',  label: 'Season',   tournament: 'LEC 2025 Spring Season'   },
            { id: 'springPO', label: 'Playoffs', tournament: 'LEC 2025 Spring Playoffs' },
          ]},
          { id: 'summer', label: 'Summer', tournament: 'LEC 2025 Summer', children: [
            { id: 'summer',   label: 'Combined', tournament: 'LEC 2025 Summer'          },
            { id: 'summerS',  label: 'Season',   tournament: 'LEC 2025 Summer Season'   },
            { id: 'summerPO', label: 'Playoffs', tournament: 'LEC 2025 Summer Playoffs' },
          ]},
        ],
      },
      {
        id:        'lfl-2025',
        label:     'LFL',
        title:     'LFL 2025',
        file:      '2025/lfl-2025/export.json',
        available: true,
        logo:      '/league-logos/lfl-2025.png',
        region:    'FR',
        lolEsportsId: '105266103462388553',
        splits: [
          { id: 'combined', label: 'Combined', tournament: 'LFL 2025' },
          { id: 'spring', label: 'Spring', tournament: 'LFL 2025 Spring', children: [
            { id: 'spring',   label: 'Combined', tournament: 'LFL 2025 Spring'          },
            { id: 'springS',  label: 'Season',   tournament: 'LFL 2025 Spring Split'    },
            { id: 'springPO', label: 'Playoffs', tournament: 'LFL 2025 Spring Playoffs' },
          ]},
          { id: 'summer', label: 'Summer', tournament: 'LFL 2025 Summer', children: [
            { id: 'summer',   label: 'Combined', tournament: 'LFL 2025 Summer'          },
            { id: 'summerS',  label: 'Season',   tournament: 'LFL 2025 Summer Split'    },
            { id: 'summerPO', label: 'Playoffs', tournament: 'LFL 2025 Summer Playoffs' },
          ]},
        ],
      },
      {
        id:        'first-stand-2025',
        label:     'First Stand',
        title:     'First Stand 2025',
        file:      '2025/first-stand-2025/export.json',
        available: true,
        logo:      '/league-logos/first-stand-2025.png',
        region:    'INT',
        lolEsportsId: '113464388705111224',
      },
      {
        id:        'msi-2025',
        label:     'MSI',
        title:     'MSI 2025',
        file:      '2025/msi-2025/export.json',
        available: true,
        logo:      '/league-logos/msi-2025.png',
        region:    'INT',
        lolEsportsId: '98767991325878492',
      },
      {
        id:        'worlds-2025',
        label:     'Worlds',
        title:     'Worlds 2025',
        file:      '2025/worlds-2025/export.json',
        available: true,
        logo:      '/league-logos/worlds-2025.png',
        region:    'INT',
        lolEsportsId: '98767975604431411',
        splits: [
          { id: 'combined', label: 'Combined',   tournament: 'Worlds 2025'            },
          { id: 'playin',   label: 'Play-In',    tournament: 'Worlds 2025 Play-In'    },
          { id: 'main',     label: 'Main Event', tournament: 'Worlds 2025 Main Event' },
        ],
      },
    ],
  },
  {
    year: 2026,
    leagues: [
      {
        id:        'lck-2026',
        label:     'LCK',
        title:     'LCK 2026',
        file:      '2026/lck-2026/export.json',
        available: true,
        logo:      '/league-logos/lck-2026.png',
        region:    'KR',
        lolEsportsId: '98767991310872058',
        splits: [
          { id: 'combined', label: 'Combined',   tournament: 'LCK 2026'              },
          { id: 'cup',      label: 'Cup',        tournament: 'LCK Cup 2026'          },
          { id: 'rounds',   label: 'Rounds 1-2', tournament: 'LCK 2026 Rounds 1-2'  },
        ],
      },
      {
        id:        'lpl-2026',
        label:     'LPL',
        title:     'LPL 2026',
        file:      '2026/lpl-2026/export.json',
        available: true,
        logo:      '/league-logos/lpl-2026.png',
        region:    'CN',
        lolEsportsId: '98767991314006698',
        splits: [
          { id: 'combined', label: 'Combined', tournament: 'LPL 2026' },
          { id: 'split1', label: 'Split 1', tournament: 'LPL 2026 Split 1 Combined', children: [
            { id: 'split1comb', label: 'Combined', tournament: 'LPL 2026 Split 1 Combined' },
            { id: 'split1s',    label: 'Season',   tournament: 'LPL 2026 Split 1'          },
            { id: 'split1po',   label: 'Playoffs', tournament: 'LPL 2026 Split 1 Playoffs' },
          ]},
          { id: 'split2', label: 'Split 2', tournament: 'LPL 2026 Split 2' },
        ],
      },
      {
        id:        'lec-2026',
        label:     'LEC',
        title:     'LEC 2026',
        file:      '2026/lec-2026/export.json',
        available: true,
        logo:      '/league-logos/lec-2026.png',
        region:    'EU',
        lolEsportsId: '98767991302996019',
        splits: [
          { id: 'combined', label: 'Combined',      tournament: 'LEC Versus 2026' },
          { id: 'versus',   label: 'Versus',        tournament: 'LEC 2026 Versus', children: [
            { id: 'versus',       label: 'Combined',  tournament: 'LEC 2026 Versus'          },
            { id: 'versusSeason', label: 'Season',    tournament: 'LEC 2026 Versus Season'   },
            { id: 'playoffs',     label: 'Playoffs',  tournament: 'LEC 2026 Versus Playoffs' },
          ]},
          { id: 'spring', label: 'Spring Season', tournament: 'LEC 2026 Spring Season' },
        ],
      },
      {
        id:        'lcs-2026',
        label:     'LCS',
        title:     'LCS 2026',
        file:      '2026/lcs-2026/export.json',
        available: true,
        logo:      '/league-logos/lcs-2026.png',
        region:    'NA',
        lolEsportsId: '98767991299243165',
        splits: [
          { id: 'combined', label: 'Combined', tournament: 'LCS 2026'         },
          { id: 'lockin',   label: 'Lock-In',  tournament: 'LCS 2026 Lock-In' },
          { id: 'spring',   label: 'Spring',   tournament: 'LCS 2026 Spring'  },
        ],
      },
      {
        id:        'lfl-2026',
        label:     'LFL',
        title:     'LFL 2026',
        file:      '2026/lfl-2026/export.json',
        available: true,
        logo:      '/league-logos/lfl-2026.png',
        region:    'FR',
        lolEsportsId: '105266103462388553',
        splits: [
          { id: 'combined',     label: 'Combined',     tournament: 'LFL 2026'              },
          { id: 'spring',       label: 'Spring Split', tournament: 'LFL 2026 Spring Split' },
          { id: 'invitational', label: 'Invitational', tournament: 'LFL 2026 Invitational' },
        ],
      },
      {
        id:        'first-stand-2026',
        label:     'First Stand',
        title:     'First Stand 2026',
        file:      '2026/first-stand-2026/export.json',
        available: true,
        logo:      '/league-logos/first-stand-2026.png',
        region:    'INT',
        lolEsportsId: '113464388705111224',
      },
    ],
  },
];

