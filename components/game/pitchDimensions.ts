export const PITCH_WIDTH = 68;
export const PITCH_LENGTH = 105;

// Sized for a ~99,000-seat bowl (Camp-Nou-scale): tall, deep stands with a
// large footprint rather than a modest local-ground stadium.
export const STAND_TIERS = 14;
export const STAND_TIER_HEIGHT = 2.2;
export const STAND_TIER_DEPTH = 4.5;
export const STAND_GAP_FROM_PITCH = 6;
export const STAND_DEPTH_TOTAL = STAND_GAP_FROM_PITCH + STAND_TIERS * STAND_TIER_DEPTH;
export const STAND_TOP_HEIGHT = STAND_TIERS * STAND_TIER_HEIGHT;

export const REFEREE_START_POSITION: [number, number, number] = [0, 1, 3];
