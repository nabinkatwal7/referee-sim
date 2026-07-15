import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useCallback, useRef, useState } from "react";
import { REFEREE_START_POSITION } from "../../components/game/pitchDimensions";
import type { GameLoop } from "../../engine/match/GameLoop";
import Character, { type CharacterAnimation } from "../Character";
import { mapRefereeAnimation } from "../animationMap";
import { Controls } from "./controls";

const ANIMATION_POLL_INTERVAL = 0.15;

type Props = {
  gameLoop: GameLoop;
};

// Movement lives in ./movement.ts and is driven by the engine each frame
// (Update Referee phase) — this component just renders the body and hands
// the engine what it needs: the rigid body, the camera, and a way to read
// current key state. The visual model is decoupled from the physics
// collider (an explicit capsule), same as Player.
const Referee = ({ gameLoop }: Props) => {
  const { camera } = useThree();
  const getControls = useKeyboardControls<Controls>()[1];
  const [animation, setAnimation] = useState<CharacterAnimation>("idle");
  const pollTimer = useRef(0);

  const setRef = useCallback(
    (instance: RapierRigidBody | null) => {
      gameLoop.setReferee(instance, camera, getControls);
    },
    [gameLoop, camera, getControls],
  );

  useFrame((_state, delta) => {
    pollTimer.current += delta;
    if (pollTimer.current < ANIMATION_POLL_INTERVAL) return;
    pollTimer.current = 0;
    setAnimation(mapRefereeAnimation(gameLoop.getRefereeSpeed()));
  });

  return (
    <RigidBody
      ref={setRef}
      position={REFEREE_START_POSITION}
      colliders={false}
      lockRotations
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      <Character color="#212121" animation={animation} />
    </RigidBody>
  );
};

export default Referee;
