import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { PITCH_LENGTH } from "./pitchDimensions";

const GOAL_WIDTH = 7.32;
const GOAL_HEIGHT = 2.44;
const POST_RADIUS = 0.06;
const NET_DEPTH = 1.2;

const GoalFrame = ({ z, facing }: { z: number; facing: 1 | -1 }) => {
  const halfWidth = GOAL_WIDTH / 2;

  return (
    <RigidBody type="fixed" colliders="hull" position={[0, 0, z]}>
      <mesh castShadow receiveShadow position={[-halfWidth, GOAL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh castShadow receiveShadow position={[halfWidth, GOAL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[0, GOAL_HEIGHT, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, GOAL_WIDTH, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, GOAL_HEIGHT / 2, facing * NET_DEPTH]}>
        <planeGeometry args={[GOAL_WIDTH, GOAL_HEIGHT]} />
        <meshStandardMaterial
          color="#f5f5f5"
          transparent
          opacity={0.25}
          wireframe
          side={THREE.DoubleSide}
        />
      </mesh>
    </RigidBody>
  );
};

const Goals = () => {
  return (
    <>
      <GoalFrame z={-PITCH_LENGTH / 2} facing={-1} />
      <GoalFrame z={PITCH_LENGTH / 2} facing={1} />
    </>
  );
};

export default Goals;
