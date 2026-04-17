import { useEffect, useState } from 'react';
import type { ExportData, Player } from './types';
import { enrichPlayers } from './utils';
import RankingTable from './components/RankingTable';
import RosterPage from './components/RosterPage';
import YearOverview from './components/YearOverview';
import { YEARS, type LeagueConfig, type SplitConfig } from './leagues';

type Page = 'overview' | 'rankings' | 'rosters';

function useExportData(league: LeagueConfig) {
  const [data, setData]   = useState<ExportData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!league.available) { setData(null); setError(false); return; }
    setData(null); setError(false);
    fetch(`/leagues/${league.file}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: ExportData) => setData(d))
      .catch(() => setError(true));
  }, [league.id]);

  return { data, error };
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
};

export default function App() {
  const [page, setPage]       = useState<Page>('overview');
  const [splitId, setSplitId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const defaultYear = YEARS[YEARS.length - 1];
  const [selection, setSelection] = useState({ year: defaultYear.year, leagueId: defaultYear.leagues[0].id });

  const yearConfig = YEARS.find(y => y.year === selection.year) ?? YEARS[0];
  const leagues    = yearConfig.leagues;
  const league     = leagues.find(l => l.id === selection.leagueId) ?? leagues[0];

  const { data, error } = useExportData(league);

  const closeNav = () => setNavOpen(false);

  const handleSetYear = (y: number) => {
    const yc = YEARS.find(x => x.year === y) ?? YEARS[0];
    setSelection({ year: y, leagueId: yc.leagues[0].id });
    setSplitId(null);
    setPage('overview');
    closeNav();
  };

  const handleSetLeague = (id: string) => {
    setSelection(s => ({ ...s, leagueId: id }));
    setSplitId(null);
    setPage('rankings');
    closeNav();
  };

  const mainTournament   = data?.metadata.tournaments[0];
  const activeSplit      = league.splits ? findSplit(league.splits, splitId) : null;
  const activeTournament = activeSplit?.tournament ?? mainTournament?.name;

  const rawPlayers: Player[] = data?.players ?? [];
  const players = enrichPlayers(rawPlayers, activeTournament);

  const pageTitle = page === 'overview'
    ? `${selection.year} Season`
    : league.title;

  const pageEyebrow = page === 'overview'
    ? 'Year Overview'
    : page === 'rankings' ? 'Player Rankings' : 'Team Rosters';

  return (
    <div className="app-shell">

      {/* ── Mobile nav overlay ───────────────────── */}
      {navOpen && <div className="nav-overlay" onClick={closeNav} />}

      {/* ── Sidebar ──────────────────────────────── */}
      <nav className={`sidebar${navOpen ? ' sidebar--open' : ''}`}>

        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-title">
            LOL<span style={{ color: 'var(--accent)' }}>.</span>GG
          </div>
          <div className="sidebar__logo-sub">Esports Rankings</div>
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
          <div className="sidebar__section-label" style={{ marginTop: 8 }}>View</div>
          <button
            className={`nav-item${page === 'overview' ? ' nav-item--active' : ''}`}
            onClick={() => { setPage('overview'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.overview}</span>
            Overview
          </button>
          <button
            className={`nav-item${page === 'rankings' && league.available ? ' nav-item--active' : ''}${!league.available ? ' nav-item--disabled' : ''}`}
            onClick={() => { league.available && setPage('rankings'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.rankings}</span>
            Rankings
          </button>
          <button
            className={`nav-item${page === 'rosters' && league.available ? ' nav-item--active' : ''}${!league.available ? ' nav-item--disabled' : ''}`}
            onClick={() => { league.available && setPage('rosters'); closeNav(); }}
          >
            <span className="nav-item__icon">{PAGE_ICONS.rosters}</span>
            Rosters
          </button>
        </div>

        <div className="sidebar__divider" />

        {/* Leagues */}
        <div className="sidebar__section">
          <div className="sidebar__section-label">League</div>
          {leagues.map(l => (
            <button
              key={l.id}
              className={`nav-item${!l.available ? ' nav-item--disabled' : ''}${page !== 'overview' && selection.leagueId === l.id ? ' nav-item--active' : ''}`}
              onClick={() => l.available && handleSetLeague(l.id)}
            >
              <span className="nav-item__icon" style={{ fontSize: 11 }}>◆</span>
              {l.label}
              {!l.available && (
                <span className="nav-item__badge">SOON</span>
              )}
              {error && selection.leagueId === l.id && (
                <span className="nav-item__badge" style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,0.2)' }}>ERR</span>
              )}
            </button>
          ))}
        </div>

        {/* Splits — shown when a league is selected */}
        {page !== 'overview' && league.splits && league.splits.length > 0 && (
          <>
            <div className="sidebar__divider" />
            <div className="sidebar__splits">
              <div className="sidebar__splits-label">Split</div>
              {league.splits.map(s => {
                const activeParent = league.splits ? parentSplit(league.splits, splitId)?.id === s.id : false;

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
                          {s.children.map(c => (
                            <button
                              key={c.id}
                              className={`split-btn split-btn--child${splitId === c.id ? ' split-btn--active' : ''}`}
                              onClick={() => setSplitId(c.id)}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={s.id}
                    className={`split-btn${activeParent ? ' split-btn--active' : ''}`}
                    onClick={() => setSplitId(s.id)}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="sidebar__footer">
          <div>Data · <strong style={{ color: 'var(--text-3)' }}>gol.gg</strong></div>
          <div>LIR rating by role</div>
        </div>
      </nav>

      {/* ── Main ─────────────────────────────────── */}
      <div className="main-content">

        {/* Page header */}
        <div className="page-header">
          <button className="burger-btn" onClick={() => setNavOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <div>
            <div className="page-header__eyebrow">{pageEyebrow}</div>
            <h1 className="page-header__title">{pageTitle}</h1>
          </div>
        </div>

        <main className="page">
          {page === 'overview' ? (
            <YearOverview yearConfig={yearConfig} onSelectLeague={handleSetLeague} />
          ) : !league.available ? (
            <div className="state-center">
              <div className="state-center__label">{league.label}</div>
              <div className="state-center__sub">Coming soon</div>
            </div>
          ) : (
            <>
              {page === 'rankings' && (
                <RankingTable
                  players={players}
                  tournament={activeTournament}
                  tournamentName={activeSplit?.label ?? mainTournament?.name}
                />
              )}
              {page === 'rosters' && (
                <RosterPage players={players} tournament={activeTournament} />
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
