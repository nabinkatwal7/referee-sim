// Step 39 — Stamina.
// 100% → Running → Sprinting → Recovering.
// Affects acceleration, passing, shot power, decision speed.

export type StaminaPhase = "fresh" | "running" | "sprinting" | "recovering";

export type StaminaState = {
  value: number; // 0..1
  phase: StaminaPhase;
};

export const createStamina = (): StaminaState => ({
  value: 1,
  phase: "fresh",
});

const SPRINT_SPEED = 5.2;
const RUN_SPEED = 2.2;
const DRAIN_SPRINT = 0.08; // per second
const DRAIN_RUN = 0.03;
const RECOVER_IDLE = 0.12;
const RECOVER_WALK = 0.05;

export const stepStamina = (
  stamina: StaminaState,
  speed: number,
  delta: number,
) => {
  if (speed >= SPRINT_SPEED) {
    stamina.value = Math.max(0, stamina.value - DRAIN_SPRINT * delta);
    stamina.phase = stamina.value < 0.25 ? "recovering" : "sprinting";
  } else if (speed >= RUN_SPEED) {
    stamina.value = Math.max(0, stamina.value - DRAIN_RUN * delta);
    stamina.phase = stamina.value < 0.2 ? "recovering" : "running";
  } else if (speed < 0.5) {
    stamina.value = Math.min(1, stamina.value + RECOVER_IDLE * delta);
    stamina.phase = stamina.value > 0.85 ? "fresh" : "recovering";
  } else {
    stamina.value = Math.min(1, stamina.value + RECOVER_WALK * delta);
    stamina.phase = stamina.value > 0.85 ? "fresh" : "recovering";
  }

  // Forced recovery when empty — stay recovering until above 0.35
  if (stamina.value <= 0.02) stamina.phase = "recovering";
  if (stamina.phase === "recovering" && stamina.value < 0.35 && speed >= RUN_SPEED) {
    // Still drain slightly if they keep running while gassed
    stamina.value = Math.max(0, stamina.value - DRAIN_RUN * 0.5 * delta);
  }
};

/** Mult on top speed / accel (0.45..1). */
export const staminaSpeedFactor = (s: StaminaState): number =>
  0.45 + s.value * 0.55;

/** Mult on pass / shot power. */
export const staminaPowerFactor = (s: StaminaState): number =>
  0.55 + s.value * 0.45;

/**
 * Decision lag mult — tired players commit longer / think slower (>1 = slower).
 * Used to stretch commit / hold timers.
 */
export const staminaDecisionLag = (s: StaminaState): number =>
  1 + (1 - s.value) * 1.2;
