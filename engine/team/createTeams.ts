import {
  FORMATIONS,
  homePositionForSlot,
  phasePositionsForHome,
  type FormationId,
  type Side,
} from "../../entities/formation";
import { generateSquadNames } from "../../entities/names";
import { clampTactics, DEFAULT_TACTICS } from "../../entities/Player/tactics";
import { Team, type TeamId, type TeamPlayer } from "./Team";

const HOME_COLOR = "#1976d2"; // blue
const AWAY_COLOR = "#c62828"; // red

const buildRoster = (
  teamId: TeamId,
  side: Side,
  startIndex: number,
  names: string[],
  formationId: FormationId,
  attackDir: 1 | -1,
): TeamPlayer[] => {
  const slots = FORMATIONS[formationId].slots;
  return slots.map((slot, i) => {
    const home = homePositionForSlot(slot, side);
    const phases = phasePositionsForHome(home, slot.role, attackDir);
    return {
      index: startIndex + i,
      teamId,
      number: i + 1,
      role: slot.role,
      name: names[i],
      home: phases.home,
      attack: phases.attack,
      defend: phases.defend,
    };
  });
};

export type Teams = { home: Team; away: Team };

// Builds both 11-player squads once. Home defaults 4-3-3, away 4-4-2 so the
// shapes read differently. Players.tsx reads from GameLoop.getTeams().
export const createTeams = (): Teams => {
  const names = generateSquadNames(22);

  const homeFormation: FormationId = "4-3-3";
  const awayFormation: FormationId = "4-4-2";

  const homePlayers = buildRoster("home", "A", 0, names.slice(0, 11), homeFormation, 1);
  const awayPlayers = buildRoster("away", "B", 11, names.slice(11, 22), awayFormation, -1);

  const home = new Team(
    "home",
    "Home",
    HOME_COLOR,
    homeFormation,
    FORMATIONS[homeFormation].slots,
    homePlayers,
    1,
    clampTactics({ ...DEFAULT_TACTICS, pressing: 0.6, width: 0.7 }),
  );
  const away = new Team(
    "away",
    "Away",
    AWAY_COLOR,
    awayFormation,
    FORMATIONS[awayFormation].slots,
    awayPlayers,
    -1,
    clampTactics({ ...DEFAULT_TACTICS, compactness: 0.7, lineHeight: 0.4 }),
  );

  return { home, away };
};
