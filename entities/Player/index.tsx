import { useCallback } from "react";
import { Html } from "@react-three/drei";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { GameLoop } from "../../engine/match/GameLoop";
import type { Team } from "./brain";

type Props = {
  index: number;
  home: [number, number, number];
  team: Team;
  color?: string;
  name?: string;
  role?: string;
  gameLoop: GameLoop;
};

// Movement lives in ./ai.ts, ball reactions in ./brain.ts, both driven by the
// engine each frame — this component just renders the body plus an optional
// name tag, and registers itself with the engine.
const Player = ({ index, home, team, color = "#1976d2", name, role, gameLoop }: Props) => {
  const setRef = useCallback(
    (instance: RapierRigidBody | null) => {
      gameLoop.registerPlayer(index, instance, home, team);
    },
    [gameLoop, index, home, team],
  );

  return (
    <RigidBody ref={setRef} position={home} colliders="hull">
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {name && (
        <Html position={[0, 1.5, 0]} center distanceFactor={30} occlude>
          <div
            style={{
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(0,0,0,0.55)",
              color: "white",
              fontSize: 11,
              fontFamily: "sans-serif",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {name}
            {role ? ` (${role})` : ""}
          </div>
        </Html>
      )}
    </RigidBody>
  );
};

export default Player;
