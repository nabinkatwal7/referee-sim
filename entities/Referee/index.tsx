import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useCallback, useRef } from "react";
import { REFEREE_START_POSITION } from "../../components/game/pitchDimensions";
import type { GameLoop } from "../../engine/match/GameLoop";
import Character, { type CharacterMotion } from "../Character";
import { mapRefereeAnimation } from "../animationMap";
import { playerCollisionGroups } from "../collisionGroups";
import { Controls } from "./controls";

type Props = {
  gameLoop: GameLoop;
};

const Referee = ({ gameLoop }: Props) => {
  const { camera } = useThree();
  const getControls = useKeyboardControls<Controls>()[1];
  const motion = useRef<CharacterMotion>({ vx: 0, vz: 0, animation: "idle" });

  const setRef = useCallback(
    (instance: RapierRigidBody | null) => {
      gameLoop.setReferee(instance, camera, getControls);
    },
    [gameLoop, camera, getControls],
  );

  useFrame(() => {
    const v = gameLoop.getRefereeVelocity();
    motion.current.vx = v.x;
    motion.current.vz = v.z;
    motion.current.animation = mapRefereeAnimation(v.speed);
  });

  return (
    <RigidBody
      ref={setRef}
      position={REFEREE_START_POSITION}
      colliders={false}
      lockRotations
      linearDamping={1.8}
      angularDamping={4}
      collisionGroups={playerCollisionGroups}
      solverGroups={playerCollisionGroups}
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      <Character color="#1b1b1b" motion={motion} />
    </RigidBody>
  );
};

export default Referee;
