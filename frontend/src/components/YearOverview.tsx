import { useEffect, useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { ExportData, Player, Role } from '../types';
import { enrichPlayers, getPlayerStats, ROLE_COLOR } from '../utils';
import { type YearConfig } from '../leagues';
import PlayerSheet from './PlayerSheet';

const ROLES: Role[] = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];
const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JGL: 'Jungle', MID: 'Mid', BOT: 'Bot', SUP: 'Support' };

interface LeagueData {
  id: string;
  label: string;
  players: Player[];
  teamLogos: Record<string, string>;
  playerImages: Record<string, string>;
  loading: boolean;
  error: boolean;
}

interface Props {
  yearConfig: YearConfig;
  onSelectLeague: (leagueId: string) => void;
}

function useAllLeaguesData(yearConfig: YearConfig) {
  const [leaguesData, setLeaguesData] = useState<LeagueData[]>(
    yearConfig.leagues.filter(l => l.available).map(l => ({
      id: l.id, label: l.label, players: [], teamLogos: {}, playerImages: {}, loading: true, error: false,
    }))
  );
  useEffect(() => {
    setLeaguesData(yearConfig.leagues.filter(l => l.available).map(l => ({
      id: l.id, label: l.label, players: [], teamLogos: {}, playerImages: {}, loading: true, error: false,
    })));
    yearConfig.leagues.filter(l => l.available).forEach(league => {
      fetch(`/leagues/${league.file}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d: ExportData) => {
          const t = d.metadata.tournaments[0]?.name;
          setLeaguesData(prev => prev.map(ld =>
            ld.id === league.id ? { ...ld, players: enrichPlayers(d.players, t), teamLogos: d.teamLogos ?? {}, playerImages: d.playerImages ?? {}, loading: false } : ld
          ));
        })
        .catch(() => setLeaguesData(prev => prev.map(ld =>
          ld.id === league.id ? { ...ld, loading: false, error: true } : ld
        )));
    });
  }, [yearConfig.year]);
  return leaguesData;
}

function norm(val: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}

function buildRadarData(player: Player) {
  const stats = getPlayerStats(player);
  if (!stats) return null;
  const sub = player.subscores;
  if (sub) {
    return [
      { axis: 'Laning',     val: Math.round(sub.laning),      full: 100 },
      { axis: 'Damage',     val: Math.round(sub.damage),      full: 100 },
      { axis: 'Presence',   val: Math.round(sub.presence),    full: 100 },
      { axis: 'Efficiency', val: Math.round(sub.efficiency),  full: 100 },
      { axis: 'Win%',       val: norm(stats.winRate, 30, 90), full: 100 },
      { axis: 'KDA',        val: norm(stats.kda, 1, 7),        full: 100 },
    ];
  }
  return [
    { axis: 'Win%',  val: norm(stats.winRate, 30, 90), full: 100 },
    { axis: 'KDA',   val: norm(stats.kda, 1, 7),       full: 100 },
    { axis: 'DPM',   val: norm(stats.dpm, 150, 920),   full: 100 },
    { axis: 'CSM',   val: norm(stats.csm, 0.8, 11),    full: 100 },
    { axis: 'KP%',   val: norm(stats.kp, 40, 80),      full: 100 },
    { axis: 'GD@15', val: norm(stats.gd15, -400, 400), full: 100 },
  ];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { axis: string; val: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line-med)', borderRadius: 4, padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)' }}>
      {d.axis} · <span style={{ color: 'var(--accent)' }}>{d.val.toFixed(0)}</span>
    </div>
  );
}

function PlayerRadar({ player, color, size = 140 }: { player: Player; color: string; size?: number }) {
  const data = buildRadarData(player);
  if (!data) return null;
  return (
    <ResponsiveContainer width={size} height={size}>
      <RadarChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontFamily: 'Space Mono, monospace', fontSize: 8, fill: 'rgba(240,238,232,0.4)', fontWeight: 700 }}
          tickLine={false}
        />
        <Radar dataKey="val" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={1.5} dot={false} />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}


/* ── Carte rôle cliquable ─────────────────────── */
function RoleTopRow({ players, teamLogos, playerImages }: { players: Record<Role, Player | undefined>; teamLogos: Record<string, string>; playerImages: Record<string, string> }) {
  const [expanded, setExpanded] = useState<Role | null>(null);
  const expandedPlayer = expanded ? players[expanded] : null;

  return (
    <>
      <div className="role-top-grid">
        {ROLES.map(role => {
          const p = players[role];
          const color = ROLE_COLOR[role];
          const isActive = expanded === role;

          if (!p) return (
            <div key={role} className="role-card role-card--empty">
              <div className="role-card__label" style={{ color }}>{ROLE_LABEL[role]}</div>
              <div style={{ color: 'var(--text-4)', fontSize: 11 }}>—</div>
            </div>
          );

          const rating = p.rating ?? 0;
          return (
            <div
              key={role}
              className={`role-card${isActive ? ' role-card--active' : ''}`}
              style={{
                background: isActive ? `${color}14` : `${color}08`,
                border: `1px solid ${isActive ? color + '50' : color + '25'}`,
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px 10px 12px',
                gap: 2,
              }}
              onClick={() => setExpanded(isActive ? null : role)}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div className="role-card__hint" style={{ color: isActive ? color : 'var(--text-4)' }}>
                {isActive ? '✕' : '⤢'}
              </div>
              <div className="role-card__label" style={{ color }}>{ROLE_LABEL[role]}</div>

              {/* Info + radar côte à côte */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 4, marginTop: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div className="role-card__name" style={{ textAlign: 'left' }}>{p.name}</div>
                  <div className="role-card__rating" style={{ color }}>{rating.toFixed(1)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    {teamLogos[p.team] && (
                      <img src={teamLogos[p.team]} alt={p.team} style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} />
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.team}</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <PlayerRadar player={p} color={color} size={90} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal au clic */}
      {expandedPlayer && (
        <PlayerSheet player={expandedPlayer} onClose={() => setExpanded(null)} teamLogos={teamLogos} playerImages={playerImages} />
      )}
    </>
  );
}

function LeagueCard({ ld, onSelect }: { ld: LeagueData; onSelect: () => void; }) {
  const sorted = [...ld.players]
    .filter(p => p.rating !== undefined)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const bestByRole: Record<Role, Player | undefined> = { TOP: undefined, JGL: undefined, MID: undefined, BOT: undefined, SUP: undefined };
  for (const role of ROLES) {
    bestByRole[role] = sorted.find(p => p.role === role);
  }

  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 46, borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.06em', color: 'var(--text-1)' }}>{ld.label}</span>
          {!ld.loading && !ld.error && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>{ld.players.length} players</span>
          )}
        </div>
        <button onClick={onSelect} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'transparent', border: '1px solid var(--line)', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', transition: 'all var(--t-fast)' }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.color = 'var(--accent)'; b.style.borderColor = 'var(--accent-border)'; b.style.background = 'var(--accent-dim)'; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--text-3)'; b.style.borderColor = 'var(--line)'; b.style.background = 'transparent'; }}
        >Rankings →</button>
      </div>

      {ld.loading ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-4)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Loading…</div>
      ) : ld.error ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>Data unavailable</div>
      ) : (
        <div style={{ padding: '16px 20px 20px' }}>
          <RoleTopRow players={bestByRole} teamLogos={ld.teamLogos} playerImages={ld.playerImages} />
        </div>
      )}
    </div>
  );
}

export default function YearOverview({ yearConfig, onSelectLeague }: Props) {
  const leaguesData = useAllLeaguesData(yearConfig);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {leaguesData.map(ld => (
        <LeagueCard key={ld.id} ld={ld} onSelect={() => onSelectLeague(ld.id)} />
      ))}
    </div>
  );
}
