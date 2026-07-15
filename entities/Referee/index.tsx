import { forwardRef, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { REFEREE_START_POSITION } from "../../components/game/pitchDimensions";
import { Controls } from "./controls";

const WALK_SPEED = 3.5;
const SPRINT_SPEED = 7;

const forwardVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();
const moveDir = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);

// Movement only, per spec — no animation, just WASD/Shift translation
// relative to wherever the (orbit-controlled) camera is currently facing.
const Referee = forwardRef<RapierRigidBody>((_props, ref) => {
  const bodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const getControls = useKeyboardControls<Controls>()[1];

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;

    const { forward, back, left, right, sprint } = getControls();

    camera.getWorldDirection(forwardVec);
    forwardVec.y = 0;
    forwardVec.normalize();
    rightVec.crossVectors(forwardVec, worldUp).negate();

    moveDir.set(0, 0, 0);
    if (forward) moveDir.add(forwardVec);
    if (back) moveDir.sub(forwardVec);
    if (right) moveDir.add(rightVec);
    if (left) moveDir.sub(rightVec);

    const linvel = body.linvel();
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const speed = sprint ? SPRINT_SPEED : WALK_SPEED;
      body.setLinvel({ x: moveDir.x * speed, y: linvel.y, z: moveDir.z * speed }, true);
    } else {
      body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    }
  });

  return (
    <RigidBody
      ref={(instance) => {
        bodyRef.current = instance;
        if (typeof ref === "function") ref(instance);
        else if (ref) ref.current = instance;
      }}
      position={REFEREE_START_POSITION}
      colliders="hull"
    >
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.35, 1.2, 4, 8]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
    </RigidBody>
  );
});

Referee.displayName = "Referee";

export default Referee;
