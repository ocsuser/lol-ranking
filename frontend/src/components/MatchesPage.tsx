import { useEffect, useState } from 'react';
import type { LeagueConfig } from '../leagues';
import { useLang } from '../i18n';

const LS_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LS_BASE = 'https://esports-api.lolesports.com/persisted/gw';
const LS_HEADERS = { 'x-api-key': LS_KEY };

interface MatchTeam { name: string; code: string; image: string; wins: number; }
interface Match {
  id: string; startTime: string;
  state: 'completed' | 'inProgress' | 'unstarted';
  blockName: string; leagueLabel: string; leagueLogo?: string;
  teamA: MatchTeam; teamB: MatchTeam; bestOf: number;
}

type MatchFilter = 'all' | 'upcoming' | 'completed';

function formatDayLabel(dateStr: string, today_: string, tomorrow_: string, yesterday_: string, locale: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return today_;
  if (sameDay(d, tomorrow)) return tomorrow_;
  if (sameDay(d, yesterday)) return yesterday_;
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function MatchRow({ match }: { match: Match }) {
  const isLive = match.state === 'inProgress';
  const isDone = match.state === 'completed';
  const aWin = isDone && match.teamA.wins > match.teamB.wins;
  const bWin = isDone && match.teamB.wins > match.teamA.wins;

  return (
    <div className={`mrow${isLive ? ' mrow--live' : ''}${isDone ? ' mrow--done' : ''}`}>
      {/* Left: time + league */}
      <div className="mrow__meta">
        <span className="mrow__time">
          {isLive ? <span className="mrow__live-dot" /> : null}
          {isLive ? 'LIVE' : formatTime(match.startTime)}
        </span>
        <div className="mrow__league">
          {match.leagueLogo && <img src={match.leagueLogo} alt={match.leagueLabel} className="mrow__league-logo" />}
          <span className="mrow__league-label">{match.leagueLabel}</span>
        </div>
        <span className="mrow__block">{match.blockName}</span>
      </div>

      {/* Center: teams + score */}
      <div className="mrow__matchup">
        {/* Team A */}
        <div className={`mrow__team mrow__team--a${aWin ? ' mrow__team--win' : ''}${bWin ? ' mrow__team--loss' : ''}`}>
          <span className="mrow__code">{match.teamA.code}</span>
          <img src={match.teamA.image} alt={match.teamA.code} className="mrow__logo" />
        </div>

        {/* Score / VS */}
        <div className="mrow__center">
          {isDone ? (
            <div className="mrow__score">
              <span className={aWin ? 'mrow__score-num mrow__score-num--win' : 'mrow__score-num'}>{match.teamA.wins}</span>
              <span className="mrow__score-sep">:</span>
              <span className={bWin ? 'mrow__score-num mrow__score-num--win' : 'mrow__score-num'}>{match.teamB.wins}</span>
            </div>
          ) : (
            <span className="mrow__vs">VS</span>
          )}
          <span className="mrow__bo">BO{match.bestOf}</span>
        </div>

        {/* Team B */}
        <div className={`mrow__team mrow__team--b${bWin ? ' mrow__team--win' : ''}${aWin ? ' mrow__team--loss' : ''}`}>
          <img src={match.teamB.image} alt={match.teamB.code} className="mrow__logo" />
          <span className="mrow__code">{match.teamB.code}</span>
        </div>
      </div>
    </div>
  );
}

interface Props { leagues: LeagueConfig[]; year: number; selectedLeagueLabel: string | null; }

export default function MatchesPage({ leagues, year, selectedLeagueLabel }: Props) {
  const { t, lang } = useLang();
  const fetchableLeagues = leagues.filter(l => l.lolEsportsId);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
  const leagueFilter = selectedLeagueLabel ?? 'all';
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';

  useEffect(() => {
    setMatches([]); setLoading(true);
    const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime();
    const fetchAll = async () => {
      const all: Match[] = [];
      await Promise.all(fetchableLeagues.map(async league => {
        try {
          const seen = new Set<string>();
          let olderToken: string | null = null;
          let fetchedFuture = false;

          const parseEvents = (events: any[]) => {
            for (const e of events) {
              if (e.type !== 'match' || e.match?.teams?.length !== 2) continue;
              if (seen.has(e.match.id)) continue;
              seen.add(e.match.id);
              const [a, b] = e.match.teams;
              all.push({
                id: e.match.id, startTime: e.startTime, state: e.state,
                blockName: e.blockName ?? '', leagueLabel: league.label, leagueLogo: league.logo,
                teamA: { name: a.name, code: a.code, image: a.image, wins: a.result?.gameWins ?? 0 },
                teamB: { name: b.name, code: b.code, image: b.image, wins: b.result?.gameWins ?? 0 },
                bestOf: e.match.strategy?.count ?? 1,
              });
            }
          };

          // First page (includes future + recent past)
          const res = await fetch(`${LS_BASE}/getSchedule?hl=en-US&leagueId=${league.lolEsportsId}`, { headers: LS_HEADERS });
          const json = await res.json();
          const schedule = json.data?.schedule;
          parseEvents(schedule?.events ?? []);
          olderToken = schedule?.pages?.older ?? null;
          fetchedFuture = true;

          // Paginate older until we reach start of selected year
          while (olderToken) {
            const r = await fetch(
              `${LS_BASE}/getSchedule?hl=en-US&leagueId=${league.lolEsportsId}&pageToken=${encodeURIComponent(olderToken)}`,
              { headers: LS_HEADERS }
            );
            const j = await r.json();
            const s = j.data?.schedule;
            const events: any[] = s?.events ?? [];
            parseEvents(events);
            olderToken = s?.pages?.older ?? null;
            const oldest = events[events.length - 1];
            if (oldest && new Date(oldest.startTime).getTime() < yearStart) break;
          }
          void fetchedFuture;
        } catch {}
      }));
      all.sort((a, b) => {
        const ta = new Date(a.startTime).getTime();
        const tb = new Date(b.startTime).getTime();
        // upcoming first (ascending), then completed (descending)
        if (a.state === 'unstarted' && b.state !== 'unstarted') return -1;
        if (b.state === 'unstarted' && a.state !== 'unstarted') return 1;
        if (a.state === 'unstarted') return ta - tb;
        return tb - ta;
      });
      setMatches(all); setLoading(false);
    };
    fetchAll();
  }, [leagues.map(l => l.id).join(','), year, refreshKey]);

  const filtered = matches.filter(m => {
    if (m.state === 'inProgress') return false;
    const t = new Date(m.startTime).getTime();
    if (t < new Date(`${year}-01-01T00:00:00Z`).getTime()) return false;
    if (t > new Date(`${year}-12-31T23:59:59Z`).getTime()) return false;
    if (leagueFilter !== 'all' && m.leagueLabel !== leagueFilter) return false;
    if (matchFilter === 'upcoming') return m.state === 'unstarted';
    if (matchFilter === 'completed') return m.state === 'completed';
    return true;
  });

  // Group by day
  const groups = new Map<string, { label: string; matches: Match[] }>();
  for (const m of filtered) {
    const key = formatDayKey(m.startTime);
    if (!groups.has(key)) groups.set(key, { label: formatDayLabel(m.startTime, t.today, t.tomorrow, t.yesterday, locale), matches: [] });
    groups.get(key)!.matches.push(m);
  }
  const dayGroups = Array.from(groups.entries());

  return (
    <div className="matches-page">
      {/* Toolbar */}
      <div className="matches-toolbar">
        <div className="matches-filters">
          {(['all', 'upcoming', 'completed'] as MatchFilter[]).map(f => (
            <button key={f} className={`mfilter-btn${matchFilter === f ? ' mfilter-btn--active' : ''}`} onClick={() => setMatchFilter(f)}>
              {f === 'all' ? t.all : f === 'upcoming' ? t.upcoming : t.results}
            </button>
          ))}
        </div>
        <span className="matches-count">{filtered.length} matches</span>
        <button
          className="mfilter-btn"
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          title="Refresh matches"
          style={{ marginLeft: 4, opacity: loading ? 0.4 : 1 }}
        >
          {loading ? '↻' : '↻'} Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="matches-skeleton">
          {Array.from({ length: 3 }).map((_, g) => (
            <div key={g} className="matches-skeleton__group">
              <div className="skeleton" style={{ height: 16, width: 120, marginBottom: 12, borderRadius: 3 }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-row" style={{ height: 56, marginBottom: 4, opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="matches-empty">{t.noMatches}</div>
      ) : (
        <div className="matches-days">
          {dayGroups.map(([key, group]) => (
            <div key={key} className="matches-day">
              <div className="matches-day__header">
                <span className="matches-day__label">{group.label}</span>
                <span className="matches-day__count">{group.matches.length}</span>
              </div>
              <div className="matches-day__list">
                {group.matches.map(m => <MatchRow key={m.id} match={m} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
