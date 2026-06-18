import React, { useState } from 'react';
import { internationalMahjongCard } from '../engine/cardData';
import type { PatternSegment } from '../engine/cardData';
import './WinningHandsReference.css';

const STORAGE_KEY = 'amj-target-hand';

const SegmentSpan: React.FC<{ seg: PatternSegment }> = ({ seg }) => (
    <span className={`suit-${seg.suit}`}>{seg.text}</span>
);

export const WinningHandsReference: React.FC = () => {
    const [targetKey, setTargetKey] = useState<string | null>(() => {
        try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
    });

    const handleSelect = (key: string) => {
        const next = targetKey === key ? null : key;
        setTargetKey(next);
        try {
            if (next) localStorage.setItem(STORAGE_KEY, next);
            else localStorage.removeItem(STORAGE_KEY);
        } catch { /* localStorage unavailable */ }
    };

    return (
        <div className="card-reference" aria-label="Winning hands reference card">
            <div className="card-header">
                <span className="card-title">🐴 International Mahjong Card 2026</span>
                <span className="card-subtitle">Year of the Horse</span>
                <span className="card-legend">
                    <span className="suit-a">■ Suit 1</span>
                    <span className="suit-b">■ Suit 2</span>
                    <span className="suit-c">■ Suit 3</span>
                    <span className="suit-n">■ Neutral</span>
                </span>
            </div>
            <div className="card-columns">
                {internationalMahjongCard.map(section => (
                    <div key={section.name} className="card-section">
                        <div className="section-name">{section.name}</div>
                        {section.hands.map((hand, i) => {
                            const key = `${section.name}-${i}`;
                            const isTarget = targetKey === key;
                            return (
                                <div
                                    key={i}
                                    className={`hand-row${isTarget ? ' is-target' : ''}`}
                                    title={hand.description}
                                    onClick={() => handleSelect(key)}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={isTarget}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelect(key); }}
                                >
                                    <span className="hand-pattern">
                                        {hand.segments.map((seg, j) => (
                                            <SegmentSpan key={j} seg={seg} />
                                        ))}
                                    </span>
                                    <span className={`hand-points pts-${hand.points}`}>{hand.points}</span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
