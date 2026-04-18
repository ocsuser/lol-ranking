import { useEffect, useState } from 'react';
import type { ExportData, Player, Role } from '../types';
import { enrichPlayers, getPlayerStats, ROLE_COLOR } from '../utils';
import { type YearConfig } from '../leagues';
import PlayerSheet from './PlayerSheet';

const ROLES: Role[] = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];
const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JGL: 'Jungle', MID: 'Mid', BOT: 'Bot', SUP: 'Support' };
const ROLE_SHORT: Record<Role, string> = { TOP: 'TOP', JGL: 'JGL', MID: 'MID', BOT: 'BOT', SUP: 'SUP' };

interface LeagueData {
  id: string;
  label: string;
  logo?: string;
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
      id: l.id, label: l.label, logo: l.logo, players: [], teamLogos: {}, playerImages: {}, loading: true, error: false,
    }))
  );
  useEffect(() => {
    setLeaguesData(yearConfig.leagues.filter(l => l.available).map(l => ({
      id: l.id, label: l.label, logo: l.logo, players: [], teamLogos: {}, playerImages: {}, loading: true, error: false,
    })));
    yearConfig.leagues.filter(l => l.available).forEach(league => {
      fetch(`/leagues/${league.file}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d: ExportData) => {
          const t = d.metadata.tournaments[0]?.name;
          setLeaguesData(prev => prev.map(ld =>
            ld.id === league.id
              ? { ...ld, players: enrichPlayers(d.players, t), teamLogos: d.teamLogos ?? {}, playerImages: d.playerImages ?? {}, loading: false }
              : ld
          ));
        })
        .catch(() => setLeaguesData(prev => prev.map(ld =>
          ld.id === league.id ? { ...ld, loading: false, error: true } : ld
        )));
    });
  }, [yearConfig.year]);
  return leaguesData;
}

/* ── Single player hero card ─────────────────────────────── */
function PlayerHeroCard({
  player, playerImages, teamLogos, leagueLabel, onOpen,
}: {
  player: Player;
  playerImages: Record<string, string>;
  teamLogos: Record<string, string>;
  leagueLabel: string;
  onOpen: () => void;
}) {
  const rating = player.rating ?? 0;
  const roleColor = ROLE_COLOR[player.role as Role] ?? 'var(--accent)';
  const imgSrc = playerImages[player.name] || null;
  const stats = getPlayerStats(player);

  return (
    <div className="phero" onClick={onOpen}>
      <div className="phero__scanlines" />
      <div className="phero__gradient" />

      <img
        src={imgSrc ?? '/player-images/unknown.png'}
        alt={player.name}
        className="phero__img"
        onError={e => {
          const el = e.currentTarget as HTMLImageElement;
          if (el.src.includes('unknown.png')) return;
          el.src = '/player-images/unknown.png';
          el.classList.add('phero__img--unknown');
        }}
      />

      <div className="phero__content">
        <div className="phero__eyebrow">
          <span className="phero__eyebrow-dash">—</span>
          <span>{leagueLabel}</span>
          <span className="phero__eyebrow-dot">·</span>
          <span>CURRENT LEADER</span>
          {stats && (
            <>
              <span className="phero__eyebrow-dot">·</span>
              <span>{stats.games}G</span>
            </>
          )}
        </div>

        <div className="phero__name">{player.name.toUpperCase()}</div>

        <div className="phero__meta">
          <span className="phero__role" style={{ color: roleColor }}>
            {ROLE_SHORT[player.role as Role] ?? player.role}
          </span>
          <span className="phero__meta-sep">·</span>
          {teamLogos[player.team] && (
            <img src={teamLogos[player.team]} alt={player.team} className="phero__team-logo" />
          )}
          <span className="phero__team">{player.team}</span>
          {player.country && (
            <>
              <span className="phero__meta-sep">·</span>
              <span className="phero__country">{player.country}</span>
            </>
          )}
        </div>

        <div className="phero__rating-row">
          <span className="phero__rating">{rating.toFixed(1)}</span>
          <span className="phero__rating-label">RATING</span>
        </div>
      </div>
    </div>
  );
}

/* ── League card ─────────────────────────────────────────── */
function LeagueCard({ ld, onSelect }: { ld: LeagueData; onSelect: () => void }) {
  const [selected, setSelected] = useState<Player | null>(null);

  const sorted = [...ld.players]
    .filter(p => p.rating !== undefined)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const bestByRole: Record<Role, Player | undefined> = {
    TOP: undefined, JGL: undefined, MID: undefined, BOT: undefined, SUP: undefined,
  };
  for (const role of ROLES) {
    bestByRole[role] = sorted.find(p => p.role === role);
  }

  return (
    <div className="league-card">
      {/* Header strip */}
      <div className="league-card__header">
        <div className="league-card__header-left">
          {ld.logo && <img src={ld.logo} alt={ld.label} className="league-card__logo" />}
          <span className="league-card__label">{ld.label}</span>
          {!ld.loading && !ld.error && (
            <span className="league-card__count">{ld.players.length} players</span>
          )}
        </div>
        <button className="league-card__btn" onClick={onSelect}>Rankings →</button>
      </div>

      {ld.loading ? (
        <div className="league-card__state">Loading…</div>
      ) : ld.error ? (
        <div className="league-card__state league-card__state--err">Data unavailable</div>
      ) : (
        <div className="phero-grid">
          {ROLES.map(role => {
            const p = bestByRole[role];
            if (!p) return (
              <div key={role} className="phero phero--empty">
                <div className="phero__content">
                  <div className="phero__eyebrow">
                    <span className="phero__eyebrow-dash">—</span>
                    <span>{ld.label}</span>
                  </div>
                  <div className="phero__name" style={{ color: 'var(--text-4)', fontSize: 32 }}>—</div>
                  <div className="phero__meta">
                    <span className="phero__role" style={{ color: ROLE_COLOR[role] }}>
                      {ROLE_LABEL[role]}
                    </span>
                  </div>
                </div>
              </div>
            );
            return (
              <PlayerHeroCard
                key={role}
                player={p}
                playerImages={ld.playerImages}
                teamLogos={ld.teamLogos}
                leagueLabel={ld.label}
                onOpen={() => setSelected(p)}
              />
            );
          })}
        </div>
      )}

      {selected && (
        <PlayerSheet player={selected} onClose={() => setSelected(null)} teamLogos={ld.teamLogos} playerImages={ld.playerImages} />
      )}
    </div>
  );
}

export default function YearOverview({ yearConfig, onSelectLeague }: Props) {
  const leaguesData = useAllLeaguesData(yearConfig);
  return (
    <div className="year-overview">
      {leaguesData.map(ld => (
        <LeagueCard key={ld.id} ld={ld} onSelect={() => onSelectLeague(ld.id)} />
      ))}
    </div>
  );
}
