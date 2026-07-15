export const Controls = {
  forward: "forward",
  back: "back",
  left: "left",
  right: "right",
  sprint: "sprint",
  whistle: "whistle",
} as const;

export type Controls = (typeof Controls)[keyof typeof Controls];

export const REFEREE_KEYBOARD_MAP = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.back, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.left, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.right, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.sprint, keys: ["ShiftLeft", "ShiftRight"] },
  { name: Controls.whistle, keys: ["Space"] },
];
