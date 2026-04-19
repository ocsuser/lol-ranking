import { useEffect, useRef, useState, useMemo } from 'react';
import { useLang } from '../i18n';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { ExportData, Player, Role } from '../types';
import { enrichPlayers, getPlayerStats, fmt, fmtSign, ROLE_COLOR } from '../utils';
import { YEARS } from '../leagues';
import RoleTag from './RoleTag';

const ROLES: Role[] = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];
const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JGL: 'Jungle', MID: 'Mid', BOT: 'Bot', SUP: 'Support' };
function useCSSVar(name: string, fallback: string) {
  const [val, setVal] = useState(fallback);
  useEffect(() => {
    const update = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) setVal(v);
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [name]);
  return val;
}

function usePolarTickColor() {
  const [color, setColor] = useState('rgba(240,238,232,0.4)');
  useEffect(() => {
    const update = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--polar-tick').trim();
      if (v) setColor(v);
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return color;
}

/* ── Data loading ──────────────────────────────── */

interface LeaguePlayerPool {
  leagueId: string;
  leagueLabel: string;
  year: number;
  players: Player[];
  teamLogos: Record<string, string>;
  playerImages: Record<string, string>;
  loading: boolean;
  error: boolean;
}

function useAllPlayers() {
  const [pools, setPools] = useState<LeaguePlayerPool[]>([]);

  useEffect(() => {
    const entries: LeaguePlayerPool[] = [];
    for (const yc of YEARS) {
      for (const league of yc.leagues) {
        if (!league.available) continue;
        entries.push({ leagueId: league.id, leagueLabel: league.label, year: yc.year, players: [], teamLogos: {}, playerImages: {}, loading: true, error: false });
      }
    }
    setPools(entries);

    for (const yc of YEARS) {
      for (const league of yc.leagues) {
        if (!league.available) continue;
        fetch(`/leagues/${league.file}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then((d: ExportData) => {
            const t = d.metadata.tournaments[0]?.name;
            setPools(prev => prev.map(p =>
              p.leagueId === league.id
                ? { ...p, players: enrichPlayers(d.players, t), teamLogos: d.teamLogos ?? {}, playerImages: d.playerImages ?? {}, loading: false }
                : p
            ));
          })
          .catch(() => setPools(prev => prev.map(p =>
            p.leagueId === league.id ? { ...p, loading: false, error: true } : p
          )));
      }
    }
  }, []);

  return pools;
}

/* ── Radar ──────────────────────────────────────── */

function norm(val: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}

function buildRadarData(player: Player) {
  const stats = getPlayerStats(player);
  if (!stats) return null;
  const sub = player.subscores;
  if (sub) {
    return [
      { axis: 'Laning',     val: Math.round(sub.laning)      },
      { axis: 'Damage',     val: Math.round(sub.damage)      },
      { axis: 'Presence',   val: Math.round(sub.presence)    },
      { axis: 'Efficiency', val: Math.round(sub.efficiency)  },
      { axis: 'Win%',       val: norm(stats.winRate, 30, 90) },
      { axis: 'KDA',        val: norm(stats.kda, 1, 7)       },
    ];
  }
  return [
    { axis: 'Win%',  val: norm(stats.winRate, 30, 90) },
    { axis: 'KDA',   val: norm(stats.kda, 1, 7)       },
    { axis: 'DPM',   val: norm(stats.dpm, 150, 920)   },
    { axis: 'CSM',   val: norm(stats.csm, 0.8, 11)    },
    { axis: 'KP%',   val: norm(stats.kp, 40, 80)      },
    { axis: 'GD@15', val: norm(stats.gd15, -400, 400) },
  ];
}

function CompareTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: { axis: string; a?: number; b?: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line-med)', borderRadius: 4, padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)' }}>
      <div style={{ marginBottom: 2, color: 'var(--text-3)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{d.axis}</div>
      {d.a !== undefined && <div style={{ color: 'var(--compare-a)' }}>P1 · {d.a.toFixed(0)}</div>}
      {d.b !== undefined && <div style={{ color: 'var(--compare-b)' }}>P2 · {d.b.toFixed(0)}</div>}
    </div>
  );
}

/* ── Stat bar row ──────────────────────────────── */

function pct(val: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}

const STAT_RANGES: Record<string, { min: number; max: number }> = {
  winRate: { min: 25, max: 90 }, kda: { min: 1, max: 7 }, kp: { min: 35, max: 85 },
  dpm: { min: 150, max: 920 }, dmgPct: { min: 5, max: 32 }, avgKills: { min: 0, max: 9 },
  avgDeaths: { min: 0.5, max: 7 }, avgAssists: { min: 1, max: 18 },
  gpm: { min: 240, max: 580 }, goldPct: { min: 10, max: 30 }, csm: { min: 0.5, max: 12 },
  gd15: { min: -500, max: 500 }, csd15: { min: -20, max: 20 }, xpd15: { min: -450, max: 450 },
};

function StatDuelRow({ label, a, b, statKey, fmt: fmtFn = v => fmt(v), invert = false }: {
  label: string; a: number | undefined; b: number | undefined;
  statKey?: string; fmt?: (v: number) => string; invert?: boolean;
}) {
  if (a === undefined || b === undefined) return null;
  const diff = a - b;
  const aWins = invert ? diff < 0 : diff > 0;
  const bWins = invert ? diff > 0 : diff < 0;
  const range = statKey ? STAT_RANGES[statKey] : null;
  const aPct = range ? pct(invert ? range.max - (a - range.min) : a, range.min, range.max) : 50;
  const bPct = range ? pct(invert ? range.max - (b - range.min) : b, range.min, range.max) : 50;

  return (
    <div className="cduel-row">
      {/* A: value right-aligned + bar grows from center leftward */}
      <div className="cduel-side cduel-side--a">
        <span className={`cduel-val cduel-val--a${aWins ? ' cduel-val--win' : bWins ? ' cduel-val--lose' : ''}`}>{fmtFn(a)}</span>
        <div className="cduel-bar-wrap cduel-bar-wrap--a">
          <div className="cduel-bar" style={{
            width: `${aPct}%`,
            background: aWins ? 'var(--compare-a)' : 'var(--line-med)',
          }} />
        </div>
      </div>

      {/* Label */}
      <div className="cduel-label">{label}</div>

      {/* B: bar grows from center rightward + value left-aligned */}
      <div className="cduel-side cduel-side--b">
        <div className="cduel-bar-wrap cduel-bar-wrap--b">
          <div className="cduel-bar" style={{
            width: `${bPct}%`,
            background: bWins ? 'var(--compare-b)' : 'var(--line-med)',
          }} />
        </div>
        <span className={`cduel-val cduel-val--b${bWins ? ' cduel-val--win' : aWins ? ' cduel-val--lose' : ''}`}>{fmtFn(b)}</span>
      </div>
    </div>
  );
}

/* ── Player selector ───────────────────────────── */

interface SelectorProps {
  pools: LeaguePlayerPool[];
  selectedPlayer: Player | null;
  onSelect: (player: Player, pool: LeaguePlayerPool) => void;
  color: string;
  slot: 'a' | 'b';
  teamLogos: Record<string, string>;
  playerImages: Record<string, string>;
}

function PlayerSelector({ pools, selectedPlayer, onSelect, color, slot, teamLogos }: SelectorProps) {
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const availableYears = useMemo(() => [...new Set(pools.map(p => p.year))].sort((a, b) => b - a), [pools]);
  const [filterYear, setFilterYear] = useState<number | null>(Math.max(...YEARS.map(y => y.year)));
  const [filterLeague, setFilterLeague] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<Role | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const availableLeagues = useMemo(() =>
    pools.filter(p => filterYear === null || p.year === filterYear)
         .map(p => ({ id: p.leagueId, label: p.leagueLabel })),
    [pools, filterYear]
  );

  // Reset league filter if it's not available in the new year
  const leagueStillAvailable = availableLeagues.some(l => l.id === filterLeague);
  const effectiveLeague = leagueStillAvailable ? filterLeague : null;

  const allPlayers = useMemo(() => {
    const list: { player: Player; pool: LeaguePlayerPool }[] = [];
    for (const pool of pools) {
      if (filterYear !== null && pool.year !== filterYear) continue;
      if (effectiveLeague !== null && pool.leagueId !== effectiveLeague) continue;
      for (const p of pool.players) {
        if (filterRole && p.role !== filterRole) continue;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.team.toLowerCase().includes(search.toLowerCase())) continue;
        list.push({ player: p, pool });
      }
    }
    return list.sort((a, b) => (b.player.rating ?? 0) - (a.player.rating ?? 0));
  }, [pools, filterYear, effectiveLeague, filterRole, search]);

  const label = slot === 'a' ? 'Player 1' : 'Player 2';

  return (
    <div ref={containerRef} className={`csel csel--${slot}${open ? ' csel--open' : ''}`} style={{ '--csel-color': color } as React.CSSProperties}>

      {/* Selected player display / trigger */}
      <button className="csel__trigger" onClick={() => setOpen(o => !o)} style={{ borderColor: open ? color : undefined }}>
        <span className="csel__slot-label" style={{ color }}>{label}</span>
        {selectedPlayer ? (
          <div className="csel__picked">
            {teamLogos[selectedPlayer.team] && (
              <img src={teamLogos[selectedPlayer.team]} alt={selectedPlayer.team}
                style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-1)', letterSpacing: '0.04em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPlayer.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <RoleTag role={selectedPlayer.role} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>{selectedPlayer.team}</span>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.03em', flexShrink: 0 }}>
              {(selectedPlayer.rating ?? 0).toFixed(1)}
            </div>
          </div>
        ) : (
          <div className="csel__empty">{t.selectPlayer}</div>
        )}
        <span className="csel__chevron" style={{ color }}>{open ? '▴' : '▾'}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="csel__panel">
          <div className="csel__filters">
            <div className="csel__filter-row">
              {availableYears.map(y => (
                <button key={y} className={`csel__fbtn${filterYear === y ? ' csel__fbtn--active' : ''}`}
                  style={filterYear === y ? { color, borderColor: color, background: `${color}15` } : {}}
                  onClick={() => setFilterYear(y)}>{y}</button>
              ))}
            </div>
            <div className="csel__filter-row">
              <button className={`csel__fbtn${effectiveLeague === null ? ' csel__fbtn--active' : ''}`}
                style={effectiveLeague === null ? { color, borderColor: color, background: `${color}15` } : {}}
                onClick={() => setFilterLeague(null)}>All</button>
              {availableLeagues.map(l => (
                <button key={l.id} className={`csel__fbtn${effectiveLeague === l.id ? ' csel__fbtn--active' : ''}`}
                  style={effectiveLeague === l.id ? { color, borderColor: color, background: `${color}15` } : {}}
                  onClick={() => setFilterLeague(l.id)}>{l.label}</button>
              ))}
            </div>
            <div className="csel__filter-row">
              <button className={`csel__fbtn${filterRole === null ? ' csel__fbtn--active' : ''}`}
                style={filterRole === null ? { color, borderColor: color, background: `${color}15` } : {}}
                onClick={() => setFilterRole(null)}>All</button>
              {ROLES.map(r => (
                <button key={r} className={`csel__fbtn${filterRole === r ? ' csel__fbtn--active' : ''}`}
                  style={filterRole === r ? { color, borderColor: color, background: `${color}15` } : {}}
                  onClick={() => setFilterRole(r)}>{ROLE_LABEL[r]}</button>
              ))}
            </div>
            <input className="csel__search" placeholder="Search player or team…"
              value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>

          <div className="csel__list">
            {allPlayers.map(({ player: p, pool }) => {
              const isActive = selectedPlayer?.id === p.id && selectedPlayer?.team === p.team;
              return (
                <button key={`${pool.leagueId}-${p.id}`}
                  className={`csel__row${isActive ? ' csel__row--active' : ''}`}
                  style={isActive ? { borderColor: color, background: `${color}12` } : {}}
                  onClick={() => { onSelect(p, pool); setOpen(false); }}>
                  <RoleTag role={p.role} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)' }}>{pool.leagueLabel} {pool.year} · {p.team}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: ROLE_COLOR[p.role], flexShrink: 0 }}>
                    {(p.rating ?? 0).toFixed(1)}
                  </div>
                </button>
              );
            })}
            {allPlayers.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-4)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{t.noPlayersFound}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Player hero card (inside center panel) ─────── */

function PlayerHero({ player, pool, color, align }: { player: Player; pool: LeaguePlayerPool; color: string; align: 'left' | 'right' }) {
  const isRight = align === 'right';
  const hasPhoto = !!pool.playerImages[player.name];
  return (
    <div className="chero" style={{ textAlign: align }}>
      <div className="chero__inner" style={{ flexDirection: isRight ? 'row-reverse' : 'row' }}>
        {/* Player photo or team logo fallback */}
        {hasPhoto ? (
          <img src={pool.playerImages[player.name]} alt={player.name}
            style={{ width: 52, height: 52, objectFit: 'cover', objectPosition: 'top', borderRadius: 5, flexShrink: 0, border: `1px solid ${color}30` }} />
        ) : pool.teamLogos[player.team] ? (
          <img src={pool.teamLogos[player.team]} alt={player.team}
            style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color, letterSpacing: '0.04em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, justifyContent: isRight ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
            <RoleTag role={player.role} />
            {pool.teamLogos[player.team] && hasPhoto && (
              <img src={pool.teamLogos[player.team]} alt={player.team} style={{ width: 14, height: 14, objectFit: 'contain' }} />
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.team}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>· {pool.leagueLabel} {pool.year}</span>
          </div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 10 }}>
        {(player.rating ?? 0).toFixed(1)}
        <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 5, fontWeight: 400 }}>LIR</span>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────── */

export default function ComparePage() {
  const { t } = useLang();
  const pools = useAllPlayers();
  const tickColor = usePolarTickColor();
  const colorA = useCSSVar('--compare-a', '#60A5FA');
  const colorB = useCSSVar('--compare-b', '#FB923C');

  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [poolA, setPoolA]     = useState<LeaguePlayerPool | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);
  const [poolB, setPoolB]     = useState<LeaguePlayerPool | null>(null);

  const statsA = playerA ? getPlayerStats(playerA) : null;
  const statsB = playerB ? getPlayerStats(playerB) : null;

  const radarA = playerA ? buildRadarData(playerA) : null;
  const radarB = playerB ? buildRadarData(playerB) : null;
  const radarAxes = radarA?.map(d => d.axis) ?? radarB?.map(d => d.axis) ?? [];
  const combinedRadar = radarAxes.map(axis => ({
    axis,
    a: radarA?.find(d => d.axis === axis)?.val,
    b: radarB?.find(d => d.axis === axis)?.val,
  }));

  const bothSelected = playerA && playerB && statsA && statsB;

  return (
    <div className="cpage">

      {/* ── 3-col layout ── */}
      <div className="cpage__cols">

        {/* Col A — selector */}
        <PlayerSelector
          pools={pools} selectedPlayer={playerA}
          onSelect={(p, pool) => { setPlayerA(p); setPoolA(pool); }}
          color={colorA} slot="a"
          teamLogos={poolA?.teamLogos ?? {}} playerImages={poolA?.playerImages ?? {}}
        />

        {/* Col center — radar + stats */}
        <div className="cpage__center">
          {bothSelected ? (
            <>
              {/* Hero row */}
              <div className="cpage__heroes">
                <PlayerHero player={playerA} pool={poolA!} color={colorA} align="left" />
                <div className="cpage__vs">VS</div>
                <PlayerHero player={playerB} pool={poolB!} color={colorB} align="right" />
              </div>

              {/* Radar */}
              <div className="cpage__radar">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={combinedRadar} margin={{ top: 16, right: 22, bottom: 16, left: 22 }}>
                    <PolarGrid gridType="polygon" stroke="var(--polar-grid)" strokeWidth={1} />
                    <PolarAngleAxis dataKey="axis"
                      tick={{ fontFamily: 'Space Mono, monospace', fontSize: 9, fill: tickColor, fontWeight: 700 }}
                      tickLine={false} />
                    <Radar dataKey="a" stroke={colorA} fill={colorA} fillOpacity={0.18} strokeWidth={2} dot={false} />
                    <Radar dataKey="b" stroke={colorB} fill={colorB} fillOpacity={0.18} strokeWidth={2} dot={false} />
                    <Tooltip content={<CompareTooltip />} />
                    <Tooltip content={<CompareTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="cpage__radar-legend">
                <span style={{ color: 'var(--compare-a)' }}>■</span>{playerA.name}
                <span style={{ color: 'var(--compare-b)' }}>■</span>{playerB.name}
              </div>

              {/* Stats */}
              <div className="cpage__stats">
                <div className="cduel-section">General</div>
                <StatDuelRow label="Win %" a={statsA.winRate} b={statsB.winRate} statKey="winRate" fmt={v => `${fmt(v)}%`} />
                <StatDuelRow label="KDA"   a={statsA.kda}     b={statsB.kda}     statKey="kda" />
                <StatDuelRow label="KP %"  a={statsA.kp}      b={statsB.kp}      statKey="kp"  fmt={v => `${fmt(v)}%`} />
                <StatDuelRow label="Games" a={statsA.games}   b={statsB.games}   fmt={v => String(Math.round(v))} />

                <div className="cduel-section">Combat</div>
                <StatDuelRow label="DPM"     a={statsA.dpm}        b={statsB.dpm}        statKey="dpm"        fmt={v => fmt(v, 0)} />
                <StatDuelRow label="DMG %"   a={statsA.dmgPct}     b={statsB.dmgPct}     statKey="dmgPct"     fmt={v => `${fmt(v)}%`} />
                <StatDuelRow label="Kills"   a={statsA.avgKills}   b={statsB.avgKills}   statKey="avgKills" />
                <StatDuelRow label="Deaths"  a={statsA.avgDeaths}  b={statsB.avgDeaths}  statKey="avgDeaths"  invert />
                <StatDuelRow label="Assists" a={statsA.avgAssists} b={statsB.avgAssists} statKey="avgAssists" />

                <div className="cduel-section">Economy</div>
                <StatDuelRow label="GPM"    a={statsA.gpm}     b={statsB.gpm}     statKey="gpm"     fmt={v => fmt(v, 0)} />
                <StatDuelRow label="Gold %" a={statsA.goldPct} b={statsB.goldPct} statKey="goldPct" fmt={v => `${fmt(v)}%`} />
                <StatDuelRow label="CSM"    a={statsA.csm}     b={statsB.csm}     statKey="csm" />

                <div className="cduel-section">Early @15</div>
                <StatDuelRow label="GD@15"  a={statsA.gd15}  b={statsB.gd15}  statKey="gd15"  fmt={fmtSign} />
                <StatDuelRow label="CSD@15" a={statsA.csd15} b={statsB.csd15} statKey="csd15" fmt={fmtSign} />
                <StatDuelRow label="XPD@15" a={statsA.xpd15} b={statsB.xpd15} statKey="xpd15" fmt={fmtSign} />
              </div>

              <div className="cpage__disclaimer">
                {t.crossLeagueNote}
              </div>
            </>
          ) : (
            <div className="cpage__empty">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.2, marginBottom: 4 }}>
                <path d="M22 6 28 12l-6 6M10 26 4 20l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M28 12H12a6 6 0 0 0 0 12M4 20h16a6 6 0 0 0 0-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div>{t.selectTwoPlayers}</div>
              <div style={{ fontSize: 9, opacity: 0.5, marginTop: 2 }}>{t.selectTwoSub}</div>
            </div>
          )}
        </div>

        {/* Col B — selector */}
        <PlayerSelector
          pools={pools} selectedPlayer={playerB}
          onSelect={(p, pool) => { setPlayerB(p); setPoolB(pool); }}
          color={colorB} slot="b"
          teamLogos={poolB?.teamLogos ?? {}} playerImages={poolB?.playerImages ?? {}}
        />
      </div>
    </div>
  );
}
