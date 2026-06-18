import { createContext, useContext } from 'react';
import type { TileArtStyle } from './themes';

// The active tile set's art style, provided once at the app shell and read
// by every TileFace. This avoids prop-drilling the style through GameBoard →
// PlayerHand → MahJongTile → TileFace (and through the count-only/exposure
// render paths). Colors still flow via CSS [data-tiles]; this carries only
// the *drawing treatment* that CSS can't express (outline-vs-fill, glow, etc).
export const TileStyleContext = createContext<TileArtStyle>('classic');

export const useTileStyle = (): TileArtStyle => useContext(TileStyleContext);
