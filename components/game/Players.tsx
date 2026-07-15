import { useMemo } from "react";
import type { GameLoop } from "../../engine/match/GameLoop";
import type { Team } from "../../engine/team/Team";
import Player from "../../entities/Player";

type RosterEntry = {
  index: number;
  home: [number, number, number];
  team: Team;
  color: string;
  name: string;
  role: string;
};

const flattenRoster = (home: Team, away: Team): RosterEntry[] => [
  ...home.players.map((p) => ({
    index: p.index,
    home: p.home,
    team: home,
    color: home.color,
    name: p.name,
    role: p.role,
  })),
  ...away.players.map((p) => ({
    index: p.index,
    home: p.home,
    team: away,
    color: away.color,
    name: p.name,
    role: p.role,
  })),
];

type Props = {
  gameLoop: GameLoop;
};

// The roster (names/positions/teams) lives in the engine (engine/team/) —
// this just reads it and renders one <Player> per entry.
const Players = ({ gameLoop }: Props) => {
  const roster = useMemo(() => {
    const { home, away } = gameLoop.getTeams();
    return flattenRoster(home, away);
  }, [gameLoop]);

  return (
    <>
      {roster.map((player) => (
        <Player
          key={player.index}
          index={player.index}
          home={player.home}
          team={player.team}
          color={player.color}
          name={player.name}
          role={player.role}
          gameLoop={gameLoop}
        />
      ))}
    </>
  );
};

export default Players;
