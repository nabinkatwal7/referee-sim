import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

// Procedural footballer. Motion is read from a ref every frame (no React
// rerenders) so facing / gait stay smooth.

export type CharacterAnimation =
  | "idle"
  | "walk"
  | "sprint"
  | "pick-up"
  | "attack-kick-right"
  | "attack-melee-right"
  | "emote-yes";

export type CharacterMotion = {
  vx: number;
  vz: number;
  animation: CharacterAnimation;
};

type Props = {
  color?: string;
  motion: MutableRefObject<CharacterMotion>;
};

const darken = (hex: string, amount: number) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return `#${c.getHexString()}`;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const wrapPi = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

type Pose = {
  thighL: number;
  thighR: number;
  shinL: number;
  shinR: number;
  armL: number;
  armR: number;
  forearmL: number;
  forearmR: number;
  lean: number;
  sway: number;
  bob: number;
  headNod: number;
};

const ZERO: Pose = {
  thighL: 0,
  thighR: 0,
  shinL: 0,
  shinR: 0,
  armL: 0,
  armR: 0,
  forearmL: 0,
  forearmR: 0,
  lean: 0,
  sway: 0,
  bob: 0,
  headNod: 0,
};

/**
 * Soft humanoid. Feet at y=0; group shifted so RigidBody mid-capsule stays
 * the physics origin.
 */
const Character = ({ color = "#1976d2", motion }: Props) => {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lThigh = useRef<THREE.Group>(null);
  const rThigh = useRef<THREE.Group>(null);
  const lShin = useRef<THREE.Group>(null);
  const rShin = useRef<THREE.Group>(null);
  const lUpperArm = useRef<THREE.Group>(null);
  const rUpperArm = useRef<THREE.Group>(null);
  const lForearm = useRef<THREE.Group>(null);
  const rForearm = useRef<THREE.Group>(null);

  const phase = useRef(Math.random() * Math.PI * 2);
  const yaw = useRef(0);
  const faceVx = useRef(0);
  const faceVz = useRef(1);
  const kickT = useRef(0);
  const pose = useRef<Pose>({ ...ZERO });

  const kit = useMemo(() => {
    return {
      jersey: color,
      shorts: darken(color, 0.45),
      socks: darken(color, 0.25),
      boots: "#1a1a1a",
      skin: "#c68652",
      hair: "#2c1810",
    };
  }, [color]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05); // don't explode on tab-hitch
    const { vx, vz, animation } = motion.current;
    const speed = Math.hypot(vx, vz);

    // Low-pass facing direction so repulsion wobble doesn't spin the body.
    if (speed > 0.55) {
      faceVx.current = lerp(faceVx.current, vx / speed, 1 - Math.exp(-d * 6));
      faceVz.current = lerp(faceVz.current, vz / speed, 1 - Math.exp(-d * 6));
      const fl = Math.hypot(faceVx.current, faceVz.current) || 1;
      faceVx.current /= fl;
      faceVz.current /= fl;
      const targetYaw = Math.atan2(faceVx.current, faceVz.current);
      yaw.current += wrapPi(targetYaw - yaw.current) * (1 - Math.exp(-d * 5));
    }

    if (root.current) root.current.rotation.y = yaw.current;

    // Cadence follows speed; animation only biases amplitude.
    const sprintBias = animation === "sprint" ? 1 : animation === "walk" ? 0.55 : 0;
    const moving = speed > 0.4 && (animation === "walk" || animation === "sprint" || animation === "idle");
    const cadence = moving ? 3.2 + speed * 1.55 : 1.1;
    phase.current += d * cadence;
    const t = phase.current;

    const target: Pose = { ...ZERO };

    if (
      (animation === "walk" || animation === "sprint" || animation === "idle") &&
      speed > 0.45
    ) {
      const amp = THREE.MathUtils.clamp(0.22 + speed * 0.09 + sprintBias * 0.2, 0.28, 0.75);
      const swing = Math.sin(t);
      const swingOpp = Math.sin(t + Math.PI);
      target.thighL = swing * amp;
      target.thighR = swingOpp * amp;
      // Knee folds mainly while recovering the foot (sin negative → rear).
      target.shinL = Math.max(0, -swing) * amp * 1.05;
      target.shinR = Math.max(0, -swingOpp) * amp * 1.05;
      target.armL = swingOpp * amp * 0.55;
      target.armR = swing * amp * 0.55;
      target.forearmL = 0.25 + Math.max(0, -swingOpp) * 0.35;
      target.forearmR = 0.25 + Math.max(0, -swing) * 0.35;
      target.lean = THREE.MathUtils.clamp(speed * 0.028 + sprintBias * 0.08, 0.04, 0.22);
      target.sway = Math.sin(t) * 0.04;
      target.bob = Math.abs(Math.sin(t * 2)) * (0.02 + speed * 0.004);
      target.headNod = -target.lean * 0.35;
    } else if (animation === "idle" || speed <= 0.45) {
      target.armL = Math.sin(t * 0.7) * 0.03;
      target.armR = Math.sin(t * 0.7 + 1.2) * 0.03;
      target.thighL = Math.sin(t * 0.5) * 0.02;
      target.thighR = Math.sin(t * 0.5 + 0.8) * 0.02;
      target.headNod = Math.sin(t * 0.6) * 0.02;
      target.bob = Math.sin(t * 0.8) * 0.008;
    }

    if (animation === "pick-up") {
      target.lean = 0.4;
      target.thighL = 0.35;
      target.thighR = 0.2;
      target.shinL = 0.4;
      target.armL = -0.9;
      target.armR = -0.85;
      target.forearmL = 0.7;
      target.forearmR = 0.7;
    } else if (animation === "emote-yes") {
      const w = Math.sin(t * 5);
      target.armL = -1.5 + w * 0.15;
      target.armR = -1.5 + w * 0.15;
      target.forearmL = 0.2;
      target.forearmR = 0.2;
      target.headNod = w * 0.12;
    } else if (animation === "attack-kick-right") {
      kickT.current = Math.min(1, kickT.current + d * 3.5);
      const k = Math.sin(kickT.current * Math.PI);
      target.thighR = -k * 1.05;
      target.shinR = k * 0.85;
      target.armL = k * 0.35;
      target.lean = k * 0.25;
    } else if (animation === "attack-melee-right") {
      kickT.current = Math.min(1, kickT.current + d * 4);
      const k = Math.sin(kickT.current * Math.PI);
      target.thighL = -k * 0.4;
      target.thighR = k * 0.85;
      target.armR = -k * 1.15;
      target.lean = k * 0.3;
    } else {
      kickT.current = Math.max(0, kickT.current - d * 4);
    }

    // Soft-follow targets — kills rubbery snap / jitter.
    const follow = 1 - Math.exp(-d * 14);
    const p = pose.current;
    (Object.keys(target) as (keyof Pose)[]).forEach((k) => {
      p[k] = lerp(p[k], target[k], follow);
    });

    if (hips.current) {
      hips.current.position.y = p.bob;
      hips.current.rotation.z = p.sway;
    }
    if (torso.current) {
      torso.current.rotation.x = p.lean;
      torso.current.rotation.z = -p.sway * 0.6;
    }
    if (head.current) head.current.rotation.x = p.headNod;
    if (lThigh.current) lThigh.current.rotation.x = p.thighL;
    if (rThigh.current) rThigh.current.rotation.x = p.thighR;
    if (lShin.current) lShin.current.rotation.x = p.shinL;
    if (rShin.current) rShin.current.rotation.x = p.shinR;
    if (lUpperArm.current) lUpperArm.current.rotation.x = p.armL;
    if (rUpperArm.current) rUpperArm.current.rotation.x = p.armR;
    if (lForearm.current) lForearm.current.rotation.x = p.forearmL;
    if (rForearm.current) rForearm.current.rotation.x = p.forearmR;
  });

  const mat = (c: string, rough = 0.65) => (
    <meshStandardMaterial color={c} roughness={rough} metalness={0.04} />
  );

  return (
    <group position={[0, -1, 0]}>
      <group ref={root}>
        <group ref={hips}>
          <mesh castShadow position={[0, 0.92, 0]}>
            <sphereGeometry args={[0.13, 12, 10]} />
            {mat(kit.shorts, 0.7)}
          </mesh>

          <group ref={torso} position={[0, 1.02, 0]}>
            <mesh castShadow position={[0, 0.22, 0]}>
              <capsuleGeometry args={[0.16, 0.28, 6, 10]} />
              {mat(kit.jersey, 0.55)}
            </mesh>
            <mesh castShadow position={[0, 0.4, 0]}>
              <boxGeometry args={[0.42, 0.1, 0.2]} />
              {mat(kit.jersey, 0.55)}
            </mesh>

            <group ref={head} position={[0, 0.55, 0]}>
              <mesh castShadow position={[0, 0.14, 0]}>
                <sphereGeometry args={[0.115, 14, 12]} />
                {mat(kit.skin, 0.6)}
              </mesh>
              <mesh castShadow position={[0, 0.24, 0]}>
                <sphereGeometry args={[0.12, 12, 10]} />
                {mat(kit.hair, 0.85)}
              </mesh>
            </group>

            <group ref={lUpperArm} position={[-0.24, 0.38, 0]}>
              <mesh castShadow position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.045, 0.18, 5, 8]} />
                {mat(kit.skin)}
              </mesh>
              <group ref={lForearm} position={[0, -0.28, 0]}>
                <mesh castShadow position={[0, -0.13, 0]}>
                  <capsuleGeometry args={[0.04, 0.16, 5, 8]} />
                  {mat(kit.skin)}
                </mesh>
              </group>
            </group>

            <group ref={rUpperArm} position={[0.24, 0.38, 0]}>
              <mesh castShadow position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.045, 0.18, 5, 8]} />
                {mat(kit.skin)}
              </mesh>
              <group ref={rForearm} position={[0, -0.28, 0]}>
                <mesh castShadow position={[0, -0.13, 0]}>
                  <capsuleGeometry args={[0.04, 0.16, 5, 8]} />
                  {mat(kit.skin)}
                </mesh>
              </group>
            </group>
          </group>

          <group ref={lThigh} position={[-0.09, 0.88, 0]}>
            <mesh castShadow position={[0, -0.18, 0]}>
              <capsuleGeometry args={[0.06, 0.22, 5, 8]} />
              {mat(kit.shorts, 0.7)}
            </mesh>
            <group ref={lShin} position={[0, -0.36, 0]}>
              <mesh castShadow position={[0, -0.17, 0]}>
                <capsuleGeometry args={[0.05, 0.22, 5, 8]} />
                {mat(kit.socks, 0.7)}
              </mesh>
              <mesh castShadow position={[0, -0.38, 0.04]}>
                <boxGeometry args={[0.1, 0.06, 0.18]} />
                {mat(kit.boots, 0.5)}
              </mesh>
            </group>
          </group>

          <group ref={rThigh} position={[0.09, 0.88, 0]}>
            <mesh castShadow position={[0, -0.18, 0]}>
              <capsuleGeometry args={[0.06, 0.22, 5, 8]} />
              {mat(kit.shorts, 0.7)}
            </mesh>
            <group ref={rShin} position={[0, -0.36, 0]}>
              <mesh castShadow position={[0, -0.17, 0]}>
                <capsuleGeometry args={[0.05, 0.22, 5, 8]} />
                {mat(kit.socks, 0.7)}
              </mesh>
              <mesh castShadow position={[0, -0.38, 0.04]}>
                <boxGeometry args={[0.1, 0.06, 0.18]} />
                {mat(kit.boots, 0.5)}
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export default Character;
