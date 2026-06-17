import type { GameTransport } from './types';
import { LocalTransport } from './localTransport';
import { RemoteTransport } from './remoteTransport';

// Global the server injects into its served index.html so the page knows it
// should talk to a server rather than play locally.
declare global {
    interface Window {
        __MAHJONG_REMOTE__?: boolean;
    }
}

/**
 * Chooses the authority the UI talks to:
 *  - RemoteTransport when served by the game server (it injects
 *    `window.__MAHJONG_REMOTE__`) or when a `?server[=url]` param is present;
 *  - LocalTransport (in-process single-player) otherwise — including the
 *    packaged Electron app, which loads the build straight from disk.
 */
export function createTransport(): GameTransport {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const serverParam = params.get('server'); // null if absent, '' if bare ?server
        const wantsRemote = window.__MAHJONG_REMOTE__ === true || serverParam !== null;
        if (wantsRemote) {
            return new RemoteTransport(serverParam ? serverParam : undefined);
        }
    }
    return new LocalTransport();
}
