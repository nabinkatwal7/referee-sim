import { useCallback } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { GameLoop } from "../../engine/match/GameLoop";
import { REFEREE_START_POSITION } from "../../components/game/pitchDimensions";
import { Controls } from "./controls";

type Props = {
  gameLoop: GameLoop;
};

// Movement lives in ./movement.ts and is driven by the engine each frame
// (Update Referee phase) — this component just renders the body and hands
// the engine what it needs: the rigid body, the camera, and a way to read
// current key state.
const Referee = ({ gameLoop }: Props) => {
  const { camera } = useThree();
  const getControls = useKeyboardControls<Controls>()[1];

  const setRef = useCallback(
    (instance: RapierRigidBody | null) => {
      gameLoop.setReferee(instance, camera, getControls);
    },
    [gameLoop, camera, getControls],
  );

  return (
    <RigidBody ref={setRef} position={REFEREE_START_POSITION} colliders="hull" lockRotations>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.35, 1.2, 4, 8]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
    </RigidBody>
  );
};

export default Referee;
