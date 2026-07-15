// Step 60 — Sideline managers.

export type ManagerMood = "calm" | "animated" | "furious" | "pleased";

export type ManagerState = {
  home: ManagerMood;
  away: ManagerMood;
};

export const createManagers = (): ManagerState => ({
  home: "calm",
  away: "calm",
});

export type ManagerCue =
  | { kind: "goal"; scoring: "home" | "away" }
  | { kind: "card"; against: "home" | "away"; red: boolean }
  | { kind: "foulAgainst"; team: "home" | "away" }
  | { kind: "tick" };

export const reactManagers = (m: ManagerState, cue: ManagerCue): ManagerState => {
  switch (cue.kind) {
    case "goal":
      return {
        home: cue.scoring === "home" ? "pleased" : "furious",
        away: cue.scoring === "away" ? "pleased" : "furious",
      };
    case "card":
      return {
        ...m,
        [cue.against]: cue.red ? "furious" : "animated",
      };
    case "foulAgainst":
      return { ...m, [cue.team]: "animated" };
    case "tick":
      return {
        home: m.home === "pleased" || m.home === "calm" ? "calm" : "animated",
        away: m.away === "pleased" || m.away === "calm" ? "calm" : "animated",
      };
  }
};
