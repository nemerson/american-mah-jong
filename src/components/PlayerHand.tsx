import React, { useState, useEffect, useRef } from 'react';
import { Reorder } from 'framer-motion';
import type { Tile } from '../types/mahjong';
import { MahJongTile } from './Tile';
import './PlayerHand.css';

interface PlayerHandProps {
    hand: Tile[];
    onTileClick?: (tile: Tile) => void;
    selectedTileIds?: string[];
    isFaceDown?: boolean; // For opponent hands
    onReorder?: (newHand: Tile[]) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
    hand,
    onTileClick,
    selectedTileIds = [],
    isFaceDown = false,
    onReorder
}) => {
    // Local state for smooth Reorder drag, syncs up to parent game state on drag end
    const [items, setItems] = useState(hand);
    const wasDragged = useRef(false);

    // Sync if parent hand changes (e.g. drawn a new tile)
    useEffect(() => {
        setItems(hand);
    }, [hand]);

    const handleTileClick = (tile: Tile) => {
        // If the user just finished dragging, suppress the click
        if (wasDragged.current) {
            wasDragged.current = false;
            return;
        }
        onTileClick && onTileClick(tile);
    };

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
                {hand.map((tile, index) => (
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
