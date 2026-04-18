/**
 * Scrape LFL 2026 depuis gol.gg
 * Splits : Spring Split + Invitational
 * Export → frontend/public/leagues/2026/lfl-2026/export.json
 *
 * Usage : npx tsx leagues/2026/lfl-2026/scrape.ts
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeAllRatings } from '../../../src/rating/engine.js';
import type { PlayerStats } from '../../../src/rating/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SPLITS = [
  { key: 'spring',       name: 'LFL 2026 Spring Split',  season: 'ALL' },
  { key: 'invitational', name: 'LFL 2026 Invitational',  season: 'ALL' },
];
const COMBINED_NAME = 'LFL 2026';
const BASE          = 'https://gol.gg';
const HEADERS       = { 'User-Agent': 'lol-esports-scraper/1.0 (stats research bot)', 'Accept': 'text/html' };
const VALID_ROLES   = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];
const ROLE_MAP: Record<string, string> = { TOP: 'TOP', JUNGLE: 'JGL', MID: 'MID', BOT: 'BOT', SUPPORT: 'SUP' };

const AVG_STATS = [
  'winRate', 'kda', 'avgKills', 'avgDeaths', 'avgAssists',
  'csm', 'gpm', 'kp', 'dmgPct', 'goldPct', 'vsPct',
  'dpm', 'vspm', 'avgWpm', 'avgWcpm', 'avgVwpm',
  'gd15', 'csd15', 'xpd15', 'fbPct', 'fbVictim',
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const enc   = (s: string)  => encodeURIComponent(s);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weightedAvg(rows: any[], key: string): number {
  const total = rows.reduce((s, r) => s + r.games, 0);
  return total > 0 ? rows.reduce((s, r) => s + r[key] * r.games, 0) / total : 0;
}

function toStats(row: any) {
  return {
    games: row.games, winRate: row.winRate, kda: row.kda,
    avgKills: row.avgKills, avgDeaths: row.avgDeaths, avgAssists: row.avgAssists,
    csm: row.csm, gpm: row.gpm, kp: row.kp,
    dmgPct: row.dmgPct, goldPct: row.goldPct, vsPct: row.vsPct,
    dpm: row.dpm, vspm: row.vspm,
    avgWpm: row.avgWpm, avgWcpm: row.avgWcpm, avgVwpm: row.avgVwpm,
    gd15: row.gd15, csd15: row.csd15, xpd15: row.xpd15,
    fbPct: row.fbPct, fbVictim: row.fbVictim,
    pentaKills: row.pentaKills, soloKills: row.soloKills,
  };
}

function toLirInput(p: any): PlayerStats {
  return {
    role: (VALID_ROLES.includes(p.role) ? p.role : 'MID') as any,
    games: p.games, winRate: p.winRate, kda: p.kda,
    avgAssists: p.avgAssists, avgDeaths: p.avgDeaths, csm: p.csm,
    kp: p.kp, dpm: p.dpm, dmgPct: p.dmgPct,
    gpm: p.gpm, goldPct: p.goldPct,
    gd15: p.gd15, csd15: p.csd15, xpd15: p.xpd15,
  };
}

function computeRatingsForGroup(group: any[], getStats: (p: any) => any) {
  const lirInputs = group.map(p => toLirInput({ ...getStats(p), role: p.role }));
  return computeAllRatings(lirInputs);
}

function makeCombined(rows: any[]): any {
  const totalGames = rows.reduce((s, r) => s + r.games, 0);
  const comb: any = { games: totalGames };
  for (const stat of AVG_STATS) comb[stat] = weightedAvg(rows, stat);
  comb.pentaKills = rows.reduce((s, r) => s + r.pentaKills, 0);
  comb.soloKills  = rows.reduce((s, r) => s + r.soloKills,  0);
  return comb;
}

// ─── 1. Rosters par split ─────────────────────────────────────────────────────

const roleMaps  = new Map<string, Map<string, { role: string; team: string }>>();
const teamLogos = new Map<string, string>();

for (const split of SPLITS) {
  const splitRoleMap = new Map<string, { role: string; team: string }>();
  roleMaps.set(split.key, splitRoleMap);

  const teamsHtml = await fetch(`${BASE}/teams/list/season-${split.season}/split-ALL/tournament-${enc(split.name)}/`, { headers: HEADERS }).then(r => r.text());
  const $t = cheerio.load(teamsHtml);
  const teams: { id: string; name: string }[] = [];

  $t('table.table_list tbody tr').each((_, row) => {
    const link  = $t(row).find('a').first();
    const match = (link.attr('href') ?? '').match(/team-stats\/(\d+)\//);
    if (match && link.text().trim()) teams.push({ id: match[1], name: link.text().trim() });
  });

  process.stdout.write(`[roster] ${split.name} — 0/${teams.length} équipes`);

  for (const [i, team] of teams.entries()) {
    await sleep(600);
    const html = await fetch(`${BASE}/teams/team-stats/${team.id}/split-ALL/tournament-${enc(split.name)}/`, { headers: HEADERS }).then(r => r.text());
    const $ = cheerio.load(html);

    if (!teamLogos.has(team.name)) {
      const logoSrc = $('img[src*="teams_icon"]').first().attr('src');
      if (logoSrc) teamLogos.set(team.name, `${BASE}/${logoSrc.replace(/^\.\.\//, '')}`);
    }

    $('table.table_list tbody tr').each((_, row) => {
      const cells    = $(row).find('td');
      if (cells.length < 2) return;
      const roleName = ROLE_MAP[$(cells[0]).text().trim().toUpperCase()];
      if (!roleName) return;
      const name = ($(cells[1]).find('a').first().text() || $(cells[1]).text()).trim();
      if (!name) return;
      splitRoleMap.set(name.toLowerCase(), { role: roleName, team: team.name });
    });

    process.stdout.write(`\r[roster] ${split.name} — ${i + 1}/${teams.length} équipes`);
  }
  console.log(`\r✓ roster     ${split.name} (${splitRoleMap.size} joueurs)`);
}

// ─── 2. Stats par split ───────────────────────────────────────────────────────

const byPlayer = new Map<number, { name: string; country: string; role: string | null; rows: Record<string, any> }>();

for (const split of SPLITS) {
  const splitRoleMap = roleMaps.get(split.key)!;
  const statsHtml = await fetch(`${BASE}/players/list/season-${split.season}/split-ALL/tournament-${enc(split.name)}/`, { headers: HEADERS }).then(r => r.text());
  const $s = cheerio.load(statsHtml);
  let count = 0;

  $s('table.table_list tbody tr').each((_, row) => {
    const cells   = $s(row).find('td');
    if (cells.length < 10) return;
    const link    = $s(cells[0]).find('a').first();
    const idMatch = (link.attr('href') ?? '').match(/player-stats\/(\d+)/);
    const golggId = idMatch ? parseInt(idMatch[1]) : 0;
    const name    = link.text().trim();
    if (!name || !golggId) return;

    const country      = $s(cells[1]).find('img').first().attr('alt')?.trim() ?? '';
    const rosterEntry  = splitRoleMap.get(name.toLowerCase());

    const n = (i: number) => {
      const v = parseFloat($s(cells[i]).text().replace('%', '').replace(',', '.').trim());
      return isNaN(v) ? 0 : v;
    };

    const rowData = {
      team: rosterEntry?.team ?? '',
      role: rosterEntry?.role ?? null,
      games: n(2), winRate: n(3), kda: n(4),
      avgKills: n(5), avgDeaths: n(6), avgAssists: n(7),
      csm: n(8), gpm: n(9), kp: n(10),
      dmgPct: n(11), goldPct: n(12), vsPct: n(13),
      dpm: n(14), vspm: n(15),
      avgWpm: n(16), avgWcpm: n(17), avgVwpm: n(18),
      gd15: n(19), csd15: n(20), xpd15: n(21),
      fbPct: n(22), fbVictim: n(23), pentaKills: n(24), soloKills: n(25),
    };

    if (!byPlayer.has(golggId)) {
      byPlayer.set(golggId, { name, country, role: rosterEntry?.role ?? null, rows: {} });
    }
    const entry = byPlayer.get(golggId)!;
    entry.rows[split.key] = rowData;
    if (rosterEntry?.role) entry.role = rosterEntry.role;
    count++;
  });

  console.log(`✓ stats      ${split.name} (${count} joueurs)`);
}

// ─── 3. Combined ──────────────────────────────────────────────────────────────

const players: any[] = [];

for (const [golggId, { name, country, role, rows }] of byPlayer) {
  const splitRows = Object.values(rows);
  if (splitRows.length === 0) continue;
  const lastRow = splitRows[splitRows.length - 1];
  players.push({ golggId, name, country, team: lastRow.team, role, rows, combined: makeCombined(splitRows) });
}

console.log(`  → ${players.length} joueurs fusionnés`);

// ─── 4. LIR par split + combined ─────────────────────────────────────────────

for (const split of SPLITS) {
  const group   = players.filter(p => p.rows[split.key]);
  const results = computeRatingsForGroup(group, p => p.rows[split.key]);
  group.forEach((p, i) => { p[`lir_${split.key}`] = results[i]; });
}

const combinedResults = computeRatingsForGroup(players, p => p.combined);
players.forEach((p, i) => { p.lirCombined = combinedResults[i]; });

// ─── 5. Export ────────────────────────────────────────────────────────────────

const exportData = {
  metadata: {
    exportedAt: new Date().toISOString(),
    tournaments: [{ name: COMBINED_NAME, league: 'LFL', year: 2026, split: 'Spring', scrapedAt: new Date().toISOString() }],
  },
  teamLogos: Object.fromEntries(teamLogos),

  players: players.map(p => {
    const tournaments: Record<string, any> = {};

    for (const split of SPLITS) {
      if (p.rows[split.key]) {
        tournaments[split.name] = {
          ...toStats(p.rows[split.key]),
          team: p.rows[split.key].team,
          ...(p[`lir_${split.key}`] ?? {}),
        };
      }
    }
    tournaments[COMBINED_NAME] = { ...toStats(p.combined), ...(p.lirCombined ?? {}) };

    return {
      id: p.golggId, name: p.name, country: p.country, team: p.team,
      role: p.role ?? 'UNK',
      rating:     p.lirCombined?.rating,
      confidence: p.lirCombined?.confidence,
      subscores:  p.lirCombined?.subscores,
      tournaments,
      aggregated: { totalGames: p.combined.games, avgWinRate: p.combined.winRate, avgKda: p.combined.kda },
    };
  }),
};

const withRole = players.filter(p => p.role).length;
console.log(`✓ logos      ${teamLogos.size} équipes avec logo`);
const outPath = path.join(__dirname, '../../../frontend/public/leagues/2026/lfl-2026/export.json');
const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
fs.writeFileSync(outPath, JSON.stringify({ ...exportData, playerImages: existing.playerImages ?? {} }, null, 2));
console.log(`✓ export     ${COMBINED_NAME} (${players.length} joueurs, ${withRole} avec rôle)`);
