import type { Player } from '../types';
import PlayerSheet from './PlayerSheet';

interface Props { player: Player; onClose: () => void; tournament?: string; }

export default function PlayerModal({ player, onClose, tournament }: Props) {
  return <PlayerSheet player={player} onClose={onClose} tournament={tournament} />;
}
