import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useCallback } from "react";
import type { GameLoop } from "../../engine/match/GameLoop";

// Regulation ball: ~70cm circumference -> ~0.11m radius.
const BALL_RADIUS = 0.11;

type Props = {
  gameLoop: GameLoop;
};

// Simple sphere, rigid body, can roll, can bounce. Nothing else — its
// behavior (passing) lives entirely in the engine, not here.
const Ball = ({ gameLoop }: Props) => {
  const setRef = useCallback(
    (instance: RapierRigidBody | null) => {
      gameLoop.setBall(instance);
    },
    [gameLoop],
  );

  return (
    <RigidBody
      ref={setRef}
      position={[0, 2, 0]}
      colliders="ball"
      restitution={0.6}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
    </RigidBody>
  );
};

export default Ball;
