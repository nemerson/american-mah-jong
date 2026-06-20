import type { GameState } from '../types/mahjong';
import type { PlayerView, PlayerSeatView } from './types';

/**
 * Project the canonical GameState down to what a single seat may see. This is
 * the hidden-information boundary: every seat but `seat` exposes only a
 * `handCount`, never tile contents. Discards, exposures, the wall count and
 * whose turn it is are all public. Used by both LocalTransport (seat 0) and
 * the server (per connected seat).
 *
 * `callWindowMs` is the authority's live call-window countdown (from the
 * GameClock); pass it through so the view can drive the Call-button ring. It is
 * only meaningful during the `call` phase and is omitted otherwise.
 */
export function viewFor(state: GameState, seat: number, callWindowMs?: number): PlayerView {
    // At showdown the game is over, so every hand is revealed (the end overlay
    // shows the winner's full hand, which may be an opponent's).
    const revealAll = state.phase === 'end';
    const seats: PlayerSeatView[] = state.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        handCount: p.hand.length,
        exposures: p.exposures,
        hand: i === seat || revealAll ? p.hand : undefined,
    }));

    return {
        mySeat: seat,
        seats,
        discards: state.discards,
        wallCount: state.wall.length,
        currentPlayerIndex: state.currentPlayerIndex,
        eastPlayerIndex: state.eastPlayerIndex,
        phase: state.phase,
        charlestonPhase: state.charlestonPhase,
        winner: state.winner,
        callWindowMs: state.phase === 'call' ? callWindowMs : undefined,
    };
}
