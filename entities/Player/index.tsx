import { useCallback, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { GameLoop } from "../../engine/match/GameLoop";
import type { Role } from "../formation";
import Character, { type CharacterAnimation } from "../Character";
import { mapKeeperAnimation, mapPlayerAnimation } from "../animationMap";
import type { Team } from "../../engine/team/Team";

const ANIMATION_POLL_INTERVAL = 0.15; // seconds — avoid re-rendering 22 players every frame

type Props = {
  index: number;
  home: [number, number, number];
  team: Team;
  color?: string;
  name?: string;
  role: Role;
  gameLoop: GameLoop;
};

// Movement lives in ./ai.ts (outfield) / ./goalkeeper.ts (GK), ball reactions
// in ./brain.ts — this component just renders and registers with the engine.
const Player = ({ index, home, team, color = "#1976d2", name, role, gameLoop }: Props) => {
  const [animation, setAnimation] = useState<CharacterAnimation>("idle");
  const pollTimer = useRef(0);

  const setRef = useCallback(
    (instance: RapierRigidBody | null) => {
      gameLoop.registerPlayer(index, instance, home, team, role);
    },
    [gameLoop, index, home, team, role],
  );

  useFrame((_state, delta) => {
    pollTimer.current += delta;
    if (pollTimer.current < ANIMATION_POLL_INTERVAL) return;
    pollTimer.current = 0;

    const snapshot = gameLoop.getPlayerAnimationState(index);
    if (!snapshot) return;
    setAnimation(
      snapshot.kind === "keeper"
        ? mapKeeperAnimation(snapshot.fsmState, snapshot.speed)
        : mapPlayerAnimation(snapshot.fsmState, snapshot.speed),
    );
  });

  return (
    <RigidBody ref={setRef} position={home} colliders={false} lockRotations>
      <CapsuleCollider args={[0.5, 0.4]} />
      <Character color={color} animation={animation} />
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
