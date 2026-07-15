import { useCallback, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { GameLoop } from "../../engine/match/GameLoop";
import type { Role } from "../formation";
import Character, { type CharacterMotion } from "../Character";
import { mapKeeperAnimation, mapPlayerAnimation } from "../animationMap";
import { playerCollisionGroups } from "../collisionGroups";
import type { Team } from "../../engine/team/Team";

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
  const motion = useRef<CharacterMotion>({ vx: 0, vz: 0, animation: "idle" });

  const setRef = useCallback(
    (instance: RapierRigidBody | null) => {
      gameLoop.registerPlayer(index, instance, home, team, role);
    },
    [gameLoop, index, home, team, role],
  );

  // Every frame, no setState — Character reads the same ref.
  useFrame(() => {
    const snapshot = gameLoop.getPlayerAnimationState(index);
    if (!snapshot) return;
    motion.current.vx = snapshot.vx;
    motion.current.vz = snapshot.vz;
    motion.current.animation =
      snapshot.kind === "keeper"
        ? mapKeeperAnimation(snapshot.fsmState, snapshot.speed)
        : mapPlayerAnimation(snapshot.fsmState, snapshot.speed);
  });

  return (
    <RigidBody
      ref={setRef}
      position={home}
      colliders={false}
      lockRotations
      linearDamping={1.8}
      angularDamping={4}
      collisionGroups={playerCollisionGroups}
      solverGroups={playerCollisionGroups}
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      <Character color={color} motion={motion} />
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
