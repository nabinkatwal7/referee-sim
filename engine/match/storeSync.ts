import type { EventBus } from "./EventBus";
import type { MatchEvent, Team } from "./events";
import { gameStateStore } from "./gameState";

const teamToSide = (team: Team): "home" | "away" => (team === "A" ? "home" : "away");
const CARD_PROBABILITY_ON_FOUL = 0.15; // most fouls are just a free kick, not a booking

const describe = (event: MatchEvent): string => {
  switch (event.kind) {
    case "pass":
      return `Pass: #${event.from} -> #${event.to}`;
    case "tackle":
      return `Tackle: #${event.by} won it from #${event.from}`;
    case "shot":
      return event.scored ? `Shot: #${event.by} — on target!` : `Shot: #${event.by} (missed)`;
    case "goal":
      return `GOAL! #${event.by}`;
    case "collision":
      return "Collision";
    case "throwIn":
      return `Throw-in: team ${event.team}`;
    case "corner":
      return `Corner: team ${event.team}`;
    case "foul":
      return event.given
        ? `FOUL given: #${event.by} on #${event.against}`
        : `Foul appeal waved away (#${event.by} on #${event.against})`;
    case "penalty":
      return event.given ? `PENALTY to team ${event.team}!` : "Penalty appeal waved away";
    case "offside":
      return event.given ? `OFFSIDE: #${event.by}` : `Offside appeal waved away (#${event.by})`;
    case "possibleFoul":
      // Deliberately vague — no severity/force leaked. The player decides.
      return `Possible incident: #${event.playerA} / #${event.playerB} — press SPACE to review`;
  }
};

// Subscribes the Zustand game-state store to the engine's event bus — the
// ONE place events turn into game-state writes. Nothing else (GameLoop, the
// brain) touches the store directly; they only emit events.
export const wireStoreToEvents = (bus: EventBus) => {
  return bus.subscribe((event) => {
    const store = gameStateStore.getState();

    if (event.kind === "possibleFoul") {
      // Only one incident can be under review at a time; ignore new ones
      // (and don't spam the HUD with them) while one's already pending.
      if (store.pendingFoul) return;
      store.setPendingFoul(event);
      store.setCurrentEvent(describe(event));
      return;
    }

    store.setCurrentEvent(describe(event));

    switch (event.kind) {
      case "pass":
        store.setPossession(event.to);
        break;
      case "tackle":
        store.setPossession(event.by);
        break;
      case "goal":
        store.addGoal(teamToSide(event.team));
        store.setPossession(null);
        break;
      case "shot":
        if (!event.scored) store.setPossession(null);
        break;
      case "foul":
        if (event.given) {
          store.setPossession(event.against);
          if (Math.random() < CARD_PROBABILITY_ON_FOUL) {
            store.addCard({ playerIndex: event.by, type: "yellow" });
          }
        } else {
          store.setPossession(event.against);
        }
        break;
      case "penalty":
        store.setPossession(null);
        break;
      case "offside":
        store.setPossession(event.given ? null : event.by);
        break;
      case "throwIn":
      case "corner":
        store.setPossession(null);
        break;
      case "collision":
        break;
    }
  });
};
