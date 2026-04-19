import { useEffect, useState } from 'react';
import type { ExportData, Player } from './types';
import { enrichPlayers } from './utils';
import RankingTable from './components/RankingTable';
import RosterPage from './components/RosterPage';
import YearOverview from './components/YearOverview';
import AboutPage from './components/AboutPage';
import ComparePage from './components/ComparePage';
import NewsPage from './components/NewsPage';
import MatchesPage from './components/MatchesPage';
import { YEARS, type LeagueConfig, type SplitConfig } from './leagues';

type Page = 'overview' | 'rankings' | 'rosters' | 'compare' | 'matches' | 'news' | 'about';

function useExportData(league: LeagueConfig) {
  const [data, setData]       = useState<ExportData | null>(null);
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!league.available) { setData(null); setError(false); setLoading(false); return; }
    setData(null); setError(false); setLoading(true);
    fetch(`/leagues/${league.file}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: ExportData) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [league.id]);

  return { data, error, loading };
}

function findSplit(splits: SplitConfig[], id: string | null): SplitConfig | null {
  for (const s of splits) {
    if (s.id === id) return s;
    if (s.children) {
      const found = s.children.find(c => c.id === id);
      if (found) return found;
    }
  }
  return splits[0] ?? null;
}

function parentSplit(splits: SplitConfig[], id: string | null): SplitConfig | null {
  for (const s of splits) {
    if (s.id === id) return s;
    if (s.children?.some(c => c.id === id)) return s;
  }
  return splits[0] ?? null;
}

const PAGE_ICONS: Record<Page, string> = {
  overview: '◈',
  rankings: '▤',
  rosters:  '⊞',
  compare:  '⇄',
  matches:  '▶',
  news:     '◉',
  about:    '◎',
};

const PAGE_NUMS: Record<Page, string> = {
  overview: '1',
  rankings: '2',
  rosters:  '3',
  compare:  '4',
  matches:  '5',
  news:     '6',
  about:    '',
};

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') };
}

export default function App() {
  const { theme: currentTheme, toggle: toggleTheme } = useTheme();
  const [page, setPage]       = useState<Page>('overview');
  const [splitId, setSplitId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const defaultYear = YEARS[YEARS.length - 1];
  const [selection, setSelection] = useState({ year: defaultYear.year, leagueId: defaultYear.leagues[0].id });

  const yearConfig = YEARS.find(y => y.year === selection.year) ?? YEARS[0];
  const leagues    = yearConfig.leagues;
  const league     = leagues.find(l => l.id === selection.leagueId) ?? leagues[0];

  const { data, error, loading } = useExportData(league);

  const closeNav = () => setNavOpen(false);

  const handleSetYear = (y: number) => {
    const yc = YEARS.find(x => x.year === y) ?? YEARS[0];
    const sameLeague = yc.leagues.find(l => l.id.replace(/\d{4}$/, '') === league.id.replace(/\d{4}$/, '') && l.available);
    const newLeague = sameLeague ?? yc.leagues[0];
    const firstSplit = newLeague.splits?.[0];
    const firstLeafId = firstSplit?.children ? firstSplit.children[0].id : firstSplit?.id ?? null;
    setSelection({ year: y, leagueId: newLeague.id });
    setSplitId(firstLeafId);
    closeNav();
  };

  const handleSetLeague = (id: string) => {
    const newLeague = leagues.find(l => l.id === id) ?? leagues[0];
    const firstSplit = newLeague.splits?.[0];
    const firstLeafId = firstSplit?.children ? firstSplit.children[0].id : firstSplit?.id ?? null;
    setSelection(s => ({ ...s, leagueId: id }));
    setSplitId(firstLeafId);
    if (page === 'overview' || page === 'about') setPage('rankings');
    if (!newLeague.splits || newLeague.splits.length === 0) closeNav();
  };

  const mainTournament   = data?.metadata.tournaments[0];
  const activeSplit      = league.splits ? findSplit(league.splits, splitId) : null;
  const activeTournament = activeSplit?.tournament ?? mainTournament?.name;

  const rawPlayers: Player[] = data?.players ?? [];
  const players = enrichPlayers(rawPlayers, activeTournament);
  const teamLogos:    Record<string, string> = data?.teamLogos    ?? {};
  const playerImages: Record<string, string> = data?.playerImages ?? {};

  const pageTitle = page === 'overview'
    ? `${selection.year} Season`
    : page === 'about' ? 'Rating.GG'
    : page === 'compare' ? 'Compare'
    : page === 'matches' ? 'Matches'
    : page === 'news' ? 'News'
    : league.title;

  const pageEyebrow = page === 'overview'
    ? 'Year Overview'
    : page === 'rankings' ? 'Rankings'
    : page === 'rosters' ? 'Team Rosters'
    : page === 'compare' ? 'Player Comparison'
    : page === 'matches' ? 'Schedule & Results'
    : page === 'news' ? 'Latest News'
    : 'How it works';

  return (
    <div className="app-shell">

      {/* ── Mobile nav overlay ───────────────────── */}
      {navOpen && <div className="nav-overlay" onClick={closeNav} />}

      {/* ── Sidebar ──────────────────────────────── */}
      <nav className={`sidebar${navOpen ? ' sidebar--open' : ''}`}>

        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-brand">
            <div className="sidebar__logo-icon">
              <span>GG</span>
            </div>
            <div>
              <div className="sidebar__logo-title">
                RATING<span className="sidebar__logo-dot">.</span>GG
              </div>
              <div className="sidebar__logo-sub">Esports Rankings</div>
            </div>
          </div>
        </div>

        {/* Year selector */}
        <div className="sidebar__section">
          <div className="sidebar__section-label">Season</div>
          <div className="sidebar__year-row">
            {YEARS.map(y => (
              <button
                key={y.year}
                className={`year-btn${selection.year === y.year ? ' year-btn--active' : ''}`}
                onClick={() => handleSetYear(y.year)}
              >
                {y.year}
              </button>
            ))}
          </div>

          {/* Page nav */}
          <div className="sidebar__section-label" style={{ marginTop: 8 }}>Browse</div>
          <button
            className={`nav-item${page === 'overview' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('overview'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.overview}</span>
            <span className="nav-item__label">Overview</span>
            {PAGE_NUMS.overview && <span className="nav-item__num">{PAGE_NUMS.overview}</span>}
          </button>
          <button
            className={`nav-item${page === 'rankings' && league.available ? ' nav-item--active' : ''}${!league.available ? ' nav-item--disabled' : ''}`}
            onClick={() => { league.available && setPage('rankings'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.rankings}</span>
            <span className="nav-item__label">Rankings</span>
            {PAGE_NUMS.rankings && <span className="nav-item__num">{PAGE_NUMS.rankings}</span>}
          </button>
          <button
            className={`nav-item${page === 'rosters' && league.available ? ' nav-item--active' : ''}${!league.available ? ' nav-item--disabled' : ''}`}
            onClick={() => { league.available && setPage('rosters'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.rosters}</span>
            <span className="nav-item__label">Rosters</span>
            {PAGE_NUMS.rosters && <span className="nav-item__num">{PAGE_NUMS.rosters}</span>}
          </button>
          <button
            className={`nav-item${page === 'compare' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('compare'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.compare}</span>
            <span className="nav-item__label">Compare</span>
            {PAGE_NUMS.compare && <span className="nav-item__num">{PAGE_NUMS.compare}</span>}
          </button>
          <button
            className={`nav-item${page === 'matches' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('matches'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.matches}</span>
            <span className="nav-item__label">Matches</span>
            {PAGE_NUMS.matches && <span className="nav-item__num">{PAGE_NUMS.matches}</span>}
          </button>
          <button
            className={`nav-item${page === 'news' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('news'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.news}</span>
            <span className="nav-item__label">News</span>
            {PAGE_NUMS.news && <span className="nav-item__num">{PAGE_NUMS.news}</span>}
          </button>
          <button
            className={`nav-item${page === 'about' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('about'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.about}</span>
            <span className="nav-item__label">How it works</span>
          </button>
        </div>


        {/* Splits — shown whenever the selected league has splits */}
        {league.splits && league.splits.length > 0 && (
          <>
            <div className="sidebar__divider" />
            <div className="sidebar__splits">
              <div className="sidebar__splits-label">{league.label} Splits</div>
              {league.splits.map(s => {
                const activeParent = league.splits ? parentSplit(league.splits, splitId)?.id === s.id : false;
                const splitGames = data?.metadata.tournaments.find(t => t.name === s.tournament)?.totalGames;

                if (s.children && s.children.length > 0) {
                  return (
                    <div key={s.id} className="split-group">
                      {/* Parent button */}
                      <button
                        className={`split-btn split-btn--parent${activeParent ? ' split-btn--active' : ''}`}
                        onClick={() => setSplitId(s.children![0].id)}
                      >
                        <span>{s.label}</span>
                        <span className="split-btn__chevron" style={{ opacity: activeParent ? 1 : 0.4 }}>
                          {activeParent ? '▾' : '▸'}
                        </span>
                      </button>
                      {/* Children — shown only when parent is active */}
                      {activeParent && (
                        <div className="split-children">
                          {s.children.map(c => {
                            const childGames = data?.metadata.tournaments.find(t => t.name === c.tournament)?.totalGames;
                            return (
                              <button
                                key={c.id}
                                className={`split-btn split-btn--child${splitId === c.id ? ' split-btn--active' : ''}`}
                                onClick={() => { setSplitId(c.id); closeNav(); }}
                              >
                                <span>{c.label}</span>
                                {childGames != null && <span className="split-btn__games">{childGames}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={s.id}
                    className={`split-btn${activeParent ? ' split-btn--active' : ''}`}
                    onClick={() => { setSplitId(s.id); closeNav(); }}
                  >
                    <span>{s.label}</span>
                    {splitGames != null && <span className="split-btn__games">{splitGames}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="sidebar__footer">
          <div>Data · <strong className="sidebar__footer-source">gol.gg</strong></div>
        </div>
      </nav>

      {/* ── Main ─────────────────────────────────── */}
      <div className="main-content">

        {/* League top bar */}
        <div className="league-topbar">
          {leagues.map(l => (
            <button
              key={l.id}
              className={`league-tab${!l.available ? ' league-tab--disabled' : ''}${selection.leagueId === l.id && page !== 'overview' ? ' league-tab--active' : ''}`}
              onClick={() => l.available && handleSetLeague(l.id)}
            >
              {l.logo && <img src={l.logo} alt={l.label} className="league-tab__logo" />}
              <span className="league-tab__label">{l.label}</span>
              {l.region && <span className="league-tab__region">{l.region}</span>}
              {!l.available && <span className="league-tab__badge">SOON</span>}
              {error && selection.leagueId === l.id && <span className="league-tab__badge league-tab__badge--error">ERR</span>}
            </button>
          ))}
        </div>

        {/* Page header */}
        <div className="page-header">
          <button className="burger-btn" onClick={() => setNavOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            {league.logo && (page === 'rankings' || page === 'rosters') && (
              <img src={league.logo} alt={league.label} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div className="page-header__eyebrow">
                {(page === 'rankings' || page === 'rosters') && league.available
                  ? `${league.title} · ${pageEyebrow.toUpperCase()}`
                  : pageEyebrow.toUpperCase()
                }
              </div>
              <h1 className="page-header__title">
                {pageTitle.toUpperCase()}
                {page === 'rosters' && data && Object.keys(teamLogos).length > 0 && (
                  <span className="page-header__title-count"> · {Object.keys(teamLogos).length} Teams</span>
                )}
                {page === 'rankings' && data && players.length > 0 && (
                  <span className="page-header__title-count"> · {players.length} Players</span>
                )}
              </h1>
            </div>
          </div>
          <div className="page-header__actions">
            <button
              className="page-header__icon-btn"
              onClick={toggleTheme}
              aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={currentTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {currentTheme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>

        <main className="page">
          {page === 'matches' ? (
            <MatchesPage leagues={leagues} year={selection.year} selectedLeagueLabel={league.lolEsportsId ? league.label : null} />
          ) : page === 'news' ? (
            <NewsPage />
          ) : page === 'about' ? (
            <AboutPage />
          ) : page === 'compare' ? (
            <ComparePage />
          ) : page === 'overview' ? (
            <YearOverview yearConfig={yearConfig} onSelectLeague={handleSetLeague} />
          ) : !league.available ? (
            <div className="state-center">
              <div className="state-center__label">{league.label}</div>
              <div className="state-center__sub">Coming soon</div>
            </div>
          ) : loading ? (
            <div className="skeleton-table">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-row" style={{ opacity: 1 - i * 0.045 }} />
              ))}
            </div>
          ) : (
            <>
              {page === 'rankings' && (
                <RankingTable
                  players={players}
                  tournament={activeTournament}
                  tournamentName={activeSplit?.label ?? mainTournament?.name}
                  teamLogos={teamLogos}
                  playerImages={playerImages}
                />
              )}
              {page === 'rosters' && (
                <RosterPage players={players} tournament={activeTournament} teamLogos={teamLogos} playerImages={playerImages} leagueTitle={league.title} />
              )}
            </>
          )}

          <footer className="footer">
            <p>Data · <strong>gol.gg</strong> · LIR percentile rating by role</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
