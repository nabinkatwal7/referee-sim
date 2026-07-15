import { forwardRef } from "react";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";

// Regulation ball: ~70cm circumference -> ~0.11m radius.
const BALL_RADIUS = 0.11;

// Simple sphere, rigid body, can roll, can bounce. Nothing else.
const Ball = forwardRef<RapierRigidBody>((_props, ref) => {
  return (
    <RigidBody ref={ref} position={[0, 2, 0]} colliders="ball" restitution={0.6}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
    </RigidBody>
  );
});

Ball.displayName = "Ball";

export default Ball;
