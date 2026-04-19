import { useEffect, useState } from 'react';

const LS_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LS_BASE = 'https://esports-api.lolesports.com/persisted/gw';
const LS_HEADERS = { 'x-api-key': LS_KEY };

const LEAGUES = [
  { id: '98767991310872058', name: 'LCK' },
  { id: '98767991314006698', name: 'LPL' },
  { id: '98767991302996019', name: 'LEC' },
  { id: '98767991299243165', name: 'LCS' },
  { id: '113464388705111224', name: 'First Stand' },
];

interface MatchTeam { name: string; code: string; image: string; wins: number; }
interface Match {
  id: string; startTime: string;
  state: 'completed' | 'inProgress' | 'unstarted';
  blockName: string; league: string;
  teamA: MatchTeam; teamB: MatchTeam; bestOf: number;
}

type MatchFilter = 'all' | 'upcoming' | 'completed';

function formatMatchTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.state === 'inProgress';
  const isDone = match.state === 'completed';
  const aWin = isDone && match.teamA.wins > match.teamB.wins;
  const bWin = isDone && match.teamB.wins > match.teamA.wins;

  return (
    <div className="match-card">
      <div className="match-card__header">
        <span className="match-card__league">{match.league}</span>
        <span className="match-card__block">{match.blockName}</span>
      </div>
      <div className="match-card__teams">
        <div className={`match-card__team${aWin ? ' match-card__team--winner' : ''}${bWin ? ' match-card__team--loser' : ''}`}>
          <img src={match.teamA.image} alt={match.teamA.code} className="match-card__logo" />
          <span className="match-card__code">{match.teamA.code}</span>
          {isDone && <span className="match-card__score">{match.teamA.wins}</span>}
        </div>
        <div className="match-card__vs">{isDone ? '—' : 'VS'}</div>
        <div className={`match-card__team match-card__team--right${bWin ? ' match-card__team--winner' : ''}${aWin ? ' match-card__team--loser' : ''}`}>
          {isDone && <span className="match-card__score">{match.teamB.wins}</span>}
          <span className="match-card__code">{match.teamB.code}</span>
          <img src={match.teamB.image} alt={match.teamB.code} className="match-card__logo" />
        </div>
      </div>
      <div className="match-card__footer">
        <span className="match-card__time">{isLive ? 'In Progress' : formatMatchTime(match.startTime)}</span>
        <span className="match-card__bo">BO{match.bestOf}</span>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
  const [leagueFilter, setLeagueFilter] = useState<string>('all');

  useEffect(() => {
    const fetchAll = async () => {
      const all: Match[] = [];
      await Promise.all(LEAGUES.map(async league => {
        try {
          const res = await fetch(`${LS_BASE}/getSchedule?hl=en-US&leagueId=${league.id}`, { headers: LS_HEADERS });
          const json = await res.json();
          const events: any[] = json.data?.schedule?.events ?? [];
          for (const e of events) {
            if (e.type !== 'match' || e.match?.teams?.length !== 2) continue;
            const [a, b] = e.match.teams;
            all.push({
              id: e.match.id, startTime: e.startTime, state: e.state,
              blockName: e.blockName ?? '', league: league.name,
              teamA: { name: a.name, code: a.code, image: a.image, wins: a.result?.gameWins ?? 0 },
              teamB: { name: b.name, code: b.code, image: b.image, wins: b.result?.gameWins ?? 0 },
              bestOf: e.match.strategy?.count ?? 1,
            });
          }
        } catch {}
      }));
      all.sort((a, b) => {
        if (a.state === 'unstarted' && b.state === 'completed') return -1;
        if (b.state === 'unstarted' && a.state === 'completed') return 1;
        if (a.state === 'unstarted') return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      });
      setMatches(all);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = matches.filter(m => {
    if (m.state === 'inProgress') return false;
    if (leagueFilter !== 'all' && m.league !== leagueFilter) return false;
    if (matchFilter === 'upcoming') return m.state === 'unstarted';
    if (matchFilter === 'completed') return m.state === 'completed';
    return true;
  });

  return (
    <>
      <div className="ranking-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div className="filters" style={{ marginBottom: 0 }}>
            {(['all', 'upcoming', 'completed'] as MatchFilter[]).map(f => (
              <button key={f} className={`filter-btn ${matchFilter === f ? 'filter-btn--active' : ''}`} onClick={() => setMatchFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="filters" style={{ marginBottom: 0 }}>
            <button className={`filter-btn ${leagueFilter === 'all' ? 'filter-btn--active' : ''}`} onClick={() => setLeagueFilter('all')}>All</button>
            {LEAGUES.map(l => (
              <button key={l.id} className={`filter-btn ${leagueFilter === l.name ? 'filter-btn--active' : ''}`} onClick={() => setLeagueFilter(l.name)}>{l.name}</button>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} matches
        </span>
      </div>

      {loading ? (
        <div className="skeleton-table">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" style={{ height: 90, opacity: 1 - i * 0.08 }} />
          ))}
        </div>
      ) : (
        <div className="matches-grid">
          {filtered.length === 0
            ? <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>No matches</div>
            : filtered.map(m => <MatchCard key={m.id} match={m} />)
          }
        </div>
      )}
    </>
  );
}
