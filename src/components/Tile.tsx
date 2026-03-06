import React from 'react';
import { motion } from 'framer-motion';
import type { Tile } from '../types/mahjong';
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
        if (isFaceDown) return <div className="tile-back" />;

        switch (tile.type) {
            case 'suit':
                return (
                    <div className={`tile-content suit-${tile.suit}`}>
                        <span className="tile-value">{tile.value}</span>
                        <span className="tile-icon">{getSuitIcon(tile.suit)}</span>
                    </div>
                );
            case 'wind':
                return <div className="tile-content wind-tile">{tile.wind.charAt(0).toUpperCase()}</div>;
            case 'dragon':
                return <div className={`tile-content dragon-${tile.dragon}`}>D</div>; // simplified
            case 'flower':
                return <div className="tile-content flower-tile">🌸</div>;
            case 'joker':
                return <div className="tile-content joker-tile">JOKER</div>;
            default:
                return null;
        }
    };

    const getSuitIcon = (suit: string) => {
        switch (suit) {
            case 'bams': return '🎋';
            case 'craks': return '🀄'; // simplified
            case 'dots': return '⚪';
            default: return '';
        }
    };

    return (
        <motion.div
            className={`mahjong-tile ${selected ? 'selected' : ''} ${className}`}
            onClick={onClick}
            whileHover={{ y: -5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <div className="tile-face">
                {getTileContent()}
            </div>
            <div className="tile-depth" />
        </motion.div>
    );
};
