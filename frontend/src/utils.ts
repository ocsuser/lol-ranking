import type { Player, TournamentStats, Role } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  TOP: 'Top', JGL: 'Jungle', MID: 'Mid', BOT: 'Bot', SUP: 'Support',
};

export const ROLE_COLOR: Record<Role, string> = {
  TOP: '#e05252', JGL: '#52c97a', MID: '#a87fde', BOT: '#e08c3c', SUP: '#5294e0',
};

export const TEAM_COLOR: Record<string, string> = {
  'Gen.G': '#b8960a',
  'T1': '#c0001f',
  'Dplus KIA': '#0a3a8a',
  'BNK FearX': '#d43050',
  'Kiwoom DRX': '#005fa3',
  'OKSavingsBank BRO': '#008040',
  'DN SOOPers': '#4a3a8a',
  'KT Rolster': '#cc0000',
  'HLE': '#d45c00',
  'NS RedForce': '#aa0020',
};

export function getPlayerStats(player: Player, tournament?: string): TournamentStats | null {
  if (tournament) return player.tournaments[tournament] ?? null;
  const entries = Object.values(player.tournaments);
  if (!entries.length) return null;
  if (entries.length === 1) return entries[0];
  // Weighted average across tournaments
  const total = entries.reduce((s, t) => s + t.games, 0);
  const avg = <K extends keyof TournamentStats>(key: K): number => {
    return entries.reduce((s, t) => s + (t[key] as number) * t.games, 0) / total;
  };
  return {
    games: total, winRate: avg('winRate'), kda: avg('kda'),
    avgKills: avg('avgKills'), avgDeaths: avg('avgDeaths'), avgAssists: avg('avgAssists'),
    csm: avg('csm'), gpm: avg('gpm'), kp: avg('kp'),
    dmgPct: avg('dmgPct'), goldPct: avg('goldPct'), vsPct: avg('vsPct'),
    dpm: avg('dpm'), vspm: avg('vspm'), avgWpm: avg('avgWpm'), avgWcpm: avg('avgWcpm'), avgVwpm: avg('avgVwpm'),
    gd15: avg('gd15'), csd15: avg('csd15'), xpd15: avg('xpd15'),
    fbPct: avg('fbPct'), fbVictim: avg('fbVictim'),
    pentaKills: avg('pentaKills'), soloKills: avg('soloKills'),
  };
}

export function enrichPlayers(players: Player[], tournament?: string): Player[] {
  return players.map(p => {
    if (tournament && p.tournaments[tournament]?.rating !== undefined) {
      return { ...p, rating: p.tournaments[tournament].rating };
    }
    return p;
  });
}

export function fmt(n: number | undefined, decimals = 1): string {
  if (n === undefined || n === null) return '—';
  return n.toFixed(decimals);
}

export function fmtSign(n: number | undefined): string {
  if (n === undefined || n === null) return '—';
  return (n >= 0 ? '+' : '') + Math.round(n);
}
