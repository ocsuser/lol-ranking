import { useEffect, useState } from 'react';

const LS_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LS_BASE = 'https://esports-api.lolesports.com/persisted/gw';
const LS_HEADERS = { 'x-api-key': LS_KEY };
const DD = '16.8.1';

interface ParticipantMeta {
  participantId: number;
  summonerName: string;
  championId: string;
  role: string;
}
interface TeamMeta {
  esportsTeamId: string;
  participantMetadata: ParticipantMeta[];
}
interface ParticipantFrame {
  participantId: number;
  totalGold: number;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  creepScore: number;
  items?: number[];
}
interface TeamFrame {
  totalGold: number;
  inhibitors: number;
  towers: number;
  barons: number;
  totalKills: number;
  dragons: string[];
  participants: ParticipantFrame[];
}
interface GameData {
  number: number;
  gameId: string;
  blueTeamId: string;
  redTeamId: string;
  meta: { blueTeamMetadata: TeamMeta; redTeamMetadata: TeamMeta } | null;
  blueFrame: TeamFrame | null;
  redFrame: TeamFrame | null;
}
export interface SbTeam {
  id: string;
  name: string;
  code: string;
  image: string;
  wins: number;
}

interface Props {
  matchId: string;
  teamA: SbTeam;
  teamB: SbTeam;
  startTime: string;
  onClose: () => void;
}

const ROLE_ORDER: Record<string, number> = { top: 0, jungle: 1, mid: 2, bottom: 3, support: 4 };
const ROLE_LABEL: Record<string, string> = { top: 'TOP', jungle: 'JGL', mid: 'MID', bottom: 'BOT', support: 'SUP' };
const ROLE_COLOR: Record<string, string> = {
  top:     'var(--role-top)',
  jungle:  'var(--role-jgl)',
  mid:     'var(--role-mid)',
  bottom:  'var(--role-bot)',
  support: 'var(--role-sup)',
};

function champIcon(id: string) { return `https://ddragon.leagueoflegends.com/cdn/${DD}/img/champion/${id}.png`; }
function itemIcon(id: number)  { return `https://ddragon.leagueoflegends.com/cdn/${DD}/img/item/${id}.png`; }
function fmtGold(g: number)    { return g >= 1000 ? `${(g / 1000).toFixed(1)}k` : String(g); }
function calcKP(k: number, a: number, total: number) {
  return total === 0 ? 0 : Math.round(((k + a) / total) * 100);
}

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABEL[role] ?? role.toUpperCase().slice(0, 3);
  const color = ROLE_COLOR[role] ?? 'var(--text-3)';
  return (
    <span className="sb-role-badge" style={{ '--role-c': color } as React.CSSProperties}>
      {label}
    </span>
  );
}

function ItemSlot({ itemId }: { itemId: number | null }) {
  if (!itemId) return <div className="sb-item sb-item--empty" />;
  return (
    <div className="sb-item">
      <img
        src={itemIcon(itemId)}
        alt={String(itemId)}
        className="sb-item__img"
        loading="lazy"
        onError={e => { (e.target as HTMLImageElement).closest('.sb-item')?.classList.add('sb-item--empty'); (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}

function PlayerRow({ meta, frame, teamKills }: { meta: ParticipantMeta; frame: ParticipantFrame; teamKills: number }) {
  const name = meta.summonerName.replace(/^\S+\s/, '');
  const kpPct = calcKP(frame.kills, frame.assists, teamKills);
  const kdaVal = frame.deaths === 0 ? '∞' : ((frame.kills + frame.assists) / frame.deaths).toFixed(1);
  const items = frame.items ?? [];
  // 6 item slots + trinket (slot 6)
  const slots = Array.from({ length: 7 }, (_, i) => items[i] ?? null);

  return (
    <div className="sb-row">
      {/* Role */}
      <div className="sb-row__role"><RoleBadge role={meta.role} /></div>

      {/* Champion */}
      <div className="sb-row__champ">
        <div className="sb-row__champ-wrap">
          <img
            src={champIcon(meta.championId)}
            alt={meta.championId}
            className="sb-row__champ-img"
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
          />
          <span className="sb-row__level">{frame.level}</span>
        </div>
      </div>

      {/* Name + champion */}
      <div className="sb-row__name">
        <span className="sb-row__player">{name}</span>
        <span className="sb-row__champ-name">{meta.championId}</span>
      </div>

      {/* K/D/A */}
      <div className="sb-row__kda-block">
        <span className="sb-row__kda">
          <span className="sb-kda-k">{frame.kills}</span>
          <span className="sb-kda-sep">/</span>
          <span className="sb-kda-d">{frame.deaths}</span>
          <span className="sb-kda-sep">/</span>
          <span className="sb-kda-a">{frame.assists}</span>
        </span>
        <span className="sb-row__kp">{kpPct}% KP</span>
      </div>

      {/* Items */}
      <div className="sb-row__items">
        {slots.slice(0, 6).map((id, i) => <ItemSlot key={i} itemId={id} />)}
        <div className="sb-item-sep" />
        <ItemSlot itemId={slots[6]} />
      </div>

      {/* Gold */}
      <div className="sb-row__gold">{fmtGold(frame.totalGold)}</div>

      {/* CS */}
      <div className="sb-row__cs">{frame.creepScore}</div>

      {/* KDA ratio */}
      <div className="sb-row__kda-ratio">{kdaVal}</div>
    </div>
  );
}

function TeamSection({ teamMeta, teamFrame, gameData, allTeams }: {
  teamMeta: TeamMeta;
  teamFrame: TeamFrame;
  gameData: GameData;
  allTeams: SbTeam[];
}) {
  const isBlue = gameData.blueTeamId === teamMeta.esportsTeamId;
  const side = isBlue ? 'blue' : 'red';
  const team = allTeams.find(t => t.id === teamMeta.esportsTeamId);
  const sorted = [...teamMeta.participantMetadata].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  return (
    <div className={`sb-team sb-team--${side}`}>
      <div className="sb-team-banner">
        <div className="sb-team-banner__left">
          {team?.image && (
            <img src={team.image} alt={team.code} className="sb-team-banner__logo"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span className="sb-team-banner__name">{team?.name ?? team?.code}</span>
          <span className={`sb-side-badge sb-side-badge--${side}`}>{side === 'blue' ? 'Blue side' : 'Red side'}</span>
        </div>
        <div className="sb-team-banner__right">
          <span className="sb-team-banner__kills">{teamFrame.totalKills}<span>KILLS</span></span>
          <div className="sb-team-banner__obj">
            <span className="sb-obj-item" title="Towers">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 9h6M3 9V5l-1-1V2h6v2l-1 1v4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
              {teamFrame.towers}
            </span>
            {teamFrame.barons > 0 && (
              <span className="sb-obj-item" title="Barons">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1l1.2 2.6H9L6.9 5.4l.8 2.6L5 6.5 2.3 8l.8-2.6L1 3.6h2.8z" fill="currentColor"/>
                </svg>
                {teamFrame.barons}
              </span>
            )}
          </div>
          <span className="sb-team-banner__gold">{fmtGold(teamFrame.totalGold)}</span>
        </div>
      </div>

      <div className="sb-col-header">
        <div />
        <div />
        <div>Player</div>
        <div className="sb-col-h-kda">K / D / A</div>
        <div className="sb-col-h-items">Items</div>
        <div className="sb-col-h-gold">Gold</div>
        <div className="sb-col-h-cs">CS</div>
        <div className="sb-col-h-ratio">KDA</div>
      </div>

      {sorted.map(p => {
        const frame = teamFrame.participants.find(f => f.participantId === p.participantId);
        return frame ? <PlayerRow key={p.participantId} meta={p} frame={frame} teamKills={teamFrame.totalKills} /> : null;
      })}
    </div>
  );
}

export default function MatchScoreboard({ matchId, teamA, teamB, startTime, onClose }: Props) {
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeGame, setActiveGame] = useState(0);

  useEffect(() => {
    setLoading(true); setError(false);
    const lateTime = new Date(new Date(startTime).getTime() + 2 * 3600 * 1000).toISOString();

    const run = async () => {
      try {
        const detailsRes = await fetch(`${LS_BASE}/getEventDetails?hl=en-US&id=${matchId}`, { headers: LS_HEADERS });
        const details = await detailsRes.json();
        const gameList: any[] = (details.data?.event?.match?.games ?? []).filter((g: any) => g.state === 'completed');
        if (!gameList.length) throw new Error('no games');

        const result: GameData[] = await Promise.all(gameList.map(async g => {
          const blueId = g.teams.find((t: any) => t.side === 'blue')?.id ?? '';
          const redId  = g.teams.find((t: any) => t.side === 'red')?.id ?? '';
          try {
            // Fetch window (for team stats) + details (for items) in parallel
            const [wRes, dRes] = await Promise.all([
              fetch(`https://feed.lolesports.com/livestats/v1/window/${g.id}?startingTime=${lateTime}`, { headers: LS_HEADERS }),
              fetch(`https://feed.lolesports.com/livestats/v1/details/${g.id}?startingTime=${lateTime}`, { headers: LS_HEADERS }),
            ]);
            const [w, d] = await Promise.all([wRes.json(), dRes.json()]);

            const wFrames: any[] = w.frames ?? [];
            const dFrames: any[] = d.frames ?? [];
            const lastW = [...wFrames].reverse().find(f => f.gameState === 'finished') ?? wFrames[wFrames.length - 1];
            const lastD = [...dFrames].reverse().find(f => f.participants?.length) ?? dFrames[dFrames.length - 1];

            // Build items map: participantId → items[]
            const itemsMap: Record<number, number[]> = {};
            for (const p of (lastD?.participants ?? [])) {
              itemsMap[p.participantId] = p.items ?? [];
            }

            // Merge items into window frames
            const mergeItems = (teamFrame: any) => ({
              ...teamFrame,
              participants: (teamFrame?.participants ?? []).map((p: any) => ({
                ...p,
                items: itemsMap[p.participantId] ?? [],
              })),
            });

            return {
              number: g.number, gameId: g.id, blueTeamId: blueId, redTeamId: redId,
              meta: w.gameMetadata ? {
                blueTeamMetadata: w.gameMetadata.blueTeamMetadata,
                redTeamMetadata:  w.gameMetadata.redTeamMetadata,
              } : null,
              blueFrame: lastW?.blueTeam ? mergeItems(lastW.blueTeam) : null,
              redFrame:  lastW?.redTeam  ? mergeItems(lastW.redTeam)  : null,
            };
          } catch {
            return { number: g.number, gameId: g.id, blueTeamId: blueId, redTeamId: redId, meta: null, blueFrame: null, redFrame: null };
          }
        }));

        setGames(result);
      } catch { setError(true); }
      finally  { setLoading(false); }
    };
    run();
  }, [matchId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const game = games[activeGame];
  const blueGold  = game?.blueFrame?.totalGold ?? 0;
  const redGold   = game?.redFrame?.totalGold  ?? 0;
  const totalGold = blueGold + redGold;
  const goldBarPct = totalGold > 0 ? Math.round((blueGold / totalGold) * 100) : 50;

  return (
    <div className="sb-overlay" onClick={onClose}>
      <div className="sb-panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Match Scoreboard">

        {/* Header */}
        <div className="sb-header">
          <div className="sb-header__matchup">
            <div className="sb-header__team">
              {teamA.image && <img src={teamA.image} alt={teamA.code} className="sb-header__logo" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
              <span className="sb-header__code">{teamA.code}</span>
            </div>
            <div className="sb-header__score">
              <span className={teamA.wins > teamB.wins ? 'sb-score--win' : 'sb-score--loss'}>{teamA.wins}</span>
              <span className="sb-score--sep">:</span>
              <span className={teamB.wins > teamA.wins ? 'sb-score--win' : 'sb-score--loss'}>{teamB.wins}</span>
            </div>
            <div className="sb-header__team sb-header__team--right">
              <span className="sb-header__code">{teamB.code}</span>
              {teamB.image && <img src={teamB.image} alt={teamB.code} className="sb-header__logo" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            </div>
          </div>
          {!loading && !error && totalGold > 0 && (
            <div className="sb-gold-bar" title={`Blue: ${fmtGold(blueGold)} · Red: ${fmtGold(redGold)}`}>
              <div className="sb-gold-bar__fill" style={{ width: `${goldBarPct}%` }} />
            </div>
          )}
          <button className="sb-close" onClick={onClose} aria-label="Close">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Game tabs */}
        {!loading && !error && games.length > 1 && (
          <div className="sb-tabs">
            {games.map((g, i) => (
              <button key={g.gameId} className={`sb-tab${activeGame === i ? ' sb-tab--active' : ''}`} onClick={() => setActiveGame(i)}>
                Game {g.number}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="sb-body">
          {loading && <div className="sb-state"><div className="sb-spinner" /><span>Loading scoreboard</span></div>}
          {!loading && error && <div className="sb-state">Scoreboard unavailable for this match.</div>}
          {!loading && !error && game && game.meta && game.blueFrame && game.redFrame && (
            <div className="sb-teams">
              <TeamSection teamMeta={game.meta.blueTeamMetadata} teamFrame={game.blueFrame} gameData={game} allTeams={[teamA, teamB]} />
              <div className="sb-teams-divider" />
              <TeamSection teamMeta={game.meta.redTeamMetadata} teamFrame={game.redFrame} gameData={game} allTeams={[teamA, teamB]} />
            </div>
          )}
          {!loading && !error && game && (!game.meta || !game.blueFrame) && (
            <div className="sb-state">Detailed stats not available for Game {game?.number}.</div>
          )}
        </div>
      </div>
    </div>
  );
}
