import { useMemo } from "react";
import * as THREE from "three";
import { PITCH_WIDTH, PITCH_LENGTH } from "./pitchDimensions";

const SCALE = 12; // px per meter

const drawPenaltyArea = (
  ctx: CanvasRenderingContext2D,
  w: number,
  edgeY: number,
  inward: 1 | -1,
) => {
  const penaltyDepth = 16.5 * SCALE;
  const penaltyWidth = 40.32 * SCALE;
  const sixYardDepth = 5.5 * SCALE;
  const sixYardWidth = 18.32 * SCALE;
  const spotDist = 11 * SCALE;
  const arcRadius = 9.15 * SCALE;

  ctx.strokeRect(w / 2 - penaltyWidth / 2, edgeY, penaltyWidth, inward * penaltyDepth);
  ctx.strokeRect(w / 2 - sixYardWidth / 2, edgeY, sixYardWidth, inward * sixYardDepth);

  const spotY = edgeY + inward * spotDist;
  ctx.beginPath();
  ctx.arc(w / 2, spotY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // "D" arc: the portion of the penalty-spot circle outside the box.
  const d = penaltyDepth - spotDist;
  const theta = Math.acos(d / arcRadius);
  const inwardAngle = inward > 0 ? Math.PI / 2 : -Math.PI / 2;
  ctx.beginPath();
  ctx.arc(w / 2, spotY, arcRadius, inwardAngle - theta, inwardAngle + theta);
  ctx.stroke();
};

const createLineTexture = () => {
  const w = PITCH_WIDTH * SCALE;
  const h = PITCH_LENGTH * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2;

  const margin = 1;
  ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const centerRadius = 9.15 * SCALE;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, centerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  drawPenaltyArea(ctx, w, 0, 1);
  drawPenaltyArea(ctx, w, h, -1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const Lines = () => {
  const texture = useMemo(() => createLineTexture(), []);

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <planeGeometry args={[PITCH_WIDTH, PITCH_LENGTH]} />
      <meshStandardMaterial map={texture} transparent />
    </mesh>
  );
};

export default Lines;
