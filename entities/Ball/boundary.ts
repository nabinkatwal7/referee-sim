// Keep a thin shim so old imports still typecheck; rules live in ballOut.ts.
export { detectBallOut as checkBoundary } from "./ballOut";
export type { BallOutResult as BoundaryResult } from "./ballOut";
