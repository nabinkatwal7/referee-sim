import { useMemo } from "react";
import type { GameLoop } from "../../engine/match/GameLoop";
import Player from "../../entities/Player";
import type { Team } from "../../entities/Player/brain";
import { FORMATION_4_3_3, homePositionForSlot } from "../../entities/formation";
import { generateSquadNames } from "../../entities/names";

const TEAM_A_COLOR = "#1976d2"; // blue
const TEAM_B_COLOR = "#c62828"; // red

type RosterEntry = {
  home: [number, number, number];
  team: Team;
  color: string;
  name: string;
  role: string;
};

const buildRoster = (): RosterEntry[] => {
  const names = generateSquadNames(22);
  const teamA = FORMATION_4_3_3.map((slot, i) => ({
    home: homePositionForSlot(slot, "A"),
    team: "A" as Team,
    color: TEAM_A_COLOR,
    name: names[i],
    role: slot.role,
  }));
  const teamB = FORMATION_4_3_3.map((slot, i) => ({
    home: homePositionForSlot(slot, "B"),
    team: "B" as Team,
    color: TEAM_B_COLOR,
    name: names[11 + i],
    role: slot.role,
  }));
  return [...teamA, ...teamB];
};

type Props = {
  gameLoop: GameLoop;
};

const Players = ({ gameLoop }: Props) => {
  const roster = useMemo(buildRoster, []);

  return (
    <>
      {roster.map((player, i) => (
        <Player
          key={i}
          index={i}
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
