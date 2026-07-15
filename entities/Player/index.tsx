import { useCallback, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { GameLoop } from "../../engine/match/GameLoop";
import Character, { type CharacterAnimation } from "../Character";
import { mapPlayerAnimation } from "../animationMap";
import type { Team } from "./brain";

const ANIMATION_POLL_INTERVAL = 0.15; // seconds — avoid re-rendering 22 players every frame

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
// name tag, and registers itself with the engine. The visual model
// (entities/Character.tsx) is decoupled from the physics collider (an
// explicit capsule) since the model's geometry is too complex to auto-hull.
const Player = ({ index, home, team, color = "#1976d2", name, role, gameLoop }: Props) => {
  const [animation, setAnimation] = useState<CharacterAnimation>("idle");
  const pollTimer = useRef(0);

  const setRef = useCallback(
    (instance: RapierRigidBody | null) => {
      gameLoop.registerPlayer(index, instance, home, team);
    },
    [gameLoop, index, home, team],
  );

  useFrame((_state, delta) => {
    pollTimer.current += delta;
    if (pollTimer.current < ANIMATION_POLL_INTERVAL) return;
    pollTimer.current = 0;

    const snapshot = gameLoop.getPlayerAnimationState(index);
    if (!snapshot) return;
    setAnimation(mapPlayerAnimation(snapshot.fsmState, snapshot.speed));
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
