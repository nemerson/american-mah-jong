import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MATS, TILE_SETS } from '../theme/themes';
import type { ThemeSelection, TileSetOption } from '../theme/themes';
import { TileStyleContext } from '../theme/TileStyleContext';
import { TileFace } from './TileFace';
import type { Tile } from '../types/mahjong';
import './Tile.css'; // provides the [data-tiles] color variables the previews need
import './SettingsPanel.css';

interface SettingsPanelProps {
    theme: ThemeSelection;
    onMatChange: (mat: string) => void;
    onTilesChange: (tiles: string) => void;
}

type Tab = 'tiles' | 'table';

// Two representative tiles so the picker shows real artwork: a numbered
// suit tile (pip art + corner index) and an honor (hero glyph). Together
// they reveal how each set's art style + color treatment actually reads.
const PREVIEW_TILES: Tile[] = [
    { type: 'suit', suit: 'dots', value: 5, id: 'preview-5dot' },
    { type: 'dragon', dragon: 'red', id: 'preview-red-dragon' },
];

// A real TileFace at swatch scale, wrapped so the set's [data-tiles] colors
// AND its art-style treatment (neon glow, engraved bevel, gold inlay, …)
// both apply — exactly what the player will see in play, just smaller.
const TileSetPreview: React.FC<{ set: TileSetOption }> = ({ set }) => (
    <span className="tile-preview" data-tiles={set.id} aria-hidden="true">
        <TileStyleContext.Provider value={set.artStyle}>
            {PREVIEW_TILES.map(tile => (
                <span key={tile.id} className="preview-tile">
                    <span className="preview-tile-face">
                        <TileFace tile={tile} />
                    </span>
                    <span className="preview-tile-depth" />
                </span>
            ))}
        </TileStyleContext.Provider>
    </span>
);

// A mini felt swatch that applies the mat's [data-mat] variables. The felt
// fill comes from --mat-center/--mat-edge and the embroidery from the same
// --mat-motif layer the table paints in .game-board::after (see mat-preview
// ::after in SettingsPanel.css), so "Year of the Horse" shows its fret rays
// and sun disc rather than a flat red blob.
const MatPreview: React.FC<{ matId: string }> = ({ matId }) => (
    <span className="mat-preview" data-mat={matId} aria-hidden="true" />
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ theme, onMatChange, onTilesChange }) => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('tiles');

    return (
        <>
            <button
                className="settings-toggle"
                onClick={() => setOpen(o => !o)}
                aria-label="Customize table and tiles"
                aria-expanded={open}
                title="Customize table & tiles"
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Table & Tiles</span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="settings-panel"
                        role="dialog"
                        aria-label="Table and tile customization"
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    >
                        <div className="settings-header">
                            <h3>Customize Your Set</h3>
                            <button className="settings-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
                        </div>

                        <div className="settings-tabs" role="tablist" aria-label="Customization category">
                            <button
                                className={`settings-tab ${tab === 'tiles' ? 'settings-tab-active' : ''}`}
                                role="tab"
                                aria-selected={tab === 'tiles'}
                                onClick={() => setTab('tiles')}
                            >
                                Tiles
                            </button>
                            <button
                                className={`settings-tab ${tab === 'table' ? 'settings-tab-active' : ''}`}
                                role="tab"
                                aria-selected={tab === 'table'}
                                onClick={() => setTab('table')}
                            >
                                Table
                            </button>
                        </div>

                        {tab === 'tiles' && (
                            <div className="settings-section" role="tabpanel" aria-label="Tile set">
                                <div className="option-grid">
                                    {TILE_SETS.map(set => (
                                        <button
                                            key={set.id}
                                            className={`option-card ${theme.tiles === set.id ? 'option-selected' : ''}`}
                                            onClick={() => onTilesChange(set.id)}
                                            aria-pressed={theme.tiles === set.id}
                                        >
                                            <TileSetPreview set={set} />
                                            <span className="option-name">{set.name}</span>
                                            <span className="option-desc">{set.description}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tab === 'table' && (
                            <div className="settings-section" role="tabpanel" aria-label="Table mat">
                                <div className="option-grid">
                                    {MATS.map(mat => (
                                        <button
                                            key={mat.id}
                                            className={`option-card ${theme.mat === mat.id ? 'option-selected' : ''}`}
                                            onClick={() => onMatChange(mat.id)}
                                            aria-pressed={theme.mat === mat.id}
                                        >
                                            <MatPreview matId={mat.id} />
                                            <span className="option-name">{mat.name}</span>
                                            <span className="option-desc">{mat.description}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
