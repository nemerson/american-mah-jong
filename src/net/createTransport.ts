import type { GameTransport } from './types';
import { LocalTransport } from './localTransport';

// Global the server injects into its served index.html so the page knows it
// should talk to a server (lobby + multiplayer) rather than play locally.
declare global {
    interface Window {
        __MAHJONG_REMOTE__?: boolean;
    }
}

export interface RemoteChoice {
    /** Whether this page should run multiplayer through the server. */
    remote: boolean;
    /** Explicit server URL from `?server=URL`, or undefined for same-origin. */
    url?: string;
}

/**
 * Decide whether the app runs locally (single-player, in-process authority) or
 * remotely (lobby + server). The server injects `window.__MAHJONG_REMOTE__`;
 * `?server[=url]` forces remote during development. The packaged Electron app
 * has neither and stays single-player.
 */
export function detectRemote(): RemoteChoice {
    if (typeof window === 'undefined') return { remote: false };
    const params = new URLSearchParams(window.location.search);
    const serverParam = params.get('server'); // null if absent, '' if bare ?server
    const remote = window.__MAHJONG_REMOTE__ === true || serverParam !== null;
    return { remote, url: serverParam ? serverParam : undefined };
}

/** The in-process single-player authority (also used by the Electron build). */
export function createLocalTransport(): GameTransport {
    return new LocalTransport();
}
