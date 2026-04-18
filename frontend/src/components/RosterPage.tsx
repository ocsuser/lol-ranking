import { useState } from 'react';
import type { Player, Role } from '../types';
import { ROLE_COLOR, getPlayerStats, fmt } from '../utils';
import PlayerModal from './PlayerModal';

const ROLE_ORDER: Role[] = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];
const ROLE_SHORT: Record<Role, string> = { TOP: 'TOP', JGL: 'JGL', MID: 'MID', BOT: 'BOT', SUP: 'SUP' };

interface Props { players: Player[]; tournament?: string; teamLogos?: Record<string, string>; playerImages?: Record<string, string>; leagueTitle?: string; }

export default function RosterPage({ players, tournament, teamLogos = {}, playerImages = {}, leagueTitle = '' }: Props) {
  const [selected, setSelected] = useState<Player | null>(null);

  const getTeams = (p: Player): string[] => {
    const tournamentTeam = tournament && (p.tournaments[tournament] as any)?.team;
    if (tournamentTeam) return [tournamentTeam];
    const teams = [...new Set(
      Object.values(p.tournaments).map((t: any) => t.team).filter(Boolean)
    )] as string[];
    return teams.length > 0 ? teams : (p.team ? [p.team] : []);
  };

  const teamMap = new Map<string, Player[]>();
  for (const p of players) {
    if (tournament && !getPlayerStats(p, tournament)) continue;
    for (const team of getTeams(p)) {
      if (!teamMap.has(team)) teamMap.set(team, []);
      if (!teamMap.get(team)!.includes(p)) teamMap.get(team)!.push(p);
    }
  }

  // Compute team LIR = avg rating of one starter per role, sort by it desc
  const teamEntries = Array.from(teamMap.entries()).map(([name, ps]) => {
    // All players sorted by role order, then rating desc within same role
    const starters = [...ps]
      .filter(p => ROLE_ORDER.includes(p.role as Role))
      .sort((a, b) => {
        const ri = ROLE_ORDER.indexOf(a.role as Role) - ROLE_ORDER.indexOf(b.role as Role);
        if (ri !== 0) return ri;
        return ((getPlayerStats(b, tournament)?.rating ?? b.rating ?? 0) -
                (getPlayerStats(a, tournament)?.rating ?? a.rating ?? 0));
      });

    // Team LIR = avg of best-rated player per role
    const seenRoles = new Set<Role>();
    const bestPerRole: Player[] = [];
    for (const p of starters) {
      const role = p.role as Role;
      if (!seenRoles.has(role)) { seenRoles.add(role); bestPerRole.push(p); }
    }

    const ratings = bestPerRole.map(p => {
      const st = getPlayerStats(p, tournament);
      return st?.rating ?? p.rating ?? 0;
    }).filter(r => r > 0);
    const teamLIR = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const stats0 = bestPerRole[0] ? getPlayerStats(bestPerRole[0], tournament) : null;
    const games = stats0?.games ?? 0;
    const winRate = bestPerRole.length
      ? bestPerRole.reduce((s, p) => s + (getPlayerStats(p, tournament)?.winRate ?? 0), 0) / bestPerRole.length
      : 0;
    return { name, starters, teamLIR, games, winRate };
  }).sort((a, b) => b.teamLIR - a.teamLIR);

  return (
    <>
      <div className="roster-grid">
        {teamEntries.map(({ name: teamName, starters, teamLIR, games, winRate }, idx) => {
          const rank = idx + 1;
          const wrColor = winRate >= 60 ? 'var(--green)' : winRate >= 45 ? 'var(--text-2)' : 'var(--red)';

          return (
            <div key={teamName} className="rcard">
              {/* Header */}
              <div className="rcard__header">
                <div className="rcard__header-left">
                  <span className="rcard__rank">#{rank}</span>
                  {teamLogos[teamName] && (
                    <img src={teamLogos[teamName]} alt={teamName} className="rcard__logo" />
                  )}
                  <div className="rcard__name-block">
                    <span className="rcard__name">{teamName.toUpperCase()}</span>
                    <span className="rcard__meta">RANK {rank < 10 ? `0${rank}` : rank}{leagueTitle ? ` · ${leagueTitle.toUpperCase()}` : ''}</span>
                  </div>
                </div>
                <div className="rcard__header-right">
                  <span className="rcard__lir">{teamLIR > 0 ? teamLIR.toFixed(1) : '—'}</span>
                  <span className="rcard__lir-label">TEAM LIR</span>
                </div>
              </div>

              {/* Player rows */}
              <div className="rcard__rows">
                {starters.map(p => {
                  const stats = getPlayerStats(p, tournament);
                  const role = p.role as Role;
                  const roleColor = ROLE_COLOR[role] ?? 'var(--text-3)';
                  const rating = stats?.rating ?? p.rating;
                  return (
                    <div key={p.id} className="rrow" onClick={() => setSelected(p)}>
                      <span className="rrow__role" style={{ color: roleColor }}>{ROLE_SHORT[role] ?? role}</span>
                      <span className="rrow__name">{p.name}</span>
                      <div className="rrow__stats">
                        <div className="rrow__stat">
                          <span className="rrow__stat-val">{stats ? stats.kda.toFixed(1) : '—'}</span>
                          <span className="rrow__stat-label">KDA</span>
                        </div>
                        <div className="rrow__stat">
                          <span className="rrow__stat-val">{stats ? Math.round(stats.dpm) : '—'}</span>
                          <span className="rrow__stat-label">DPM</span>
                        </div>
                      </div>
                      <span className="rrow__rating" style={{ color: roleColor }}>{rating != null ? rating.toFixed(1) : '—'}</span>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="rcard__footer">
                <span className="rcard__footer-wr" style={{ color: wrColor }}>
                  WIN RATE · <strong>{fmt(winRate)}%</strong>
                </span>
                <span className="rcard__footer-games">{games} GAMES</span>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <PlayerModal player={selected} onClose={() => setSelected(null)} tournament={tournament} teamLogos={teamLogos} playerImages={playerImages} />
      )}
    </>
  );
}
