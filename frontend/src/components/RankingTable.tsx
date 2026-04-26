import { useMemo, useRef, useState } from 'react';
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

  const effectiveRating = (p: Player): number | undefined => {
    if (tournament) {
      const t = p.tournaments[tournament];
      if (t?.rating !== undefined) return t.rating;
    }
    return p.rating;
  };

  const filtered = useMemo(() => {
    const getrating = (p: Player) => {
      if (tournament) {
        const t = p.tournaments[tournament];
        if (t?.rating !== undefined) return t.rating;
      }
      return p.rating;
    };
    return players
      .filter(p => role === 'ALL' || p.role === role)
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.team.toLowerCase().includes(search.toLowerCase()))
      .map(p => ({ p, stats: getPlayerStats(p, tournament) }))
      .filter(({ stats }) => !tournament || stats !== null)
      .sort((a, b) => {
        let va: number | string = 0, vb: number | string = 0;
        if (sortKey === 'rating')    { va = getrating(a.p) ?? 0; vb = getrating(b.p) ?? 0; }
        else if (sortKey === 'name') { va = a.p.name; vb = b.p.name; }
        else {
          va = (a.stats?.[sortKey as keyof TournamentStats] as number) ?? -999;
          vb = (b.stats?.[sortKey as keyof TournamentStats] as number) ?? -999;
        }
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
        return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
      });
  }, [players, role, search, sortKey, sortDir, tournament]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortIcon = (key: SortKey) => (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ marginLeft: 3, opacity: sortKey === key ? 1 : 0.18, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      {sortKey === key && sortDir === 'asc'
        ? <path d="M4 1L7 6H1L4 1Z" fill="currentColor"/>
        : <path d="M4 7L1 2H7L4 7Z" fill="currentColor"/>
      }
    </svg>
  );

  const colHead = (key: SortKey) => `col-head${sortKey === key ? ' col-head--active' : ''}`;

  if (view === 'TEAMS') {
    return (
      <>
        <div className="ranking-toolbar">
          <div className="filters">
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

  return (
    <>
      <div className="ranking-toolbar">
        <div className="filters">
          <button className="filter-btn" onClick={() => setView('TEAMS')}>{t.teams}</button>
          <button className={`filter-btn${view === 'ALL' ? ' filter-btn--active' : ''}`} onClick={() => setView('ALL')}>{t.all}</button>
          {ROLES.map(r => (
            <button
              key={r}
              className={`filter-btn filter-btn--${r.toLowerCase()}${view === r ? ' filter-btn--active' : ''}`}
              onClick={() => setView(r)}
            >{ROLE_LABEL[r]}</button>
          ))}
        </div>
        <div className="ranking-toolbar__right">
          <input
            className="search-input"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="ranking-toolbar__count">
            {t.players(filtered.length, tournamentName)}
          </span>
        </div>
      </div>

      <div className={`scroll-fade-wrap${scrolledEnd ? ' scrolled-end' : ''}`}>
        <div ref={scrollRef} className="ranking-grid-scroll" onScroll={handleScroll}>
          <div className="ranking-grid">

            <div className="ranking-grid__head">
              <div className="col-label">#</div>
              <div className="col-label">Player</div>
              <div className={colHead('rating')} onClick={() => toggleSort('rating')} title={COL_TIPS.rating}>RATING{sortIcon('rating')}</div>
              <div className={colHead('games')} onClick={() => toggleSort('games')} title={COL_TIPS.games}>G{sortIcon('games')}</div>
              <div className={colHead('winRate')} onClick={() => toggleSort('winRate')} title={COL_TIPS.winRate}>W%{sortIcon('winRate')}</div>
              <div className={colHead('kda')} onClick={() => toggleSort('kda')} title={COL_TIPS.kda}>KDA{sortIcon('kda')}</div>
              <div className={colHead('avgKills')} onClick={() => toggleSort('avgKills')} title={COL_TIPS.avgKills}>K{sortIcon('avgKills')}</div>
              <div className={colHead('avgDeaths')} onClick={() => toggleSort('avgDeaths')} title={COL_TIPS.avgDeaths}>D{sortIcon('avgDeaths')}</div>
              <div className={colHead('avgAssists')} onClick={() => toggleSort('avgAssists')} title={COL_TIPS.avgAssists}>A{sortIcon('avgAssists')}</div>
              <div className={colHead('kp')} onClick={() => toggleSort('kp')} title={COL_TIPS.kp}>KP%{sortIcon('kp')}</div>
              <div className={colHead('dpm')} onClick={() => toggleSort('dpm')} title={COL_TIPS.dpm}>DPM{sortIcon('dpm')}</div>
              <div className={colHead('csm')} onClick={() => toggleSort('csm')} title={COL_TIPS.csm}>CSM{sortIcon('csm')}</div>
              <div className={colHead('gpm')} onClick={() => toggleSort('gpm')} title={COL_TIPS.gpm}>GPM{sortIcon('gpm')}</div>
              <div className={colHead('gd15')} onClick={() => toggleSort('gd15')} title={COL_TIPS.gd15}>GD15{sortIcon('gd15')}</div>
              <div className={colHead('csd15')} onClick={() => toggleSort('csd15')} title={COL_TIPS.csd15}>CSD15{sortIcon('csd15')}</div>
            </div>

            {filtered.map(({ p, stats }, i) => {
              const rating = effectiveRating(p);
              return (
                <div
                  key={p.id}
                  className={`ranking-grid__row${selected?.id === p.id ? ' ranking-grid__row--selected' : ''}`}
                  onClick={() => setSelected(p)}
                >
                  <div className="col-rank"><span className={rankClass(i)}>{i + 1}</span></div>

                  <div className="col-player">
                    <div className={`player-cell__name${i < 3 ? ' player-cell__name--top3' : ''}`}>{p.name}</div>
                    <div className="player-cell__team">
                      <RoleTag role={p.role} />
                      {teamLogos[p.team] && (
                        <img src={teamLogos[p.team]} alt={p.team} style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }} />
                      )}
                      <span>{p.team}</span>
                    </div>
                  </div>

                  <div className="col-num">
                    <div className={ratingClass(rating ?? 0)} style={{ position: 'relative', display: 'inline-block' }}>
                      {rating?.toFixed(1) ?? '—'}
                      <div className={ratingBarClass(rating ?? 0)} style={{ width: `${rating ?? 0}%` }} />
                    </div>
                  </div>

                  <div className="col-num val--muted">{stats?.games ?? '—'}</div>
                  <div className="col-num"><span className={winClass(stats?.winRate ?? 0)}>{stats ? `${fmt(stats.winRate)}%` : '—'}</span></div>
                  <div className="col-num"><span className={kdaClass(stats?.kda ?? 0)}>{stats ? fmt(stats.kda) : '—'}</span></div>
                  <div className="col-num">{stats ? fmt(stats.avgKills) : '—'}</div>
                  <div className="col-num">{stats ? fmt(stats.avgDeaths) : '—'}</div>
                  <div className="col-num">{stats ? fmt(stats.avgAssists) : '—'}</div>
                  <div className="col-num"><span className={stats && stats.kp >= 70 ? 'val--kp-high' : ''}>{stats ? `${fmt(stats.kp)}%` : '—'}</span></div>
                  <div className="col-num">{stats ? fmt(stats.dpm, 0) : '—'}</div>
                  <div className="col-num">{stats ? fmt(stats.csm) : '—'}</div>
                  <div className="col-num">{stats ? fmt(stats.gpm, 0) : '—'}</div>
                  <div className="col-num"><span className={diffClass(stats?.gd15 ?? 0)}>{stats ? fmtSign(stats.gd15) : '—'}</span></div>
                  <div className="col-num"><span className={diffClass(stats?.csd15 ?? 0)}>{stats ? fmtSign(stats.csd15) : '—'}</span></div>
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
