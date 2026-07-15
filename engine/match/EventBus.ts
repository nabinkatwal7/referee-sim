import type { MatchEvent } from "./events";

export type EventListener = (event: MatchEvent) => void;

const MAX_HISTORY = 200;

// Pure engine: no React. Every match occurrence is emitted here instead of
// being handled directly by whoever detects it — "nothing happens directly,
// everything emits events." Consumers (the Zustand store sync, anything
// else later) subscribe instead of being called inline.
export class EventBus {
  private listeners: EventListener[] = [];
  readonly history: MatchEvent[] = [];

  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: MatchEvent) {
    this.history.push(event);
    if (this.history.length > MAX_HISTORY) {
      this.history.splice(0, this.history.length - MAX_HISTORY);
    }
    this.listeners.forEach((listener) => listener(event));
  }
}
