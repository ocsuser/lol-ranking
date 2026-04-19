import { useRef, useState } from 'react';
import type { Player, Role, TournamentStats } from '../types';
import { fmt, fmtSign, getPlayerStats } from '../utils';
import RoleTag from './RoleTag';
import PlayerModal from './PlayerModal';
import TeamRankingsPage from './TeamRankingsPage';
import { useLang } from '../i18n';

type SortKey = 'rating' | keyof TournamentStats | 'name';

const COL_TIPS: Partial<Record<SortKey, string>> = {
  rating:     'LIR — LoL Impact Rating. Percentile score (0–100) based on role-specific weighted stats.',
  games:      'Games played in this tournament/split.',
  winRate:    'Win rate % across all games.',
  kda:        'Kill/Death/Assist ratio. (K+A) / D.',
  avgKills:   'Average kills per game.',
  avgDeaths:  'Average deaths per game.',
  avgAssists: 'Average assists per game.',
  kp:         'Kill Participation % — share of team kills the player was involved in.',
  dpm:        'Damage Per Minute dealt to champions.',
  csm:        'Creep Score per Minute (minions + monsters).',
  gpm:        'Gold earned Per Minute.',
  gd15:       'Gold Difference at 15 minutes vs lane opponent.',
  csd15:      'CS Difference at 15 minutes vs lane opponent.',
};

const ROLES: Role[] = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];
const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JGL: 'Jungle', MID: 'Mid', BOT: 'Bot', SUP: 'Support' };

// Une seule source de vérité pour les largeurs de colonnes
const GRID = '44px 165px 90px 72px 72px 86px 72px 72px 72px 72px 86px 72px 72px 80px 86px';
//            #    PLAYER LIR  G    W%   KDA  K    D    A    KP%  DPM  CSM  GPM  GD15 CSD15

function kdaClass(kda: number) {
  if (kda >= 5) return 'val--kda-high';
  if (kda >= 3) return 'val--kda-mid';
  return 'val--kda-low';
}

function winClass(wr: number) {
  if (wr >= 60) return 'val--win-high';
  if (wr >= 45) return 'val--win-mid';
  return 'val--win-low';
}

function diffClass(val: number) {
  if (val > 50) return 'val--positive';
  if (val < -50) return 'val--negative';
  return 'val--muted';
}

function rankClass(i: number) {
  if (i < 3)  return 'rank-num rank-num--top3';
  if (i < 10) return 'rank-num rank-num--top10';
  return 'rank-num rank-num--rest';
}

function ratingClass(r: number) {
  if (r >= 70) return 'rating-cell rating-cell--high';
  if (r >= 55) return 'rating-cell rating-cell--mid';
  return 'rating-cell rating-cell--low';
}

function ratingBarClass(r: number) {
  if (r >= 70) return 'rating-bar rating-bar--high';
  if (r >= 55) return 'rating-bar rating-bar--mid';
  return 'rating-bar rating-bar--low';
}

// Cellule de base : padding identique header & data
const CELL_PAD = '0 8px';

type View = 'TEAMS' | Role | 'ALL';

interface Props {
  players: Player[];
  tournament?: string;
  tournamentName?: string;
  teamLogos?: Record<string, string>;
  playerImages?: Record<string, string>;
}

export default function RankingTable({ players, tournament, tournamentName, teamLogos = {}, playerImages = {} }: Props) {
  const { t } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledEnd, setScrolledEnd] = useState(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScrolledEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  const [view, setView]         = useState<View>('TEAMS');
  const role: Role | 'ALL'      = view === 'TEAMS' ? 'ALL' : view;
  const [sortKey, setSortKey]   = useState<SortKey>('rating');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Player | null>(null);
  const [search, setSearch]     = useState('');

  if (view === 'TEAMS') {
    return (
      <>
        <div className="ranking-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div className="filters" style={{ marginBottom: 0 }}>
            <button className="filter-btn filter-btn--active" onClick={() => {}}>{t.teams}</button>
            <button className="filter-btn" onClick={() => setView('ALL')}>{t.all}</button>
            {ROLES.map(r => (
              <button key={r} className={`filter-btn filter-btn--${r.toLowerCase()}`} onClick={() => setView(r)}>{ROLE_LABEL[r]}</button>
            ))}
          </div>
        </div>
        <TeamRankingsPage players={players} tournament={tournament} teamLogos={teamLogos} leagueTitle={tournamentName} />
      </>
    );
  }

  const effectiveRating = (p: Player): number | undefined => {
    if (tournament) {
      const t = p.tournaments[tournament];
      if (t?.rating !== undefined) return t.rating;
    }
    return p.rating;
  };

  const filtered = players
    .filter(p => role === 'ALL' || p.role === role)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.team.toLowerCase().includes(search.toLowerCase()))
    .map(p => ({ p, stats: getPlayerStats(p, tournament) }))
    .filter(({ stats }) => !tournament || stats !== null)
    .sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sortKey === 'rating')    { va = effectiveRating(a.p) ?? 0; vb = effectiveRating(b.p) ?? 0; }
      else if (sortKey === 'name') { va = a.p.name; vb = b.p.name; }
      else {
        va = (a.stats?.[sortKey as keyof TournamentStats] as number) ?? -999;
        vb = (b.stats?.[sortKey as keyof TournamentStats] as number) ?? -999;
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Style partagé pour une ligne de grille (header ou data)
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: GRID,
    alignItems: 'center',
  };

  // Style d'une cellule numérique (text-align right)
  const numCell: React.CSSProperties = {
    padding: CELL_PAD,
    textAlign: 'right',
    fontFamily: 'var(--font-mono)',
    fontSize: 16,
  };

  const numHead = (key: SortKey): React.CSSProperties => ({
    padding: CELL_PAD,
    textAlign: 'right',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: sortKey === key ? 'var(--accent)' : 'var(--text-3)',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
    position: 'relative' as const,
  });

  const sortIcon = (key: SortKey) => (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ marginLeft: 3, opacity: sortKey === key ? 1 : 0.18, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      {sortKey === key && sortDir === 'asc'
        ? <path d="M4 1L7 6H1L4 1Z" fill="currentColor"/>
        : <path d="M4 7L1 2H7L4 7Z" fill="currentColor"/>
      }
    </svg>
  );

  return (
    <>
      {/* ── Toolbar ───────────────────────────── */}
      <div className="ranking-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div className="filters" style={{ marginBottom: 0 }}>
          <button className="filter-btn" onClick={() => setView('TEAMS')}>{t.teams}</button>
          <button className={`filter-btn ${view === 'ALL' ? 'filter-btn--active' : ''}`} onClick={() => setView('ALL')}>{t.all}</button>
          {ROLES.map(r => (
            <button
              key={r}
              className={`filter-btn filter-btn--${r.toLowerCase()} ${view === r ? 'filter-btn--active' : ''}`}
              onClick={() => setView(r)}
            >{ROLE_LABEL[r]}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            className="search-input"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            {t.players(filtered.length, tournamentName)}
          </span>
        </div>
      </div>

      {/* ── Grid table ────────────────────────── */}
      <div className={`scroll-fade-wrap${scrolledEnd ? ' scrolled-end' : ''}`}>
        <div ref={scrollRef} style={{ overflowX: 'auto' }} onScroll={handleScroll}>
        <div className="ranking-grid" style={{ minWidth: 960 }}>

          {/* ── Header ── */}
          <div className="ranking-grid__head" style={rowStyle}>
            {/* # */}
            <div style={{ padding: CELL_PAD, textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>#</div>
            {/* PLAYER */}
            <div style={{ padding: CELL_PAD, textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Player</div>
            {/* RATING */}
            <div style={numHead('rating')} onClick={() => toggleSort('rating')} title={COL_TIPS.rating}>RATING{sortIcon('rating')}</div>
            {/* G */}
            <div style={numHead('games')} onClick={() => toggleSort('games')} title={COL_TIPS.games}>G{sortIcon('games')}</div>
            {/* W% */}
            <div style={numHead('winRate')} onClick={() => toggleSort('winRate')} title={COL_TIPS.winRate}>W%{sortIcon('winRate')}</div>
            {/* KDA */}
            <div style={numHead('kda')} onClick={() => toggleSort('kda')} title={COL_TIPS.kda}>KDA{sortIcon('kda')}</div>
            {/* K */}
            <div style={numHead('avgKills')} onClick={() => toggleSort('avgKills')} title={COL_TIPS.avgKills}>K{sortIcon('avgKills')}</div>
            {/* D */}
            <div style={numHead('avgDeaths')} onClick={() => toggleSort('avgDeaths')} title={COL_TIPS.avgDeaths}>D{sortIcon('avgDeaths')}</div>
            {/* A */}
            <div style={numHead('avgAssists')} onClick={() => toggleSort('avgAssists')} title={COL_TIPS.avgAssists}>A{sortIcon('avgAssists')}</div>
            {/* KP% */}
            <div style={numHead('kp')} onClick={() => toggleSort('kp')} title={COL_TIPS.kp}>KP%{sortIcon('kp')}</div>
            {/* DPM */}
            <div style={numHead('dpm')} onClick={() => toggleSort('dpm')} title={COL_TIPS.dpm}>DPM{sortIcon('dpm')}</div>
            {/* CSM */}
            <div style={numHead('csm')} onClick={() => toggleSort('csm')} title={COL_TIPS.csm}>CSM{sortIcon('csm')}</div>
            {/* GPM */}
            <div style={numHead('gpm')} onClick={() => toggleSort('gpm')} title={COL_TIPS.gpm}>GPM{sortIcon('gpm')}</div>
            {/* GD15 */}
            <div style={numHead('gd15')} onClick={() => toggleSort('gd15')} title={COL_TIPS.gd15}>GD15{sortIcon('gd15')}</div>
            {/* CSD15 */}
            <div style={numHead('csd15')} onClick={() => toggleSort('csd15')} title={COL_TIPS.csd15}>CSD15{sortIcon('csd15')}</div>
          </div>

          {/* ── Rows ── */}
          {filtered.map(({ p, stats }, i) => {
            const rating = effectiveRating(p);
            return (
              <div
                key={p.id}
                className={`ranking-grid__row${selected?.id === p.id ? ' ranking-grid__row--selected' : ''}`}
                style={rowStyle}
                onClick={() => setSelected(p)}
              >
                {/* # */}
                <div style={{ padding: CELL_PAD, textAlign: 'left' }}>
                  <span className={rankClass(i)}>{i + 1}</span>
                </div>

                {/* PLAYER */}
                <div style={{ padding: CELL_PAD, overflow: 'hidden' }}>
                  <div className={`player-cell__name ${i < 3 ? 'player-cell__name--top3' : ''}`}>{p.name}</div>
                  <div className="player-cell__team" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RoleTag role={p.role} />
                    {teamLogos[p.team] && (
                      <img src={teamLogos[p.team]} alt={p.team} style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }} />
                    )}
                    <span>{p.team}</span>
                  </div>
                </div>

                {/* LIR */}
                <div style={{ ...numCell, padding: CELL_PAD }}>
                  <div className={ratingClass(rating ?? 0)} style={{ position: 'relative', display: 'inline-block' }}>
                    {rating?.toFixed(1) ?? '—'}
                    <div className={ratingBarClass(rating ?? 0)} style={{ width: `${rating ?? 0}%` }} />
                  </div>
                </div>

                {/* G */}
                <div style={numCell} className="val--muted">{stats?.games ?? '—'}</div>
                {/* W% */}
                <div style={numCell}><span className={winClass(stats?.winRate ?? 0)}>{stats ? `${fmt(stats.winRate)}%` : '—'}</span></div>
                {/* KDA */}
                <div style={numCell}><span className={kdaClass(stats?.kda ?? 0)}>{stats ? fmt(stats.kda) : '—'}</span></div>
                {/* K */}
                <div style={numCell}>{stats ? fmt(stats.avgKills) : '—'}</div>
                {/* D */}
                <div style={numCell}>{stats ? fmt(stats.avgDeaths) : '—'}</div>
                {/* A */}
                <div style={numCell}>{stats ? fmt(stats.avgAssists) : '—'}</div>
                {/* KP% */}
                <div style={numCell}><span className={stats && stats.kp >= 70 ? 'val--kp-high' : ''}>{stats ? `${fmt(stats.kp)}%` : '—'}</span></div>
                {/* DPM */}
                <div style={numCell}>{stats ? fmt(stats.dpm, 0) : '—'}</div>
                {/* CSM */}
                <div style={numCell}>{stats ? fmt(stats.csm) : '—'}</div>
                {/* GPM */}
                <div style={numCell}>{stats ? fmt(stats.gpm, 0) : '—'}</div>
                {/* GD15 */}
                <div style={numCell}><span className={diffClass(stats?.gd15 ?? 0)}>{stats ? fmtSign(stats.gd15) : '—'}</span></div>
                {/* CSD15 */}
                <div style={numCell}><span className={diffClass(stats?.csd15 ?? 0)}>{stats ? fmtSign(stats.csd15) : '—'}</span></div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {selected && (
        <PlayerModal player={selected} onClose={() => setSelected(null)} tournament={tournament} teamLogos={teamLogos} playerImages={playerImages} />
      )}
    </>
  );
}
