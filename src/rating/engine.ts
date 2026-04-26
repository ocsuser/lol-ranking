/**
 * LoL Impact Rating (LIR) engine — percentile-based
 *
 * Chaque stat → percentile (0-100) parmi les joueurs du même rôle.
 * Rating final = moyenne pondérée de percentiles, naturellement entre 0 et 100.
 */

export type Role = 'TOP' | 'JGL' | 'MID' | 'BOT' | 'SUP';

export interface PlayerStats {
  role: Role;
  games: number;
  winRate: number;
  kda: number;
  avgAssists: number;
  kp: number;
  dpm: number;
  dmgPct: number;
  gpm: number;
  goldPct: number;
  gd15: number;
  csd15: number;
  xpd15: number;
  avgDeaths: number;
  csm: number;
}

export interface LIRResult {
  rating: number;
  confidence: number;
  subscores: {
    laning: number;
    damage: number;
    presence: number;
    efficiency: number;
  };
}

const ROLE_WEIGHTS: Record<Role, { laning: number; damage: number; presence: number; efficiency: number }> = {
  TOP: { laning: 0.35, damage: 0.30, presence: 0.10, efficiency: 0.25 },
  JGL: { laning: 0.15, damage: 0.20, presence: 0.35, efficiency: 0.30 },
  MID: { laning: 0.25, damage: 0.30, presence: 0.20, efficiency: 0.25 },
  BOT: { laning: 0.25, damage: 0.35, presence: 0.15, efficiency: 0.25 },
  SUP: { laning: 0.15, damage: 0.10, presence: 0.40, efficiency: 0.35 },
};

/** Percentile rank : fraction des valeurs strictement inférieures + moitié des égales. */
function percentileRank(value: number, allValues: number[]): number {
  const n     = allValues.length;
  const below = allValues.filter(v => v < value).length;
  const equal = allValues.filter(v => v === value).length;
  return ((below + equal * 0.5) / n) * 100;
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeAllRatings(players: PlayerStats[]): LIRResult[] {
  const ROLES: Role[] = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];
  const results: LIRResult[] = new Array(players.length).fill(null);

  for (const role of ROLES) {
    const group: { idx: number; p: PlayerStats }[] = [];
    players.forEach((p, idx) => { if (p.role === role) group.push({ idx, p }); });
    if (!group.length) continue;

    const ps       = group.map(g => g.p);
    const medGames = median(ps.map(p => p.games));

    // Pre-compute value arrays for each stat in the group
    const vals = (stat: keyof PlayerStats): number[] => ps.map(p => p[stat] as number);

    const pct     = (v: number, stat: keyof PlayerStats) => percentileRank(v, vals(stat));
    const pctInv  = (v: number, stat: keyof PlayerStats) => 100 - percentileRank(v, vals(stat));

    // damageEfficiency = dmgPct / goldPct — pre-computed for the whole group
    const efficiencies = ps.map(p => (p.goldPct > 0 ? p.dmgPct / p.goldPct : 0));

    for (const { idx, p } of group) {
      // ── Laning ──────────────────────────────────────────────────────────
      const pctGD15  = pct(p.gd15,  'gd15');
      const pctCSD15 = pct(p.csd15, 'csd15');
      const pctXPD15 = pct(p.xpd15, 'xpd15');
      const laning   = (pctGD15 + pctCSD15 + pctXPD15) / 3;

      // ── Damage ───────────────────────────────────────────────────────────
      const pctDPM = pct(p.dpm, 'dpm');
      const dmgEff = p.goldPct > 0 ? p.dmgPct / p.goldPct : 0;
      const pctEff = percentileRank(dmgEff, efficiencies);
      const damage = 0.6 * pctDPM + 0.4 * pctEff;

      // ── Presence ─────────────────────────────────────────────────────────
      const presence = pct(p.kp, 'kp');

      // ── Efficiency ───────────────────────────────────────────────────────
      const pctDeaths = pctInv(p.avgDeaths, 'avgDeaths');
      const pctKDA    = pct(p.kda, 'kda');
      const pctCSM    = pct(p.csm, 'csm');
      const efficiency = role === 'SUP'
        ? 0.5  * pctDeaths + 0.5  * pctKDA
        : 0.35 * pctDeaths + 0.35 * pctKDA + 0.3 * pctCSM;

      // ── Rating ───────────────────────────────────────────────────────────
      const w         = ROLE_WEIGHTS[role];
      const raw       = w.laning * laning + w.damage * damage + w.presence * presence + w.efficiency * efficiency;
      const confidence = Math.min(1, p.games / medGames);
      const rating    = round1(50 + (raw - 50) * confidence);

      results[idx] = {
        rating,
        confidence: +confidence.toFixed(2),
        subscores: {
          laning:     round1(laning),
          damage:     round1(damage),
          presence:   round1(presence),
          efficiency: round1(efficiency),
        },
      };
    }
  }

  return results;
}
