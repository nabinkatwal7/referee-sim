import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { worldCollisionGroups } from "../../entities/collisionGroups";
import {
  PITCH_LENGTH,
  PITCH_WIDTH,
  STAND_DEPTH_TOTAL,
} from "./pitchDimensions";

const MARGIN = 60;
const TILE_METERS = 6; // texture repeats roughly every N meters

const createConcreteTexture = () => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#9e9e9e";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4000; i++) {
    const shade = 130 + Math.floor(Math.random() * 40) - 20;
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = Math.random() * 1.5 + 0.5;
    ctx.fillRect(x, y, s, s);
  }

  ctx.strokeStyle = "rgba(90,90,90,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const Ground = () => {
  const width = PITCH_WIDTH + 2 * STAND_DEPTH_TOTAL + MARGIN;
  const length = PITCH_LENGTH + 2 * STAND_DEPTH_TOTAL + MARGIN;

  const texture = useMemo(() => {
    const t = createConcreteTexture();
    t.repeat.set(width / TILE_METERS, length / TILE_METERS);
    return t;
  }, [width, length]);

  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      collisionGroups={worldCollisionGroups}
      solverGroups={worldCollisionGroups}
    >
      <mesh receiveShadow position={[0, -0.07, 0]}>
        <boxGeometry args={[width, 0.1, length]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </RigidBody>
  );
};

export default Ground;
