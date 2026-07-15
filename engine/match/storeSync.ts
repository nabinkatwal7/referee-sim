import type { EventBus } from "./EventBus";
import type { MatchEvent } from "./events";
import { gameStateStore } from "./gameState";

const CARD_PROBABILITY_ON_FOUL = 0.15;

const describe = (event: MatchEvent): string => {
  switch (event.kind) {
    case "pass":
      return `Pass: #${event.from} -> #${event.to}`;
    case "tackle":
      return `Tackle: #${event.by} won it from #${event.from}`;
    case "shot":
      return `Shot: #${event.by}`;
    case "goal":
      return `GOAL! #${event.by}`;
    case "collision":
      return "Collision";
    case "throwIn":
      return `Throw-in: team ${event.team}`;
    case "corner":
      return `Corner: team ${event.team}`;
    case "goalKick":
      return `Goal kick: team ${event.team}`;
    case "kickoff":
      return "Kickoff";
    case "foul":
      return event.given
        ? `FOUL given: #${event.by} on #${event.against}`
        : `Foul appeal waved away (#${event.by} on #${event.against})`;
    case "penalty":
      return event.given ? `PENALTY to team ${event.team}!` : "Penalty appeal waved away";
    case "offside":
      return event.given ? `OFFSIDE: #${event.by}` : `Offside appeal waved away (#${event.by})`;
    case "possibleFoul":
      return `Possible incident: #${event.playerA} / #${event.playerB} — press SPACE to review`;
  }
};

export const wireStoreToEvents = (bus: EventBus) => {
  return bus.subscribe((event) => {
    const store = gameStateStore.getState();

    if (event.kind === "possibleFoul") {
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
        store.addGoal(event.team);
        store.setPossession(null);
        break;
      case "shot":
        store.setPossession(null);
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
      case "goalKick":
      case "kickoff":
        store.setPossession(null);
        break;
      case "collision":
        break;
    }
  });
};
