import { FORMATION_4_3_3, homePositionForSlot, type Side } from "../../entities/formation";
import { generateSquadNames } from "../../entities/names";
import { Team, type TeamId, type TeamPlayer } from "./Team";

const HOME_COLOR = "#1976d2"; // blue
const AWAY_COLOR = "#c62828"; // red

const buildRoster = (teamId: TeamId, side: Side, startIndex: number, names: string[]): TeamPlayer[] =>
  FORMATION_4_3_3.map((slot, i) => ({
    index: startIndex + i,
    teamId,
    number: i + 1,
    role: slot.role,
    name: names[i],
    home: homePositionForSlot(slot, side),
  }));

export type Teams = { home: Team; away: Team };

// Builds both 11-player squads once. This is the one place a match's teams
// get created — Players.tsx (React) reads from GameLoop.getTeams() rather
// than building its own roster, so there's a single source of truth.
export const createTeams = (): Teams => {
  const names = generateSquadNames(22);

  const homePlayers = buildRoster("home", "A", 0, names.slice(0, 11));
  const awayPlayers = buildRoster("away", "B", 11, names.slice(11, 22));

  const home = new Team("home", "Home", HOME_COLOR, FORMATION_4_3_3, homePlayers, 1);
  const away = new Team("away", "Away", AWAY_COLOR, FORMATION_4_3_3, awayPlayers, -1);

  return { home, away };
};
