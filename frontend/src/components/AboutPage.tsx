import RoleTag from './RoleTag';
import type { Role } from '../types';
import { useLang } from '../i18n';

const ROLES: Role[] = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];

const PILLAR_WEIGHTS: Record<Role, { laning: number; damage: number; presence: number; efficiency: number }> = {
  TOP: { laning: 35, damage: 30, presence: 10, efficiency: 25 },
  JGL: { laning: 15, damage: 20, presence: 35, efficiency: 30 },
  MID: { laning: 25, damage: 30, presence: 20, efficiency: 25 },
  BOT: { laning: 25, damage: 35, presence: 15, efficiency: 25 },
  SUP: { laning: 15, damage: 10, presence: 40, efficiency: 35 },
};

const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JGL: 'Jungle', MID: 'Mid', BOT: 'Bot', SUP: 'Support' };

const CONTENT = {
  fr: {
    howItWorks: 'Comment fonctionne le rating ?',
    heroTitle: 'Le Rating est un score sur 100',
    heroPara1: (
      <>Chaque joueur reçoit une note entre <strong style={{ color: 'var(--text-1)' }}>0 et 100</strong> qui résume ses performances sur l'ensemble des statistiques disponibles. <strong style={{ color: 'var(--text-1)' }}>50 est la moyenne</strong> — un joueur à 50 est dans la norme de son rôle et de sa ligue. Un joueur à 75+ est considéré élite.</>
    ),
    heroPara2: (
      <>Le rating n'est <strong style={{ color: 'var(--text-1)' }}>pas un z-score ni une formule magique</strong> — c'est une agrégation de <strong style={{ color: 'var(--text-1)' }}>percentiles par rôle</strong>. Si tu es à 80, tu fais mieux que 80% des joueurs à ton poste dans la compétition.</>
    ),
    readingScore: 'Lecture du score',
    fourPillars: 'Les 4 piliers du rating',
    weightsByRole: 'Poids par rôle',
    weightsByRoleDesc: (
      <>Chaque rôle n'a pas les mêmes responsabilités en jeu — un support ne farme pas, un jungler roam plus qu'il ne lane. Les 4 piliers sont donc <strong style={{ color: 'var(--text-1)' }}>pondérés différemment selon le poste</strong>.</>
    ),
    confidenceFactor: 'Facteur de confiance',
    confidencePara: (
      <>Un joueur qui n'a joué que <strong style={{ color: 'var(--text-1)' }}>2 ou 3 parties</strong> peut avoir un rating extrême par chance. Pour éviter ça, le rating est <strong style={{ color: 'var(--text-1)' }}>ramené vers 50</strong> quand le nombre de games est faible.</>
    ),
    confidenceExample: <>Exemple : un joueur à 80 brut avec moitié moins de games que la médiane → <strong style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>50 + (80−50) × 0.5 = 65</strong>. Plus il joue, plus son rating reflète la réalité.</>,
    dataSource: 'Source des données',
    dataSourceDesc: (
      <>Toutes les statistiques sont issues de <strong style={{ color: 'var(--text-1)' }}>gol.gg</strong>, le site de référence pour les statistiques de LoL esport. Les données sont mises à jour manuellement après chaque tournoi.</>
    ),
    tiers: [
      { range: '75 – 100', label: 'Elite',         desc: 'Meilleur joueur de la compétition à son poste.' },
      { range: '60 – 75',  label: 'Très bon',       desc: 'Solide, dominante dans la plupart des métriques.' },
      { range: '45 – 60',  label: 'Moyen',          desc: 'Dans la moyenne du plateau.' },
      { range: '25 – 45',  label: 'En difficulté',  desc: 'Sous-performe face à ses pairs.' },
      { range: '0 – 25',   label: 'Faible',         desc: 'Niveau nettement inférieur.' },
    ],
    pillars: [
      {
        id: 'laning', label: 'Laning', icon: '⚔', color: 'var(--pillar-laning)',
        desc: 'Mesure la domination en early game, avant les 15 premières minutes de la partie.',
        stats: [
          { name: 'GD@15',      full: 'Gold Diff à 15 min', tip: 'Avance en or par rapport à l\'adversaire direct en lane à la 15e minute.' },
          { name: 'CSD@15',     full: 'CS Diff à 15 min',   tip: 'Avance en minions farmés par rapport au laner adverse.' },
          { name: 'XPD@15',     full: 'XP Diff à 15 min',   tip: 'Avance en expérience par rapport au laner adverse.' },
        ],
        formula: 'Laning = (GD@15 + CSD@15 + XPD@15) ÷ 3',
        note: 'Un score élevé signifie que le joueur gagne régulièrement sa lane.',
      },
      {
        id: 'damage', label: 'Damage', icon: '💥', color: 'var(--pillar-damage)',
        desc: 'Mesure la production de dégâts, en tenant compte du volume mais aussi de l\'efficacité.',
        stats: [
          { name: 'DPM',        full: 'Damage Per Minute',     tip: 'Dégâts infligés aux champions ennemis par minute de jeu.' },
          { name: 'DMG%/Gold%', full: 'Efficacité des dégâts', tip: 'Part des dégâts de l\'équipe produits par le joueur, ramenée à sa part des ressources consommées.' },
        ],
        formula: 'Damage = 60% × DPM + 40% × (DMG% ÷ Gold%)',
        note: 'Pas seulement qui tape fort — mais qui tape fort pour ce qu\'il consomme.',
      },
      {
        id: 'presence', label: 'Presence', icon: '🌐', color: 'var(--pillar-presence)',
        desc: 'Mesure l\'implication dans les combats d\'équipe et les kills.',
        stats: [
          { name: 'KP%', full: 'Kill Participation', tip: 'Pourcentage des kills de l\'équipe auxquels le joueur a participé (kill ou assist).' },
        ],
        formula: 'Presence = KP%',
        note: 'Un support ou un jungler très présent sur la map obtient un score élevé.',
      },
      {
        id: 'efficiency', label: 'Efficiency', icon: '🛡', color: 'var(--pillar-efficiency)',
        desc: 'Mesure la solidité individuelle : survivre, avoir un bon ratio, et farmer.',
        stats: [
          { name: 'Deaths', full: 'Morts par partie',          tip: 'Inversé : mourir peu = meilleur score.' },
          { name: 'KDA',    full: 'Kills + Assists / Deaths',  tip: 'Ratio classique de performance individuelle.' },
          { name: 'CSM',    full: 'CS Par Minute',             tip: 'Capacité à farmer les sbires efficacement. Non pris en compte pour les supports.' },
        ],
        formula: 'Efficiency = 35% × inv(Deaths) + 35% × KDA + 30% × CSM  (support : 50% × inv(Deaths) + 50% × KDA)',
        note: 'Un joueur qui ne meurt jamais et maintient un bon KDA score bien même avec peu de kills.',
      },
    ],
  },
  en: {
    howItWorks: 'How does the rating work?',
    heroTitle: 'The Rating is a score from 0 to 100',
    heroPara1: (
      <>Each player receives a score between <strong style={{ color: 'var(--text-1)' }}>0 and 100</strong> summarising their performance across all available statistics. <strong style={{ color: 'var(--text-1)' }}>50 is the average</strong> — a player at 50 is within the norm for their role and league. A player at 75+ is considered elite.</>
    ),
    heroPara2: (
      <>The rating is <strong style={{ color: 'var(--text-1)' }}>not a z-score or a magic formula</strong> — it is an aggregation of <strong style={{ color: 'var(--text-1)' }}>per-role percentiles</strong>. A score of 80 means you outperform 80% of players in your position in the competition.</>
    ),
    readingScore: 'Reading the score',
    fourPillars: 'The 4 rating pillars',
    weightsByRole: 'Weights by role',
    weightsByRoleDesc: (
      <>Each role has different in-game responsibilities — a support doesn't farm, a jungler roams more than they lane. The 4 pillars are therefore <strong style={{ color: 'var(--text-1)' }}>weighted differently per position</strong>.</>
    ),
    confidenceFactor: 'Confidence factor',
    confidencePara: (
      <>A player who has only played <strong style={{ color: 'var(--text-1)' }}>2 or 3 games</strong> may have an extreme rating by luck. To avoid this, the rating is <strong style={{ color: 'var(--text-1)' }}>pulled towards 50</strong> when the game count is low.</>
    ),
    confidenceExample: <>Example: a player at 80 raw with half the median games → <strong style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>50 + (80−50) × 0.5 = 65</strong>. The more they play, the more their rating reflects reality.</>,
    dataSource: 'Data source',
    dataSourceDesc: (
      <>All statistics are sourced from <strong style={{ color: 'var(--text-1)' }}>gol.gg</strong>, the reference site for LoL esports statistics. Data is updated manually after each tournament.</>
    ),
    tiers: [
      { range: '75 – 100', label: 'Elite',       desc: 'Best player in the competition at their position.' },
      { range: '60 – 75',  label: 'Very good',   desc: 'Solid, dominant in most metrics.' },
      { range: '45 – 60',  label: 'Average',     desc: 'Within the field\'s norm.' },
      { range: '25 – 45',  label: 'Struggling',  desc: 'Underperforming relative to peers.' },
      { range: '0 – 25',   label: 'Weak',        desc: 'Clearly below the field\'s level.' },
    ],
    pillars: [
      {
        id: 'laning', label: 'Laning', icon: '⚔', color: 'var(--pillar-laning)',
        desc: 'Measures early game dominance in the first 15 minutes.',
        stats: [
          { name: 'GD@15',  full: 'Gold Diff at 15',  tip: 'Gold lead over the direct lane opponent at the 15-minute mark.' },
          { name: 'CSD@15', full: 'CS Diff at 15',    tip: 'Creep score lead over the lane opponent.' },
          { name: 'XPD@15', full: 'XP Diff at 15',    tip: 'Experience lead over the lane opponent.' },
        ],
        formula: 'Laning = (GD@15 + CSD@15 + XPD@15) ÷ 3',
        note: 'A high score means the player consistently wins their lane.',
      },
      {
        id: 'damage', label: 'Damage', icon: '💥', color: 'var(--pillar-damage)',
        desc: 'Measures damage output, accounting for both volume and efficiency.',
        stats: [
          { name: 'DPM',        full: 'Damage Per Minute',   tip: 'Damage dealt to enemy champions per minute.' },
          { name: 'DMG%/Gold%', full: 'Damage efficiency',   tip: 'Share of team damage produced relative to resources consumed. Penalises players who take gold without impacting fights.' },
        ],
        formula: 'Damage = 60% × DPM + 40% × (DMG% ÷ Gold%)',
        note: 'Not just who hits hard — but who hits hard for what they consume.',
      },
      {
        id: 'presence', label: 'Presence', icon: '🌐', color: 'var(--pillar-presence)',
        desc: 'Measures involvement in team fights and kills.',
        stats: [
          { name: 'KP%', full: 'Kill Participation', tip: 'Percentage of team kills the player was involved in (kill or assist).' },
        ],
        formula: 'Presence = KP%',
        note: 'A support or jungler very active on the map scores highly here.',
      },
      {
        id: 'efficiency', label: 'Efficiency', icon: '🛡', color: 'var(--pillar-efficiency)',
        desc: 'Measures individual consistency: survival, ratio, and farming.',
        stats: [
          { name: 'Deaths', full: 'Deaths per game',          tip: 'Inverted — dying less = better score.' },
          { name: 'KDA',    full: 'Kills + Assists / Deaths', tip: 'Classic individual performance ratio.' },
          { name: 'CSM',    full: 'CS Per Minute',            tip: 'Ability to farm minions efficiently. Not counted for supports.' },
        ],
        formula: 'Efficiency = 35% × inv(Deaths) + 35% × KDA + 30% × CSM  (support: 50% × inv(Deaths) + 50% × KDA)',
        note: 'A player who never dies and maintains a good KDA scores well even with few kills.',
      },
    ],
  },
};

const TIER_COLORS = [
  'var(--tier-elite)',
  'var(--accent)',
  'var(--text-3)',
  'var(--red)',
  'var(--tier-weak)',
];

function WeightBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-4)', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', width: 32, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

export default function AboutPage() {
  const { lang } = useLang();
  const t = CONTENT[lang];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Hero */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 10, padding: '28px 28px 24px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
          {t.howItWorks}
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-1)', margin: '0 0 12px', letterSpacing: '0.02em' }}>
          {t.heroTitle}
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{t.heroPara1}</p>
        <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, margin: '10px 0 0' }}>{t.heroPara2}</p>
      </div>

      {/* Tiers */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 10, padding: '24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>
          {t.readingScore}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {t.tiers.map((tier, i) => (
            <div key={tier.range} style={{ display: 'grid', gridTemplateColumns: '90px 110px 1fr', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>{tier.range}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: TIER_COLORS[i] }}>{tier.label}</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{tier.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4 pillars */}
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
          {t.fourPillars}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {t.pillars.map(pillar => (
            <div key={pillar.id} style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}>
                <span style={{ fontSize: 18 }}>{pillar.icon}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: pillar.color, letterSpacing: '0.04em' }}>{pillar.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>{pillar.desc}</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pillar.stats.map(s => (
                    <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, alignItems: 'start' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: pillar.color, paddingTop: 1 }}>{s.name}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--text-1)' }}>{s.full}</strong> — {s.tip}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-3)', borderRadius: 5, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', borderLeft: `3px solid ${pillar.color}` }}>
                  {pillar.formula}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>{pillar.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weights by role */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 10, padding: '24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>
          {t.weightsByRole}
        </div>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{t.weightsByRoleDesc}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ROLES.map(role => {
            const w = PILLAR_WEIGHTS[role];
            return (
              <div key={role}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <RoleTag role={role} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>{ROLE_LABEL[role]}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 16px' }}>
                  {(['laning', 'damage', 'presence', 'efficiency'] as const).map(pillar => (
                    <div key={pillar}>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--font-mono)', marginBottom: 3, textTransform: 'uppercase' }}>{pillar}</div>
                      <WeightBar value={w[pillar]} color={`var(--pillar-${pillar})`} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confidence */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 10, padding: '24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
          {t.confidenceFactor}
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>{t.confidencePara}</p>
        <div style={{ background: 'var(--bg-3)', borderRadius: 5, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', borderLeft: '3px solid var(--accent)', marginBottom: 12 }}>
          rating_final = 50 + (rating_raw − 50) × min(1, games ÷ median_games)
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>{t.confidenceExample}</p>
      </div>

      {/* Data source */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 10, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
            {t.dataSource}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{t.dataSourceDesc}</p>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-4)', flexShrink: 0 }}>gol.gg</div>
      </div>

    </div>
  );
}
