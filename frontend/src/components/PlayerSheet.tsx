import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { Player, Role, LIRSubscores, TournamentStats } from '../types';
import { fmt, fmtSign, getPlayerStats } from '../utils';
import RoleTag from './RoleTag';

const ROLE_COLOR: Record<Role, string> = {
  TOP: 'var(--role-top)', JGL: 'var(--role-jgl)', MID: 'var(--role-mid)',
  BOT: 'var(--role-bot)', SUP: 'var(--role-sup)',
};

/* ── Radar helpers ─────────────────────────────── */

function norm(val: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}

function buildRadarData(player: Player, stats: TournamentStats) {
  const sub = player.subscores;
  if (sub) {
    return [
      { axis: 'Laning',     val: Math.round(sub.laning)     },
      { axis: 'Damage',     val: Math.round(sub.damage)     },
      { axis: 'Presence',   val: Math.round(sub.presence)   },
      { axis: 'Efficiency', val: Math.round(sub.efficiency) },
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

function RadarTooltip({ active, payload }: { active?: boolean; payload?: { payload: { axis: string; val: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line-med)', borderRadius: 4, padding: '4px 9px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)' }}>
      {d.axis} · <span style={{ color: 'var(--accent)' }}>{d.val.toFixed(0)}</span>
    </div>
  );
}

/* ── Stat bar row ──────────────────────────────── */

function pct(val: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}

function StatBar({ label, value, barPct, color }: { label: string; value: string; barPct: number; color: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr 58px', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 2, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

/* ── Subscore tile ─────────────────────────────── */

function SubTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 4, padding: '8px 6px', textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color, letterSpacing: '-0.03em' }}>
        {value.toFixed(1)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-4)', letterSpacing: '0.10em', textTransform: 'uppercase', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

/* ── Main export ───────────────────────────────── */

interface Props {
  player: Player;
  onClose: () => void;
  tournament?: string;
  teamLogos?: Record<string, string>;
}

export default function PlayerSheet({ player, onClose, tournament, teamLogos = {} }: Props) {
  const stats = getPlayerStats(player, tournament);
  if (!stats) return null;

  const tournamentEntry  = tournament ? player.tournaments[tournament] : undefined;
  const displayRating    = tournamentEntry?.rating    ?? player.rating;
  const displaySubscores = (tournamentEntry?.subscores ?? player.subscores) as LIRSubscores | undefined;
  const roleColor        = ROLE_COLOR[player.role];
  const radarData        = buildRadarData(player, stats);

  const SUBSCORE_DEFS: { key: keyof LIRSubscores; label: string; color: string }[] = [
    { key: 'laning',     label: 'Laning',     color: 'var(--blue)'   },
    { key: 'damage',     label: 'Damage',     color: 'var(--red)'    },
    { key: 'presence',   label: 'Presence',   color: 'var(--green)'  },
    { key: 'efficiency', label: 'Efficiency', color: 'var(--accent)' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-backdrop" />
      <div
        className="modal sheet-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Barre rôle en haut */}
        <div style={{ height: 3, background: roleColor, borderRadius: '8px 8px 0 0' }} />

        <div className="sheet-body">

          {/* ── Colonne gauche : header + stats ── */}
          <div className="sheet-left">

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {teamLogos[player.team] && (
                  <img src={teamLogos[player.team]} alt={player.team} style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span className="player-name" style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-1)', letterSpacing: '0.04em', lineHeight: 1 }}>
                      {player.name}
                    </span>
                    <RoleTag role={player.role} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {player.team}{player.country ? ` · ${player.country}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {displayRating !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div className="player-rating" style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 700, color: roleColor, letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {displayRating.toFixed(1)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-4)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'right' }}>LIR</div>
                  </div>
                )}
                <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
              </div>
            </div>

            {/* Hero 4 stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
              {[
                { label: 'Games', value: String(stats.games) },
                { label: 'Win%',  value: `${fmt(stats.winRate)}%` },
                { label: 'KDA',   value: fmt(stats.kda) },
                { label: 'KP%',   value: `${fmt(stats.kp)}%` },
              ].map(s => (
                <div key={s.label} className="sheet-hero-stat" style={{ background: 'var(--bg-1)', padding: '12px 8px', textAlign: 'center' }}>
                  <div className="sheet-hero-val" style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>{s.value}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Combat */}
            <div>
              <div className="modal__section-title">Combat</div>
              <StatBar label="Kills avg"   value={fmt(stats.avgKills)}     barPct={pct(stats.avgKills, 0, 8)}    color={roleColor} />
              <StatBar label="Deaths avg"  value={fmt(stats.avgDeaths)}    barPct={pct(stats.avgDeaths, 1, 6)}   color="var(--red)" />
              <StatBar label="Assists avg" value={fmt(stats.avgAssists)}   barPct={pct(stats.avgAssists, 2, 16)} color={roleColor} />
              <StatBar label="DPM"         value={fmt(stats.dpm, 0)}       barPct={pct(stats.dpm, 150, 920)}     color={roleColor} />
              <StatBar label="DMG %"       value={`${fmt(stats.dmgPct)}%`} barPct={pct(stats.dmgPct, 5, 31)}     color={roleColor} />
            </div>

            {/* Economy */}
            <div>
              <div className="modal__section-title">Economy</div>
              <StatBar label="GPM"    value={fmt(stats.gpm, 0)}        barPct={pct(stats.gpm, 240, 560)}    color="var(--accent)" />
              <StatBar label="Gold %"  value={`${fmt(stats.goldPct)}%`} barPct={pct(stats.goldPct, 12, 27)}  color="var(--accent)" />
              <StatBar label="CSM"     value={fmt(stats.csm)}           barPct={pct(stats.csm, 0.8, 11)}     color="var(--accent)" />
            </div>

            {/* Early game */}
            <div>
              <div className="modal__section-title">Early Game @15</div>
              <StatBar label="GD@15"  value={fmtSign(stats.gd15)}  barPct={pct(stats.gd15, -500, 500)}  color={stats.gd15  >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBar label="CSD@15" value={fmtSign(stats.csd15)} barPct={pct(stats.csd15, -15, 15)}   color={stats.csd15 >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBar label="XPD@15" value={fmtSign(stats.xpd15)} barPct={pct(stats.xpd15, -400, 400)} color={stats.xpd15 >= 0 ? 'var(--green)' : 'var(--red)'} />
            </div>

          </div>

          {/* ── Colonne droite : radar + subscores ── */}
          <div className="sheet-right">

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Performance Profile
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 14, right: 18, bottom: 14, left: 18 }}>
                <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontFamily: 'Space Mono, monospace', fontSize: 9, fill: 'rgba(240,238,232,0.45)', fontWeight: 700 }}
                  tickLine={false}
                />
                <Radar dataKey="val" stroke={roleColor} fill={roleColor} fillOpacity={0.2} strokeWidth={2} dot={false} />
                <Tooltip content={<RadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>

            {/* Subscores */}
            {displaySubscores && (
              <div style={{ width: '100%', display: 'flex', gap: 5 }}>
                {SUBSCORE_DEFS.map(({ key, label, color }) => (
                  <SubTile key={key} label={label} value={displaySubscores[key]} color={color} />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
