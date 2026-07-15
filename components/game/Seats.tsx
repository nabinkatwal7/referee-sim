import { useMemo } from "react";
import {
  PITCH_WIDTH,
  PITCH_LENGTH,
  STAND_TIERS,
  STAND_TIER_HEIGHT,
  STAND_TIER_DEPTH,
  STAND_GAP_FROM_PITCH,
  STAND_DEPTH_TOTAL,
} from "./pitchDimensions";

// Blaugrana-inspired tier colors: mostly garnet, a blue band, one patterned
// band, and a gold crown trim at the very top tier.
const GARNET = "#A50044";
const BLUE = "#004D98";
const GOLD = "#FFED02";
const PATTERN = "pattern" as const;
const TIER_COLORS: (string | typeof PATTERN)[] = [
  GARNET,
  GARNET,
  GARNET,
  GARNET,
  BLUE,
  BLUE,
  GARNET,
  GARNET,
  PATTERN,
  GARNET,
  GARNET,
  BLUE,
  GARNET,
  GOLD,
];
if (TIER_COLORS.length !== STAND_TIERS) {
  throw new Error(`TIER_COLORS must have exactly STAND_TIERS (${STAND_TIERS}) entries`);
}
const PATTERN_COLORS = [BLUE, GOLD];
const PATTERN_SEGMENTS = 16;

type Side = "north" | "south" | "east" | "west";
type Box3 = [number, number, number];
type TierSpec = { position: Box3; args: Box3; color: string };
type Footprint = { position: Box3; args: Box3 };

const tierFootprint = (
  side: Side,
  standLength: number,
  height: number,
  offset: number,
): Footprint => {
  switch (side) {
    case "north":
      return {
        position: [0, height / 2, -PITCH_LENGTH / 2 - offset],
        args: [standLength, height, STAND_TIER_DEPTH],
      };
    case "south":
      return {
        position: [0, height / 2, PITCH_LENGTH / 2 + offset],
        args: [standLength, height, STAND_TIER_DEPTH],
      };
    case "east":
      return {
        position: [PITCH_WIDTH / 2 + offset, height / 2, 0],
        args: [STAND_TIER_DEPTH, height, standLength],
      };
    case "west":
      return {
        position: [-PITCH_WIDTH / 2 - offset, height / 2, 0],
        args: [STAND_TIER_DEPTH, height, standLength],
      };
  }
};

const splitIntoPattern = (side: Side, tier: Footprint): TierSpec[] => {
  const isLengthwise = side === "north" || side === "south";
  const lengthAxis = isLengthwise ? 0 : 2;
  const fullLength = tier.args[lengthAxis];
  const segLength = fullLength / PATTERN_SEGMENTS;

  return Array.from({ length: PATTERN_SEGMENTS }, (_, i) => {
    const args = [...tier.args] as Box3;
    args[lengthAxis] = segLength;
    const position = [...tier.position] as Box3;
    position[lengthAxis] += -fullLength / 2 + segLength * (i + 0.5);
    return { position, args, color: PATTERN_COLORS[i % PATTERN_COLORS.length] };
  });
};

const buildTiers = (side: Side): TierSpec[] => {
  const isLengthwise = side === "north" || side === "south";
  // Full outer footprint (not just the pitch-side span) so adjacent stands
  // meet at the corners instead of leaving the bowl open.
  const standLength = (isLengthwise ? PITCH_WIDTH : PITCH_LENGTH) + 2 * STAND_DEPTH_TOTAL;

  return TIER_COLORS.flatMap((color, i) => {
    const height = STAND_TIER_HEIGHT * (i + 1);
    const offset = STAND_GAP_FROM_PITCH + i * STAND_TIER_DEPTH;
    const tier = tierFootprint(side, standLength, height, offset);

    if (color === PATTERN) {
      return splitIntoPattern(side, tier);
    }
    return [{ ...tier, color }];
  });
};

const StandSide = ({ side }: { side: Side }) => {
  const tiers = useMemo(() => buildTiers(side), [side]);

  return (
    <>
      {tiers.map((tier, i) => (
        <mesh key={i} castShadow receiveShadow position={tier.position}>
          <boxGeometry args={tier.args} />
          <meshStandardMaterial color={tier.color} />
        </mesh>
      ))}
    </>
  );
};

const Seats = () => {
  return (
    <>
      <StandSide side="north" />
      <StandSide side="south" />
      <StandSide side="east" />
      <StandSide side="west" />
    </>
  );
};

export default Seats;
