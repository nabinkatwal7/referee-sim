import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

// Higher = tighter follow, lower = more lag. Framerate-independent (uses delta).
const FOLLOW_LAMBDA = 3;

type Props = {
  target: React.RefObject<RapierRigidBody | null>;
};

const ThirdPersonCamera = ({ target }: Props) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const smoothed = useRef<THREE.Vector3 | null>(null);

  useFrame((_state, delta) => {
    const body = target.current;
    const controls = controlsRef.current;
    if (!body || !controls) return;

    const t = body.translation();
    const desired = new THREE.Vector3(t.x, t.y + 1, t.z);

    if (!smoothed.current) {
      smoothed.current = desired.clone();
    } else {
      const damp = 1 - Math.exp(-FOLLOW_LAMBDA * delta);
      smoothed.current.lerp(desired, damp);
    }

    controls.target.copy(smoothed.current);
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={5}
      maxDistance={300}
    />
  );
};

export default ThirdPersonCamera;
