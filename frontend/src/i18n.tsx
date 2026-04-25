import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'fr' | 'en';

export const T = {
  en: {
    // Sidebar
    season: 'Season',
    browse: 'Browse',
    esportsRankings: 'Esports Rankings',
    dataSource: 'Data',
    // Nav
    overview: 'Overview',
    rankings: 'Rankings',
    rosters: 'Rosters',
    compare: 'Compare',
    matches: 'Matches',
    news: 'News',
    howItWorks: 'How it works',
    // Page headers
    yearOverview: 'Year Overview',
    teamRosters: 'Team Rosters',
    playerComparison: 'Player Comparison',
    scheduleResults: 'Schedule & Results',
    latestNews: 'Latest News',
    season_label: (y: number) => `${y} Season`,
    // States
    comingSoon: 'Coming soon',
    noArticles: 'No articles — run npm run news to fetch',
    // RankingTable
    searchPlaceholder: 'Search player or team…',
    teams: 'Teams',
    all: 'All',
    players: (n: number, t?: string) => `${n} player${n !== 1 ? 's' : ''}${t ? ` · ${t}` : ''}`,
    // MatchesPage
    upcoming: 'Upcoming',
    results: 'Results',
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
    noMatches: 'No matches',
    // NewsPage
    articlesCount: (n: number) => `${n} article${n !== 1 ? 's' : ''} · Team-AAA`,
    refreshLabel: 'Refresh',
    // ComparePage
    selectTwoPlayers: 'Select two players to compare',
    selectTwoSub: 'Use the selectors on each side',
    selectPlayer: 'Select a player…',
    noPlayersFound: 'No players found',
    crossLeagueNote: 'LIR ratings are percentile-based within each league — cross-league comparison reflects raw stats',
    // Footer
    notAffiliated: 'Not affiliated with Riot Games',
  },
  fr: {
    // Sidebar
    season: 'Saison',
    browse: 'Navigation',
    esportsRankings: 'Classements Esports',
    dataSource: 'Données',
    // Nav
    overview: 'Vue d\'ensemble',
    rankings: 'Classements',
    rosters: 'Effectifs',
    compare: 'Comparer',
    matches: 'Matchs',
    news: 'Actualités',
    howItWorks: 'Comment ça marche',
    // Page headers
    yearOverview: 'Vue d\'ensemble',
    teamRosters: 'Effectifs des équipes',
    playerComparison: 'Comparaison de joueurs',
    scheduleResults: 'Calendrier & Résultats',
    latestNews: 'Dernières actualités',
    season_label: (y: number) => `Saison ${y}`,
    // States
    comingSoon: 'Bientôt disponible',
    noArticles: 'Aucun article — lancez npm run news',
    // RankingTable
    searchPlaceholder: 'Rechercher un joueur ou une équipe…',
    teams: 'Équipes',
    all: 'Tous',
    players: (n: number, t?: string) => `${n} joueur${n !== 1 ? 's' : ''}${t ? ` · ${t}` : ''}`,
    // MatchesPage
    upcoming: 'À venir',
    results: 'Résultats',
    today: 'Aujourd\'hui',
    tomorrow: 'Demain',
    yesterday: 'Hier',
    noMatches: 'Aucun match',
    // NewsPage
    articlesCount: (n: number) => `${n} article${n !== 1 ? 's' : ''} · Team-AAA`,
    refreshLabel: 'Actualiser',
    // ComparePage
    selectTwoPlayers: 'Sélectionnez deux joueurs à comparer',
    selectTwoSub: 'Utilisez les sélecteurs de chaque côté',
    selectPlayer: 'Sélectionner un joueur…',
    noPlayersFound: 'Aucun joueur trouvé',
    crossLeagueNote: 'Les ratings LIR sont des percentiles par ligue — la comparaison inter-ligues reflète les stats brutes',
    // Footer
    notAffiliated: 'Non affilié à Riot Games',
  },
} as const;

type Translations = typeof T['en'] | typeof T['fr'];
interface LangCtx { lang: Lang; t: Translations; setLang: (l: Lang) => void; }
const LangContext = createContext<LangCtx>({ lang: 'en', t: T.en, setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = (localStorage.getItem('lang') as Lang) ?? 'en';
    document.documentElement.lang = saved;
    return saved;
  });
  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('lang', l);
    document.documentElement.lang = l;
  }
  return (
    <LangContext.Provider value={{ lang, t: T[lang], setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() { return useContext(LangContext); }
