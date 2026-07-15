import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Procedural humanoid (not Kenney cubes). Soft footballer proportions +
// gait-driven limb cycles. Same CharacterAnimation API as the old GLB.

export type CharacterAnimation =
  | "idle"
  | "walk"
  | "sprint"
  | "pick-up"
  | "attack-kick-right"
  | "attack-melee-right"
  | "emote-yes";

type Props = {
  color?: string;
  animation: CharacterAnimation;
  /** World velocity for facing + stride speed. */
  vx?: number;
  vz?: number;
};

type LimbRefs = {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  lUpperArm: THREE.Group;
  lForearm: THREE.Group;
  rUpperArm: THREE.Group;
  rForearm: THREE.Group;
  lThigh: THREE.Group;
  lShin: THREE.Group;
  rThigh: THREE.Group;
  rShin: THREE.Group;
};

const darken = (hex: string, amount: number) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return `#${c.getHexString()}`;
};

const Limb = ({
  args,
  position,
  color,
  radius = 0.055,
}: {
  args: [number, number, number];
  position: [number, number, number];
  color: string;
  radius?: number;
}) => (
  <mesh castShadow receiveShadow position={position}>
    <capsuleGeometry args={[radius, Math.max(0.02, args[1] - radius * 2), 6, 8]} />
    <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
  </mesh>
);

/**
 * Soft-bodied footballer. Feet at local y=0; we shift the whole figure down
 * so it sits under a mid-capsule RigidBody origin (same convention as before).
 */
const Character = ({
  color = "#1976d2",
  animation,
  vx = 0,
  vz = 0,
}: Props) => {
  const phase = useRef(0);
  const yaw = useRef(0);
  const kickT = useRef(0);
  const refs = useRef<Partial<LimbRefs>>({});

  const kit = useMemo(() => {
    const jersey = color;
    const shorts = darken(color, 0.45);
    const socks = darken(color, 0.25);
    return {
      jersey,
      shorts,
      socks,
      boots: "#1a1a1a",
      skin: "#c68652",
      hair: "#2c1810",
    };
  }, [color]);

  useFrame((_, dt) => {
    const speed = Math.hypot(vx, vz);
    if (speed > 0.35) {
      const target = Math.atan2(vx, vz);
      // Smooth turn — no snap.
      let diff = target - yaw.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw.current += diff * Math.min(1, dt * 8);
    }

    const r = refs.current;
    if (r.root) r.root.rotation.y = yaw.current;

    const loco =
      animation === "sprint" ? "sprint" : animation === "walk" ? "walk" : null;

    const cadence =
      animation === "sprint" ? 11 : animation === "walk" ? 7.5 : 1.2;
    phase.current += dt * cadence;

    const t = phase.current;
    let hip = 0;
    let thighL = 0;
    let thighR = 0;
    let shinL = 0;
    let shinR = 0;
    let armL = 0;
    let armR = 0;
    let lean = 0;
    let headNod = 0;

    if (loco) {
      const amp = animation === "sprint" ? 0.72 : 0.45;
      thighL = Math.sin(t) * amp;
      thighR = Math.sin(t + Math.PI) * amp;
      shinL = Math.max(0, -Math.sin(t)) * amp * 0.9;
      shinR = Math.max(0, -Math.sin(t + Math.PI)) * amp * 0.9;
      armL = Math.sin(t + Math.PI) * amp * 0.7;
      armR = Math.sin(t) * amp * 0.7;
      lean = animation === "sprint" ? 0.18 : 0.06;
    } else if (animation === "idle") {
      thighL = Math.sin(t * 0.6) * 0.03;
      thighR = Math.sin(t * 0.6 + 1) * 0.03;
      armL = Math.sin(t * 0.5) * 0.04;
      armR = Math.sin(t * 0.5 + 1) * 0.04;
      headNod = Math.sin(t * 0.5) * 0.03;
    } else if (animation === "pick-up") {
      lean = 0.35;
      thighL = 0.25;
      thighR = 0.15;
      armL = -0.8;
      armR = -0.7;
    } else if (animation === "emote-yes") {
      armL = -1.6 + Math.sin(t * 6) * 0.2;
      armR = -1.6 + Math.sin(t * 6 + 0.5) * 0.2;
      headNod = Math.sin(t * 6) * 0.15;
    } else if (animation === "attack-kick-right") {
      kickT.current = Math.min(1, kickT.current + dt * 4);
      const k = Math.sin(kickT.current * Math.PI);
      thighR = -k * 1.1;
      shinR = k * 0.6;
      armL = k * 0.4;
      lean = k * 0.2;
    } else if (animation === "attack-melee-right") {
      kickT.current = Math.min(1, kickT.current + dt * 5);
      const k = Math.sin(kickT.current * Math.PI);
      thighL = -k * 0.5;
      thighR = k * 0.9;
      armR = -k * 1.2;
      lean = k * 0.35;
    }

    if (
      animation !== "attack-kick-right" &&
      animation !== "attack-melee-right"
    ) {
      kickT.current = 0;
    }

    if (r.torso) {
      r.torso.rotation.x = lean;
      r.torso.rotation.z = hip;
    }
    if (r.head) r.head.rotation.x = headNod - lean * 0.3;
    if (r.lThigh) r.lThigh.rotation.x = thighL;
    if (r.rThigh) r.rThigh.rotation.x = thighR;
    if (r.lShin) r.lShin.rotation.x = shinL;
    if (r.rShin) r.rShin.rotation.x = shinR;
    if (r.lUpperArm) r.lUpperArm.rotation.x = armL;
    if (r.rUpperArm) r.rUpperArm.rotation.x = armR;
    if (r.lForearm) r.lForearm.rotation.x = Math.max(0, -armL) * 0.4;
    if (r.rForearm) r.rForearm.rotation.x = Math.max(0, -armR) * 0.4;
  });

  const set =
    (key: keyof LimbRefs) =>
    (node: THREE.Group | null) => {
      if (node) refs.current[key] = node;
    };

  // CapsuleGeometry is Y-aligned; limb groups place joints at origins.
  return (
    <group position={[0, -1, 0]}>
      <group ref={set("root")}>
        {/* Hips / shorts */}
        <mesh castShadow position={[0, 0.92, 0]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color={kit.shorts} roughness={0.7} />
        </mesh>

        {/* Torso / jersey */}
        <group ref={set("torso")} position={[0, 1.02, 0]}>
          <mesh castShadow position={[0, 0.22, 0]}>
            <capsuleGeometry args={[0.16, 0.28, 6, 10]} />
            <meshStandardMaterial color={kit.jersey} roughness={0.55} />
          </mesh>
          {/* Shoulders */}
          <mesh castShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[0.42, 0.1, 0.2]} />
            <meshStandardMaterial color={kit.jersey} roughness={0.55} />
          </mesh>

          {/* Head */}
          <group ref={set("head")} position={[0, 0.55, 0]}>
            <mesh castShadow position={[0, 0.14, 0]}>
              <sphereGeometry args={[0.115, 14, 12]} />
              <meshStandardMaterial color={kit.skin} roughness={0.6} />
            </mesh>
            <mesh castShadow position={[0, 0.24, 0]}>
              <sphereGeometry args={[0.12, 12, 10]} />
              <meshStandardMaterial color={kit.hair} roughness={0.85} />
            </mesh>
          </group>

          {/* Left arm */}
          <group ref={set("lUpperArm")} position={[-0.24, 0.38, 0]}>
            <Limb args={[0.1, 0.28, 0.1]} position={[0, -0.14, 0]} color={kit.skin} radius={0.045} />
            <group ref={set("lForearm")} position={[0, -0.28, 0]}>
              <Limb args={[0.08, 0.26, 0.08]} position={[0, -0.13, 0]} color={kit.skin} radius={0.04} />
            </group>
          </group>

          {/* Right arm */}
          <group ref={set("rUpperArm")} position={[0.24, 0.38, 0]}>
            <Limb args={[0.1, 0.28, 0.1]} position={[0, -0.14, 0]} color={kit.skin} radius={0.045} />
            <group ref={set("rForearm")} position={[0, -0.28, 0]}>
              <Limb args={[0.08, 0.26, 0.08]} position={[0, -0.13, 0]} color={kit.skin} radius={0.04} />
            </group>
          </group>
        </group>

        {/* Left leg */}
        <group ref={set("lThigh")} position={[-0.09, 0.88, 0]}>
          <Limb args={[0.12, 0.36, 0.12]} position={[0, -0.18, 0]} color={kit.shorts} radius={0.06} />
          <group ref={set("lShin")} position={[0, -0.36, 0]}>
            <Limb args={[0.1, 0.34, 0.1]} position={[0, -0.17, 0]} color={kit.socks} radius={0.05} />
            <mesh castShadow position={[0, -0.38, 0.04]}>
              <boxGeometry args={[0.1, 0.06, 0.18]} />
              <meshStandardMaterial color={kit.boots} roughness={0.5} />
            </mesh>
          </group>
        </group>

        {/* Right leg */}
        <group ref={set("rThigh")} position={[0.09, 0.88, 0]}>
          <Limb args={[0.12, 0.36, 0.12]} position={[0, -0.18, 0]} color={kit.shorts} radius={0.06} />
          <group ref={set("rShin")} position={[0, -0.36, 0]}>
            <Limb args={[0.1, 0.34, 0.1]} position={[0, -0.17, 0]} color={kit.socks} radius={0.05} />
            <mesh castShadow position={[0, -0.38, 0.04]}>
              <boxGeometry args={[0.1, 0.06, 0.18]} />
              <meshStandardMaterial color={kit.boots} roughness={0.5} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

export default Character;
