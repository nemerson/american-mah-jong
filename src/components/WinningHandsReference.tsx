import React from 'react';
import './WinningHandsReference.css';

interface WinningHandsReferenceProps {
    onClose: () => void;
}

export const WinningHandsReference: React.FC<WinningHandsReferenceProps> = ({ onClose }) => {
    return (
        <div className="winning-hands-overlay" onClick={onClose}>
            <div className="winning-hands-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>American Mah Jong - Winning Hands</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-content">
                    <p className="intro-text">
                        For this MVP, a winning Mah Jong hand must consist of exactly <strong>14 tiles</strong> matching one of the following patterns:
                    </p>

                    <div className="pattern-card">
                        <h3>1. The Standard Pattern</h3>
                        <div className="pattern-math">4 + 3 + 3 + 2 + 2 = 14</div>
                        <p>1 Kong (4), 2 Pungs (3), 2 Pairs (2)</p>
                        <ul className="joker-rules">
                            <li>✅ Jokers can complete Kongs and Pungs.</li>
                            <li>❌ Jokers CANNOT be used in the Pairs.</li>
                        </ul>
                    </div>

                    <div className="pattern-card">
                        <h3>2. The Quint Pattern</h3>
                        <div className="pattern-math">5 + 4 + 3 + 2 = 14</div>
                        <p>1 Quint (5), 1 Kong (4), 1 Pung (3), 1 Pair (2)</p>
                        <ul className="joker-rules">
                            <li>✅ Jokers are REQUIRED for a Quint (since there are only 4 naturals in the deck).</li>
                            <li>✅ Jokers can complete Kongs and Pungs.</li>
                            <li>❌ Jokers CANNOT be used in the Pair.</li>
                        </ul>
                    </div>

                    <div className="pattern-card">
                        <h3>3. The Pairs Pattern</h3>
                        <div className="pattern-math">2 + 2 + 2 + 2 + 2 + 2 + 2 = 14</div>
                        <p>7 Pairs (2 identical tiles each)</p>
                        <ul className="joker-rules">
                            <li>❌ Jokers are <strong>strictly forbidden</strong> in this hand.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
