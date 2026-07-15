import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

const MODEL_PATH = "/models/character.glb";

// Animation clips actually shipped in the model, restricted to the ones we
// use — see entities/Player/ai.ts's PlayerFSMState for how these map on.
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
};

// "Blocky Characters" by Kenney (kenney.nl/assets/blocky-characters), CC0.
// One shared GLTF, cloned + retinted per instance (Player and Referee both
// use this) so 22 players + 1 referee don't fight over the same object.
const Character = ({ color = "#1976d2", animation }: Props) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH);

  const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);

  useEffect(() => {
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = (child.material as THREE.MeshStandardMaterial).clone();
        material.color.set(color);
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clone, color]);

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const action = actions[animation];
    action?.reset().fadeIn(0.2).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, animation]);

  // The model's own root sits at ground level (feet at local y=0), but our
  // RigidBody origin is mid-body height (matching the old capsule's center,
  // baked into home positions/wander targets elsewhere) — shift down to
  // compensate rather than change that convention everywhere.
  return <primitive ref={group} object={clone} position={[0, -1, 0]} />;
};

export default Character;

useGLTF.preload(MODEL_PATH);
