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

const SEAT_COLORS = ["#37474f", "#455a64"];

type Side = "north" | "south" | "east" | "west";

const buildTiers = (side: Side) => {
  const isLengthwise = side === "north" || side === "south";
  // Full outer footprint (not just the pitch-side span) so adjacent stands
  // meet at the corners instead of leaving the bowl open.
  const standLength = (isLengthwise ? PITCH_WIDTH : PITCH_LENGTH) + 2 * STAND_DEPTH_TOTAL;

  return Array.from({ length: STAND_TIERS }, (_, i) => {
    const height = STAND_TIER_HEIGHT * (i + 1);
    const offset = STAND_GAP_FROM_PITCH + i * STAND_TIER_DEPTH;
    const color = SEAT_COLORS[i % SEAT_COLORS.length];

    switch (side) {
      case "north":
        return {
          position: [0, height / 2, -PITCH_LENGTH / 2 - offset] as [number, number, number],
          args: [standLength, height, STAND_TIER_DEPTH] as [number, number, number],
          color,
        };
      case "south":
        return {
          position: [0, height / 2, PITCH_LENGTH / 2 + offset] as [number, number, number],
          args: [standLength, height, STAND_TIER_DEPTH] as [number, number, number],
          color,
        };
      case "east":
        return {
          position: [PITCH_WIDTH / 2 + offset, height / 2, 0] as [number, number, number],
          args: [STAND_TIER_DEPTH, height, standLength] as [number, number, number],
          color,
        };
      case "west":
        return {
          position: [-PITCH_WIDTH / 2 - offset, height / 2, 0] as [number, number, number],
          args: [STAND_TIER_DEPTH, height, standLength] as [number, number, number],
          color,
        };
    }
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
