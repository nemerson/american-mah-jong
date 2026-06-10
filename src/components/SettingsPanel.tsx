import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MATS, TILE_SETS } from '../theme/themes';
import type { ThemeSelection } from '../theme/themes';
import './SettingsPanel.css';

interface SettingsPanelProps {
    theme: ThemeSelection;
    onMatChange: (mat: string) => void;
    onTilesChange: (tiles: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ theme, onMatChange, onTilesChange }) => {
    const [open, setOpen] = useState(false);

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

                        <div className="settings-section">
                            <div className="settings-section-title">Table Mat</div>
                            <div className="option-grid">
                                {MATS.map(mat => (
                                    <button
                                        key={mat.id}
                                        className={`option-card ${theme.mat === mat.id ? 'option-selected' : ''}`}
                                        onClick={() => onMatChange(mat.id)}
                                        aria-pressed={theme.mat === mat.id}
                                    >
                                        <span
                                            className="mat-swatch"
                                            style={{
                                                background: `radial-gradient(circle at 35% 30%, ${mat.feltCenter}, ${mat.feltEdge})`,
                                                borderColor: mat.rail
                                            }}
                                        />
                                        <span className="option-name">{mat.name}</span>
                                        <span className="option-desc">{mat.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-section">
                            <div className="settings-section-title">Tile Set</div>
                            <div className="option-grid">
                                {TILE_SETS.map(set => (
                                    <button
                                        key={set.id}
                                        className={`option-card ${theme.tiles === set.id ? 'option-selected' : ''}`}
                                        onClick={() => onTilesChange(set.id)}
                                        aria-pressed={theme.tiles === set.id}
                                    >
                                        <span className="tile-swatch" style={{ background: set.face }}>
                                            <span className="tile-swatch-glyph" style={{ color: set.accent }}>中</span>
                                            <span className="tile-swatch-num" style={{ color: set.ink }}>5</span>
                                        </span>
                                        <span className="option-name">{set.name}</span>
                                        <span className="option-desc">{set.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
