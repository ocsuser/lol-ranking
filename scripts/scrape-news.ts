/**
 * Scrape news from OneEsports RSS + recent match results from Lolesports API
 * Output → frontend/public/news.json
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../frontend/public/news.json');
const LOLESPORTS_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LS_HEADERS = { 'x-api-key': LOLESPORTS_KEY };

// Leagues to fetch schedule for
const LEAGUES = [
  { id: '98767991310872058', name: 'LCK',         slug: 'lck' },
  { id: '98767991314006698', name: 'LPL',         slug: 'lpl' },
  { id: '98767991302996019', name: 'LEC',         slug: 'lec' },
  { id: '98767991299243165', name: 'LCS',         slug: 'lcs' },
  { id: '113464388705111224', name: 'First Stand', slug: 'first_stand' },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── RSS Parser ───────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  link: string;
  author: string;
  pubDate: string;
  description: string;
  image: string | null;
  source: string;
}

function parseRSS(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
      return m ? m[1].trim() : '';
    };

    // Try to extract image from content:encoded or media:content or enclosure
    let image: string | null = null;
    const mediaContent = block.match(/media:content[^>]*url="([^"]+)"/);
    const enclosure = block.match(/enclosure[^>]*url="([^"]+)"/);
    const imgInContent = block.match(/<img[^>]+src="([^"]+)"/);
    if (mediaContent) image = mediaContent[1];
    else if (enclosure) image = enclosure[1];
    else if (imgInContent) image = imgInContent[1];

    const title = get('title');
    const link = get('link') || block.match(/<link>([^<]+)<\/link>/)?.[1]?.trim() || '';
    if (!title || !link) continue;

    // Strip HTML from description
    const rawDesc = get('description');
    const description = rawDesc.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim().slice(0, 200);

    items.push({
      title,
      link,
      author: get('dc:creator') || get('author') || source,
      pubDate: get('pubDate'),
      description,
      image,
      source,
    });
  }

  return items;
}

async function fetchRSS(url: string, source: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'lol-ranking-news-scraper/1.0' },
    });
    if (!res.ok) { console.warn(`RSS ${source} HTTP ${res.status}`); return []; }
    const xml = await res.text();
    const items = parseRSS(xml, source);
    console.log(`  ${source}: ${items.length} articles`);
    return items;
  } catch (e) {
    console.warn(`RSS ${source} failed:`, (e as Error).message);
    return [];
  }
}

// ─── Lolesports schedule ──────────────────────────────────────────────────────

interface MatchResult {
  id: string;
  startTime: string;
  state: 'completed' | 'inProgress' | 'unstarted';
  blockName: string;
  league: string;
  leagueSlug: string;
  teamA: { name: string; code: string; image: string; wins: number };
  teamB: { name: string; code: string; image: string; wins: number };
  bestOf: number;
}

async function fetchSchedule(leagueId: string, leagueName: string, leagueSlug: string): Promise<MatchResult[]> {
  try {
    const url = `https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US&leagueId=${leagueId}`;
    const res = await fetch(url, { headers: LS_HEADERS });
    if (!res.ok) { console.warn(`Schedule ${leagueName} HTTP ${res.status}`); return []; }
    const json = await res.json() as any;
    const events: any[] = json.data?.schedule?.events ?? [];

    const results: MatchResult[] = events
      .filter(e => e.type === 'match' && e.match?.teams?.length === 2)
      .map(e => {
        const [a, b] = e.match.teams;
        return {
          id: e.match.id,
          startTime: e.startTime,
          state: e.state,
          blockName: e.blockName ?? '',
          league: leagueName,
          leagueSlug,
          teamA: { name: a.name, code: a.code, image: a.image, wins: a.result?.gameWins ?? 0 },
          teamB: { name: b.name, code: b.code, image: b.image, wins: b.result?.gameWins ?? 0 },
          bestOf: e.match.strategy?.count ?? 1,
        };
      });

    console.log(`  ${leagueName}: ${results.length} matches`);
    return results;
  } catch (e) {
    console.warn(`Schedule ${leagueName} failed:`, (e as Error).message);
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching news...');

  // RSS sources
  const [teamAaa] = await Promise.all([
    fetchRSS('https://www.team-aaa.com/rss/portal_league-of-legends.xml', 'Team-AAA'),
  ]);

  const articles = [...teamAaa]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 50);

  console.log('\nFetching match schedules...');
  const allMatches: MatchResult[] = [];
  for (const league of LEAGUES) {
    const matches = await fetchSchedule(league.id, league.name, league.slug);
    allMatches.push(...matches);
    await sleep(300);
  }

  // Sort: inProgress first, then unstarted, then completed (most recent first)
  const stateOrder = { inProgress: 0, unstarted: 1, completed: 2 };
  allMatches.sort((a, b) => {
    const sd = stateOrder[a.state] - stateOrder[b.state];
    if (sd !== 0) return sd;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const output = {
    scrapedAt: new Date().toISOString(),
    articles,
    matches: allMatches,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`\nDone. ${articles.length} articles, ${allMatches.length} matches → ${OUT}`);
}

main().catch(console.error);
