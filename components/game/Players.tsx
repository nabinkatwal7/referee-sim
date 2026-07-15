import type { RapierRigidBody } from "@react-three/rapier";
import Player from "../../entities/Player";

const TEAM_A_COLOR = "#1976d2"; // blue
const TEAM_B_COLOR = "#c62828"; // red

// One half of a simple mirrored 4-4-2: GK, back four, midfield four, two
// forwards. Team B is Team A reflected across the halfway line (z=0).
const TEAM_A_POSITIONS: [number, number, number][] = [
  [0, 1, -48], // GK
  [-20, 1, -34],
  [-7, 1, -34],
  [7, 1, -34],
  [20, 1, -34], // defense
  [-20, 1, -14],
  [-7, 1, -14],
  [7, 1, -14],
  [20, 1, -14], // midfield
  [-8, 1, -6],
  [8, 1, -6], // forwards
];

const TEAM_B_POSITIONS: [number, number, number][] = TEAM_A_POSITIONS.map(
  ([x, y, z]) => [x, y, -z] as [number, number, number],
);

const ALL_PLAYERS = [
  ...TEAM_A_POSITIONS.map((position) => ({ position, color: TEAM_A_COLOR })),
  ...TEAM_B_POSITIONS.map((position) => ({ position, color: TEAM_B_COLOR })),
];

type Props = {
  playersRef: React.RefObject<(RapierRigidBody | null)[]>;
};

const Players = ({ playersRef }: Props) => {
  return (
    <>
      {ALL_PLAYERS.map(({ position, color }, i) => (
        <Player
          key={i}
          home={position}
          color={color}
          ref={(instance) => {
            playersRef.current[i] = instance;
          }}
        />
      ))}
    </>
  );
};

export default Players;
