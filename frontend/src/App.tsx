import { useEffect, useRef, useState, type JSX } from 'react';
import { useLang } from './i18n';
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

type ScrapeStatus = 'idle' | 'running' | 'done' | 'error';

function useScrape() {
  const [status, setStatus] = useState<ScrapeStatus>('idle');
  const [logs, setLogs]     = useState<string[]>([]);
  const esRef               = useRef<EventSource | null>(null);

  const run = () => {
    if (status === 'running') return;
    setStatus('running');
    setLogs([]);
    const es = new EventSource('http://localhost:3001/api/scrape');
    esRef.current = es;
    es.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'log')  setLogs(l => [...l, msg.text]);
      if (msg.type === 'done') { setStatus(msg.ok ? 'done' : 'error'); es.close(); }
    };
    es.onerror = () => { setStatus('error'); es.close(); };
  };

  const reset = () => { esRef.current?.close(); setStatus('idle'); setLogs([]); };

  return { status, logs, run, reset };
}

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

const NAV_ICONS: Record<Page, JSX.Element> = {
  overview: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>,
  rankings: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 11h2.5V6H1v5ZM5.75 11h2.5V3h-2.5v8ZM10.5 11H13V7.5h-2.5V11Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  rosters:  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="10.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M12 12c0-1.7-1.1-3.1-2.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  compare:  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5 12 5l-2.5 2.5M4.5 11.5 2 9l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 5H5a3 3 0 0 0 0 6M2 9h7a3 3 0 0 0 0-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  matches:  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5.5" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><rect x="7.5" y="1" width="5.5" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
  news:     <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5h6M4 7.5h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  about:    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 6.5v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
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
  const { lang, t, setLang } = useLang();
  const [page, setPage]       = useState<Page>('overview');
  const [splitId, setSplitId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const scrape = useScrape();
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
    ? t.season_label(selection.year)
    : page === 'about' ? 'Rating.GG'
    : page === 'compare' ? t.compare
    : page === 'matches' ? t.matches
    : page === 'news' ? t.news
    : league.title;

  const pageEyebrow = page === 'overview'
    ? t.yearOverview
    : page === 'rankings' ? t.rankings
    : page === 'rosters' ? t.teamRosters
    : page === 'compare' ? t.playerComparison
    : page === 'matches' ? t.scheduleResults
    : page === 'news' ? t.latestNews
    : t.howItWorks;

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
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M3 9h4v4H3zM3 3h4v4H3zM11 3h4v4h-4z" fill="white" fillOpacity="0.9"/>
                <path d="M11 9h4v2h-2v2h-2V9z" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <div>
              <div className="sidebar__logo-title">
                RATING<span className="sidebar__logo-dot">.</span>GG
              </div>
              <div className="sidebar__logo-sub">{t.esportsRankings}</div>
            </div>
          </div>
        </div>

        {/* Year selector */}
        <div className="sidebar__section">
          <div className="sidebar__section-label">{t.season}</div>
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
          <div className="sidebar__section-label" style={{ marginTop: 8 }}>{t.browse}</div>
          <button
            className={`nav-item${page === 'overview' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('overview'); closeNav(); }}
          >
            <span className="nav-item__icon">{NAV_ICONS.overview}</span>
            <span className="nav-item__label">{t.overview}</span>
            {PAGE_NUMS.overview && <span className="nav-item__num">{PAGE_NUMS.overview}</span>}
          </button>
          <button
            className={`nav-item${page === 'rankings' && league.available ? ' nav-item--active' : ''}${!league.available ? ' nav-item--disabled' : ''}`}
            onClick={() => { league.available && setPage('rankings'); closeNav(); }}
            aria-disabled={!league.available}
          >
            <span className="nav-item__icon">{NAV_ICONS.rankings}</span>
            <span className="nav-item__label">{t.rankings}</span>
            {PAGE_NUMS.rankings && <span className="nav-item__num">{PAGE_NUMS.rankings}</span>}
          </button>
          <button
            className={`nav-item${page === 'rosters' && league.available ? ' nav-item--active' : ''}${!league.available ? ' nav-item--disabled' : ''}`}
            onClick={() => { league.available && setPage('rosters'); closeNav(); }}
            aria-disabled={!league.available}
          >
            <span className="nav-item__icon">{NAV_ICONS.rosters}</span>
            <span className="nav-item__label">{t.rosters}</span>
            {PAGE_NUMS.rosters && <span className="nav-item__num">{PAGE_NUMS.rosters}</span>}
          </button>
          <button
            className={`nav-item${page === 'compare' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('compare'); closeNav(); }}
          >
            <span className="nav-item__icon">{NAV_ICONS.compare}</span>
            <span className="nav-item__label">{t.compare}</span>
            {PAGE_NUMS.compare && <span className="nav-item__num">{PAGE_NUMS.compare}</span>}
          </button>
          <button
            className={`nav-item${page === 'matches' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('matches'); closeNav(); }}
          >
            <span className="nav-item__icon">{NAV_ICONS.matches}</span>
            <span className="nav-item__label">{t.matches}</span>
            {PAGE_NUMS.matches && <span className="nav-item__num">{PAGE_NUMS.matches}</span>}
          </button>
          <button
            className={`nav-item${page === 'news' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('news'); closeNav(); }}
          >
            <span className="nav-item__icon">{NAV_ICONS.news}</span>
            <span className="nav-item__label">{t.news}</span>
            {PAGE_NUMS.news && <span className="nav-item__num">{PAGE_NUMS.news}</span>}
          </button>
          <button
            className={`nav-item${page === 'about' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('about'); closeNav(); }}
          >
            <span className="nav-item__icon">{NAV_ICONS.about}</span>
            <span className="nav-item__label">{t.howItWorks}</span>
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
                          {activeParent ? (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M3 1l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
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

          <button
            className={`scrape-btn scrape-btn--${scrape.status}`}
            disabled={scrape.status === 'running'}
            onClick={() => {
              if (scrape.status === 'idle' || scrape.status === 'error') {
                setLogsOpen(true);
                scrape.run();
              } else if (scrape.status === 'done') {
                scrape.reset();
                setLogsOpen(false);
              }
            }}
          >
            <span className="scrape-btn__dot" />
            <span className="scrape-btn__label">
              {scrape.status === 'running' ? 'Scraping…'
               : scrape.status === 'done'  ? 'Done — reset'
               : scrape.status === 'error' ? 'Error — retry'
               : 'Scrape 2026'}
            </span>
          </button>

          {(scrape.status === 'running' || scrape.status === 'done' || scrape.status === 'error') && scrape.logs.length > 0 && (
            <div className="scrape-logs">
              <button className="scrape-logs__toggle" onClick={() => setLogsOpen(o => !o)}>
                {logsOpen ? '▴ hide logs' : '▾ show logs'}
              </button>
              {logsOpen && (
                <div className="scrape-logs__body">
                  {scrape.logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </div>
          )}
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
            <div className="lang-toggle">
              {(['en', 'fr'] as const).map(l => (
                <button
                  key={l}
                  className={`lang-toggle__btn${lang === l ? ' lang-toggle__btn--active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              className="page-header__icon-btn"
              onClick={toggleTheme}
              aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={currentTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {currentTheme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
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
              <div className="state-center__sub">{t.comingSoon}</div>
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
            <span className="footer__item">Data · <strong>gol.gg</strong></span>
            <span className="footer__sep">·</span>
            <span className="footer__item">Schedule · <strong>lolesports.com</strong></span>
            <span className="footer__sep">·</span>
            <span className="footer__item footer__item--muted">Not affiliated with Riot Games</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
