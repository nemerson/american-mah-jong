import React from 'react';
import { internationalMahjongCard } from '../engine/cardData';
import type { PatternSegment } from '../engine/cardData';
import './WinningHandsReference.css';

const SegmentSpan: React.FC<{ seg: PatternSegment }> = ({ seg }) => (
    <span className={`suit-${seg.suit}`}>{seg.text}</span>
);

// Rendered like a real printed card: every section and hand visible at
// once, flowing through columns on a paper background — no accordions,
// no scrolling. Hover a hand for its description.
export const WinningHandsReference: React.FC = () => (
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
                    {section.hands.map((hand, i) => (
                        <div key={i} className="hand-row" title={hand.description}>
                            <span className="hand-pattern">
                                {hand.segments.map((seg, j) => (
                                    <SegmentSpan key={j} seg={seg} />
                                ))}
                            </span>
                            <span className={`hand-points pts-${hand.points}`}>{hand.points}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);
