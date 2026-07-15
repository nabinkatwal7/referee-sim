// Step 60 — Dynamic weather + rain physics helpers.

export type WeatherKind = "clear" | "cloudy" | "rain" | "storm";

export type WeatherState = {
  kind: WeatherKind;
  /** 0..1 precipitation intensity. */
  rain: number;
  /** Seconds until next weather roll. */
  nextChangeAt: number;
};

const KIND_RAIN: Record<WeatherKind, number> = {
  clear: 0,
  cloudy: 0.05,
  rain: 0.55,
  storm: 0.9,
};

export const createWeather = (at = 0): WeatherState => ({
  kind: "clear",
  rain: 0,
  nextChangeAt: at + 45 + Math.random() * 60,
});

export const stepWeather = (w: WeatherState, at: number): WeatherState => {
  if (at < w.nextChangeAt) return w;
  const roll = Math.random();
  const kind: WeatherKind =
    roll < 0.45 ? "clear" : roll < 0.7 ? "cloudy" : roll < 0.9 ? "rain" : "storm";
  return {
    kind,
    rain: KIND_RAIN[kind],
    nextChangeAt: at + 50 + Math.random() * 80,
  };
};

/** Apply wet-pitch drag to ball horizontal velocity. Mutates velocity. */
export const applyRainPhysics = (
  vel: { x: number; y: number; z: number },
  rain: number,
  delta: number,
): { x: number; y: number; z: number } => {
  if (rain < 0.05) return vel;
  // ponytail: simple linear damp; upgrade to Rapier friction materials if needed.
  const keep = Math.max(0.85, 1 - rain * 0.35 * delta * 4);
  return { x: vel.x * keep, y: vel.y, z: vel.z * keep };
};

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  clear: "Clear",
  cloudy: "Cloudy",
  rain: "Rain",
  storm: "Storm",
};
