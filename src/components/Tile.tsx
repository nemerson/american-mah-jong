import React from 'react';
import { motion } from 'framer-motion';
import type { Tile } from '../types/mahjong';
import { TileFace } from './TileFace';
import './Tile.css';

interface TileProps {
    tile: Tile;
    isFaceDown?: boolean;
    onClick?: () => void;
    selected?: boolean;
    className?: string;
}

export const MahJongTile: React.FC<TileProps> = ({
    tile,
    isFaceDown = false,
    onClick,
    selected = false,
    className = ''
}) => {

    const getTileContent = () => {
        if (isFaceDown) {
            return (
                <div className="tile-back">
                    <div className="tile-back-emblem" />
                </div>
            );
        }
        return <TileFace tile={tile} />;
    };

    const getTileLabel = (): string => {
        if (isFaceDown) return 'Face-down tile';
        switch (tile.type) {
            case 'suit': return `${tile.value} of ${tile.suit}`;
            case 'wind': return `${tile.wind} wind`;
            case 'dragon': return `${tile.dragon} dragon`;
            case 'flower': return 'flower';
            case 'joker': return 'joker';
        }
    };

    return (
        <motion.div
            className={`mahjong-tile ${selected ? 'selected' : ''} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : 'img'}
            aria-label={getTileLabel()}
            aria-pressed={onClick ? selected : undefined}
            whileHover={{ y: selected ? -12 : -5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: selected ? -10 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <div className="tile-face">
                {getTileContent()}
            </div>
            <div className="tile-depth" />
        </motion.div>
    );
};
