import type { GameTransport, Intent, PlayerView } from './types';
import { viewFor } from './viewFor';
import { GameSession } from './gameSession';

// In-process authority for single-player. Wraps a GameSession (the shared
// rules/clock core) as the lone human at seat 0 and pushes that seat's view to
// the UI on every change. The server wraps the very same GameSession, so
// single-player and multiplayer can never drift apart.

const HUMAN_SEAT = 0;

export class LocalTransport implements GameTransport {
    private session = new GameSession();
    private subscribers = new Set<(view: PlayerView) => void>();
    private unsubscribeSession: () => void;

    constructor() {
        this.unsubscribeSession = this.session.onChange(() => this.emit());
    }

    subscribe(cb: (view: PlayerView) => void): () => void {
        this.subscribers.add(cb);
        cb(this.currentView()); // deliver current view immediately
        return () => { this.subscribers.delete(cb); };
    }

    send(intent: Intent): void {
        try {
            this.session.applyIntent(HUMAN_SEAT, intent);
        } catch {
            // The UI only emits legal intents (buttons gate them); ignore any
            // the engine still rejects, exactly as the server would.
        }
    }

    setPaused(paused: boolean): void {
        this.session.setPaused(paused);
    }

    dispose(): void {
        this.unsubscribeSession();
        this.session.dispose();
        this.subscribers.clear();
    }

    private currentView(): PlayerView {
        return viewFor(this.session.getState(), HUMAN_SEAT, this.session.getCallWindowRemainingMs());
    }

    private emit(): void {
        const view = this.currentView();
        for (const cb of this.subscribers) cb(view);
    }
}
