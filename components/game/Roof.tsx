import {
  PITCH_WIDTH,
  PITCH_LENGTH,
  STAND_DEPTH_TOTAL,
  STAND_TOP_HEIGHT,
} from "./pitchDimensions";

const ROOF_THICKNESS = 0.4;
const ROOF_OVERHANG = STAND_DEPTH_TOTAL * 0.6;
const ROOF_TILT = 0.18;
const ROOF_GAP = 0.6;

type Side = "north" | "south" | "east" | "west";

const RoofPanel = ({ side }: { side: Side }) => {
  const topY = STAND_TOP_HEIGHT + ROOF_GAP;
  const isLengthwise = side === "north" || side === "south";
  const length = (isLengthwise ? PITCH_WIDTH : PITCH_LENGTH) + 2 * STAND_DEPTH_TOTAL;

  let position: [number, number, number];
  let rotation: [number, number, number];
  let args: [number, number, number];

  switch (side) {
    case "north": {
      const backZ = -(PITCH_LENGTH / 2 + STAND_DEPTH_TOTAL);
      position = [0, topY, backZ + ROOF_OVERHANG / 2];
      rotation = [ROOF_TILT, 0, 0];
      args = [length, ROOF_THICKNESS, ROOF_OVERHANG];
      break;
    }
    case "south": {
      const backZ = PITCH_LENGTH / 2 + STAND_DEPTH_TOTAL;
      position = [0, topY, backZ - ROOF_OVERHANG / 2];
      rotation = [-ROOF_TILT, 0, 0];
      args = [length, ROOF_THICKNESS, ROOF_OVERHANG];
      break;
    }
    case "east": {
      const backX = PITCH_WIDTH / 2 + STAND_DEPTH_TOTAL;
      position = [backX - ROOF_OVERHANG / 2, topY, 0];
      rotation = [0, 0, ROOF_TILT];
      args = [ROOF_OVERHANG, ROOF_THICKNESS, length];
      break;
    }
    case "west": {
      const backX = -(PITCH_WIDTH / 2 + STAND_DEPTH_TOTAL);
      position = [backX + ROOF_OVERHANG / 2, topY, 0];
      rotation = [0, 0, -ROOF_TILT];
      args = [ROOF_OVERHANG, ROOF_THICKNESS, length];
      break;
    }
  }

  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation}>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#1c2529" />
    </mesh>
  );
};

const Roof = () => {
  return (
    <>
      <RoofPanel side="north" />
      <RoofPanel side="south" />
      <RoofPanel side="east" />
      <RoofPanel side="west" />
    </>
  );
};

export default Roof;
