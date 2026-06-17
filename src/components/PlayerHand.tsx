import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Reorder } from 'framer-motion';
import type { Tile } from '../types/mahjong';
import { MahJongTile } from './Tile';
import './PlayerHand.css';

interface PlayerHandProps {
    hand?: Tile[];
    onTileClick?: (tile: Tile) => void;
    selectedTileIds?: string[];
    isFaceDown?: boolean; // For opponent hands
    onReorder?: (newHand: Tile[]) => void;
    /**
     * Count-only mode for opponents: render this many face-down tiles without
     * any tile data. The client never receives a hidden hand's contents, so
     * opponents are drawn purely from their tile count.
     */
    count?: number;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
    hand,
    onTileClick,
    selectedTileIds = [],
    isFaceDown = false,
    onReorder,
    count
}) => {
    const tiles = useMemo(() => hand ?? [], [hand]);
    // Local state for smooth Reorder drag, syncs up to parent game state on drag end
    const [items, setItems] = useState(tiles);
    const wasDragged = useRef(false);

    // Sync if parent hand changes (e.g. drawn a new tile)
    useEffect(() => {
        setItems(tiles);
    }, [tiles]);

    const handleTileClick = (tile: Tile) => {
        // If the user just finished dragging, suppress the click
        if (wasDragged.current) {
            wasDragged.current = false;
            return;
        }
        onTileClick?.(tile);
    };

    // Count-only opponent: face-down backs, no tile contents to leak.
    if (count !== undefined) {
        return (
            <div className="player-hand-container">
                <div className="tiles-row" role="img" aria-label={`${count} face-down tiles`}>
                    {Array.from({ length: count }).map((_, i) => (
                        <div key={i} className="mahjong-tile">
                            <div className="tile-face">
                                <div className="tile-back">
                                    <div className="tile-back-emblem" />
                                </div>
                            </div>
                            <div className="tile-depth" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (onReorder) {
        return (
            <div className="player-hand-container">
                <Reorder.Group
                    axis="x"
                    values={items}
                    onReorder={setItems}
                    className="tiles-row reorder-row"
                >
                    {items.map((tile, index) => (
                        <Reorder.Item
                            key={tile.id}
                            value={tile}
                            style={{ position: 'relative' }}
                            onDragStart={() => { wasDragged.current = true; }}
                            onDragEnd={() => onReorder(items)}
                        >
                            <MahJongTile
                                tile={tile}
                                isFaceDown={isFaceDown}
                                selected={selectedTileIds.includes(tile.id)}
                                onClick={() => handleTileClick(tile)}
                                className={`hand-tile-anim-${index % 5}`}
                            />
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>
        );
    }

    return (
        <div className="player-hand-container">
            <div className="tiles-row">
                {tiles.map((tile, index) => (
                    <MahJongTile
                        key={tile.id}
                        tile={tile}
                        isFaceDown={isFaceDown}
                        selected={selectedTileIds.includes(tile.id)}
                        onClick={() => onTileClick && onTileClick(tile)}
                        className={`hand-tile-anim-${index % 5}`}
                    />
                ))}
            </div>
        </div>
    );
};
