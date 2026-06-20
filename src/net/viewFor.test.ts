import { describe, it, expect } from 'vitest';
import { initializeGame } from '../engine/game';
import { viewFor } from './viewFor';

// viewFor is the hidden-information boundary; here we cover the call-window
// countdown plumbing added for the Call-button ring. The remaining ms is
// owned by the authority's clock and threaded through as the third argument;
// the view should only surface it during the actual call phase.

describe('viewFor callWindowMs', () => {
    it('exposes callWindowMs during the call phase', () => {
        const base = initializeGame(['You', 'B1', 'B2', 'B3']);
        const state = { ...base, phase: 'call' as const };
        const view = viewFor(state, 0, 4200);
        expect(view.callWindowMs).toBe(4200);
    });

    it('omits callWindowMs outside the call phase even if one is supplied', () => {
        const base = initializeGame(['You', 'B1', 'B2', 'B3']);
        // A stale countdown value must not leak into a non-call view.
        const view = viewFor({ ...base, phase: 'discard' as const }, 0, 4200);
        expect(view.callWindowMs).toBeUndefined();
    });

    it('omits callWindowMs when the authority supplies none', () => {
        const base = initializeGame(['You', 'B1', 'B2', 'B3']);
        const view = viewFor({ ...base, phase: 'call' as const }, 0);
        expect(view.callWindowMs).toBeUndefined();
    });
});
