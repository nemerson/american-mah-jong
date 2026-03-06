import React, { useState } from 'react';
import { internationalMahjongCard } from '../engine/cardData';
import './WinningHandsReference.css';

export const WinningHandsReference: React.FC = () => {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (name: string) => {
        setExpandedSection(prev => prev === name ? null : name);
    };

    return (
        <div className="card-reference">
            <div className="card-header">
                <span className="card-title">🐴 International Mahjong Card 2026</span>
                <span className="card-subtitle">Year of the Horse</span>
            </div>
            <div className="card-sections">
                {internationalMahjongCard.map(section => (
                    <div key={section.name} className="card-section">
                        <button
                            className={`section-toggle ${expandedSection === section.name ? 'expanded' : ''}`}
                            onClick={() => toggleSection(section.name)}
                        >
                            <span className="section-name">{section.name}</span>
                            <span className="section-count">{section.hands.length}</span>
                        </button>
                        {expandedSection === section.name && (
                            <div className="section-hands">
                                {section.hands.map((hand, i) => (
                                    <div key={i} className="hand-row">
                                        <span className="hand-number">{i + 1}</span>
                                        <span className="hand-pattern">{hand.pattern}</span>
                                        <span className={`hand-points pts-${hand.points}`}>{hand.points}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
