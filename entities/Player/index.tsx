import { forwardRef, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

const WALK_SPEED = 2.5;
const RUN_SPEED = 6;
const RUN_DISTANCE = 8; // beyond this, sprint toward the target
const ARRIVE_RADIUS = 0.5; // close enough to stop
const WANDER_RADIUS = 15; // how far from home a new target may be picked
const MIN_PAUSE = 1; // seconds to stand still before/after each move
const MAX_PAUSE = 3;

type Props = {
  home: [number, number, number];
  color?: string;
};

const randomPause = () => MIN_PAUSE + Math.random() * (MAX_PAUSE - MIN_PAUSE);

const randomTarget = (home: [number, number, number]) => {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * WANDER_RADIUS;
  return new THREE.Vector3(
    home[0] + Math.cos(angle) * radius,
    home[1],
    home[2] + Math.sin(angle) * radius,
  );
};

// Static -> walk -> run, cycling: idles a moment, picks a random point near
// its home spot, walks or sprints there depending on distance, then repeats.
// No animation — just translation, matching the Referee controller's approach.
const Player = forwardRef<RapierRigidBody, Props>(({ home, color = "#1976d2" }, ref) => {
  const bodyRef = useRef<RapierRigidBody>(null);
  const target = useRef(randomTarget(home));
  const elapsed = useRef(0);
  const pauseUntil = useRef(randomPause());

  useFrame((_state, delta) => {
    const body = bodyRef.current;
    if (!body) return;
    elapsed.current += delta;

    const linvel = body.linvel();

    if (elapsed.current < pauseUntil.current) {
      body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
      return;
    }

    const pos = body.translation();
    const toTarget = new THREE.Vector3(target.current.x - pos.x, 0, target.current.z - pos.z);
    const distance = toTarget.length();

    if (distance < ARRIVE_RADIUS) {
      body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
      pauseUntil.current = elapsed.current + randomPause();
      target.current = randomTarget(home);
      return;
    }

    toTarget.normalize();
    const speed = distance > RUN_DISTANCE ? RUN_SPEED : WALK_SPEED;
    body.setLinvel({ x: toTarget.x * speed, y: linvel.y, z: toTarget.z * speed }, true);
  });

  return (
    <RigidBody
      ref={(instance) => {
        bodyRef.current = instance;
        if (typeof ref === "function") ref(instance);
        else if (ref) ref.current = instance;
      }}
      position={home}
      colliders="hull"
    >
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
});

Player.displayName = "Player";

export default Player;
