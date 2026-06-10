import React from 'react';
import type { Tile } from '../types/mahjong';

// Hand-drawn SVG faces for every tile, replacing emoji glyphs.
// All colors come from CSS variables so the selected tile set
// (ivory, jade, onyx...) recolors the artwork automatically.

const RED = 'var(--tile-red)';
const GREEN = 'var(--tile-green)';
const BLUE = 'var(--tile-blue)';
const INK = 'var(--tile-ink)';
const GOLD = 'var(--tile-gold)';

const DOT_COLORS = [BLUE, RED, GREEN];

interface XY { x: number; y: number; }

// Dot arrangements mirror real tiles: corners, columns, diagonals
const DOT_LAYOUTS: Record<number, { r: number; pts: XY[] }> = {
    1: { r: 13, pts: [{ x: 30, y: 44 }] },
    2: { r: 10, pts: [{ x: 30, y: 28 }, { x: 30, y: 60 }] },
    3: { r: 9, pts: [{ x: 17, y: 25 }, { x: 30, y: 44 }, { x: 43, y: 63 }] },
    4: { r: 9, pts: [{ x: 19, y: 28 }, { x: 41, y: 28 }, { x: 19, y: 60 }, { x: 41, y: 60 }] },
    5: { r: 7.5, pts: [{ x: 17, y: 26 }, { x: 43, y: 26 }, { x: 30, y: 44 }, { x: 17, y: 62 }, { x: 43, y: 62 }] },
    6: { r: 7, pts: [{ x: 19, y: 25 }, { x: 41, y: 25 }, { x: 19, y: 44 }, { x: 41, y: 44 }, { x: 19, y: 63 }, { x: 41, y: 63 }] },
    7: {
        r: 6.5, pts: [
            { x: 15, y: 21 }, { x: 30, y: 25 }, { x: 45, y: 29 },
            { x: 20, y: 47 }, { x: 40, y: 47 }, { x: 20, y: 65 }, { x: 40, y: 65 }
        ]
    },
    8: {
        r: 6.5, pts: [
            { x: 20, y: 21 }, { x: 40, y: 21 }, { x: 20, y: 37 }, { x: 40, y: 37 },
            { x: 20, y: 53 }, { x: 40, y: 53 }, { x: 20, y: 69 }, { x: 40, y: 69 }
        ]
    },
    9: {
        r: 6.5, pts: [
            { x: 16, y: 25 }, { x: 30, y: 25 }, { x: 44, y: 25 },
            { x: 16, y: 44 }, { x: 30, y: 44 }, { x: 44, y: 44 },
            { x: 16, y: 63 }, { x: 30, y: 63 }, { x: 44, y: 63 }
        ]
    }
};

const BAM_LAYOUTS: Record<number, { h: number; pts: XY[] }> = {
    1: { h: 36, pts: [{ x: 30, y: 46 }] },
    2: { h: 20, pts: [{ x: 30, y: 30 }, { x: 30, y: 58 }] },
    3: { h: 20, pts: [{ x: 30, y: 28 }, { x: 19, y: 60 }, { x: 41, y: 60 }] },
    4: { h: 20, pts: [{ x: 20, y: 30 }, { x: 40, y: 30 }, { x: 20, y: 60 }, { x: 40, y: 60 }] },
    5: { h: 17, pts: [{ x: 18, y: 28 }, { x: 42, y: 28 }, { x: 30, y: 45 }, { x: 18, y: 62 }, { x: 42, y: 62 }] },
    6: { h: 18, pts: [{ x: 16, y: 30 }, { x: 30, y: 30 }, { x: 44, y: 30 }, { x: 16, y: 60 }, { x: 30, y: 60 }, { x: 44, y: 60 }] },
    7: {
        h: 14, pts: [
            { x: 30, y: 24 },
            { x: 16, y: 46 }, { x: 30, y: 46 }, { x: 44, y: 46 },
            { x: 16, y: 66 }, { x: 30, y: 66 }, { x: 44, y: 66 }
        ]
    },
    8: {
        h: 13, pts: [
            { x: 20, y: 22 }, { x: 40, y: 22 }, { x: 20, y: 38 }, { x: 40, y: 38 },
            { x: 20, y: 54 }, { x: 40, y: 54 }, { x: 20, y: 70 }, { x: 40, y: 70 }
        ]
    },
    9: {
        h: 14, pts: [
            { x: 16, y: 26 }, { x: 30, y: 26 }, { x: 44, y: 26 },
            { x: 16, y: 45 }, { x: 30, y: 45 }, { x: 44, y: 45 },
            { x: 16, y: 64 }, { x: 30, y: 64 }, { x: 44, y: 64 }
        ]
    }
};

const Dot: React.FC<{ x: number; y: number; r: number; color: string }> = ({ x, y, r, color }) => (
    <g>
        <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={r * 0.38} />
        <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke={color} strokeWidth={r * 0.14} opacity={0.55} />
        <circle cx={x} cy={y} r={r * 0.3} fill={color} />
    </g>
);

const BambooStick: React.FC<{ x: number; y: number; h: number; color: string }> = ({ x, y, h, color }) => {
    const w = 7;
    return (
        <g transform={`translate(${x},${y})`}>
            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w / 2.2} fill={color} />
            {/* node band */}
            <rect x={-w / 2 - 1.2} y={-1.6} width={w + 2.4} height={3.2} rx={1.6} fill={color} />
            {/* segment highlights */}
            <line x1={0} y1={-h / 2 + 3} x2={0} y2={-3} stroke="var(--tile-face-flat)" strokeWidth={1.4} opacity={0.5} strokeLinecap="round" />
            <line x1={0} y1={3} x2={0} y2={h / 2 - 3} stroke="var(--tile-face-flat)" strokeWidth={1.4} opacity={0.5} strokeLinecap="round" />
        </g>
    );
};

const CornerValue: React.FC<{ value: number; color?: string }> = ({ value, color = INK }) => (
    <text x={6} y={13} fontSize={11} fontWeight={800} fill={color} opacity={0.85}>{value}</text>
);

const WIND_CHARS: Record<string, string> = { north: '北', east: '東', south: '南', west: '西' };

const Petal: React.FC<{ angle: number }> = ({ angle }) => (
    <ellipse cx={0} cy={-9.5} rx={5.2} ry={9} fill={RED} opacity={0.88} transform={`rotate(${angle})`} />
);

export const TileFace: React.FC<{ tile: Tile }> = ({ tile }) => {
    let art: React.ReactNode = null;

    switch (tile.type) {
        case 'suit': {
            if (tile.suit === 'dots') {
                const { r, pts } = DOT_LAYOUTS[tile.value];
                art = (
                    <>
                        <CornerValue value={tile.value} color={BLUE} />
                        {pts.map((p, i) => (
                            <Dot key={i} x={p.x} y={p.y} r={r}
                                color={pts.length >= 5 ? DOT_COLORS[i % 3] : BLUE} />
                        ))}
                    </>
                );
            } else if (tile.suit === 'bams') {
                const { h, pts } = BAM_LAYOUTS[tile.value];
                art = (
                    <>
                        <CornerValue value={tile.value} color={GREEN} />
                        {pts.map((p, i) => (
                            <BambooStick key={i} x={p.x} y={p.y} h={h}
                                color={tile.value === 5 && i === 2 ? RED : GREEN} />
                        ))}
                    </>
                );
            } else {
                // craks: big numeral over the character wan (10,000)
                art = (
                    <>
                        <text x={30} y={38} textAnchor="middle" fontSize={30} fontWeight={800} fill={INK}>
                            {tile.value}
                        </text>
                        <text x={30} y={68} textAnchor="middle" fontSize={25} fontWeight={700} fill={RED}>
                            萬
                        </text>
                    </>
                );
            }
            break;
        }
        case 'wind':
            art = (
                <>
                    <text x={30} y={52} textAnchor="middle" fontSize={34} fontWeight={800} fill={INK}>
                        {tile.wind.charAt(0).toUpperCase()}
                    </text>
                    <text x={47} y={19} textAnchor="middle" fontSize={13} fontWeight={600} fill={INK} opacity={0.6}>
                        {WIND_CHARS[tile.wind]}
                    </text>
                </>
            );
            break;
        case 'dragon':
            if (tile.dragon === 'red') {
                art = <text x={30} y={53} textAnchor="middle" fontSize={36} fontWeight={700} fill={RED}>中</text>;
            } else if (tile.dragon === 'green') {
                art = <text x={30} y={53} textAnchor="middle" fontSize={36} fontWeight={700} fill={GREEN}>發</text>;
            } else {
                // white dragon "soap" — the classic empty blue frame
                art = (
                    <g stroke={BLUE} fill="none">
                        <rect x={15} y={15} width={30} height={50} rx={2.5} strokeWidth={3.2} />
                        <path d="M15 31 h6 M39 31 h6 M15 48 h6 M39 48 h6" strokeWidth={2.2} opacity={0.85} />
                    </g>
                );
            }
            break;
        case 'flower':
            art = (
                <>
                    <CornerValue value={tile.value} color={RED} />
                    <g transform="translate(30,42)">
                        {[0, 60, 120, 180, 240, 300].map(a => <Petal key={a} angle={a} />)}
                        <circle cx={0} cy={0} r={5.2} fill={GOLD} />
                    </g>
                    {/* stem + leaves */}
                    <path d="M30 56 q-1.5 9 1 16" stroke={GREEN} strokeWidth={2.4} fill="none" strokeLinecap="round" />
                    <path d="M30 64 q-7 -1 -9.5 -6.5 q7 -1 9.5 6.5z" fill={GREEN} opacity={0.9} />
                    <path d="M30.5 68 q6.5 -0.5 8.5 -5.5 q-6.5 -1 -8.5 5.5z" fill={GREEN} opacity={0.9} />
                </>
            );
            break;
        case 'joker':
            art = (
                <g>
                    {/* jester diamond burst */}
                    <g transform="translate(30,24)">
                        <path d="M0 -9 L6 0 L0 9 L-6 0 Z" fill={RED} transform="translate(-8,2) rotate(-15)" />
                        <path d="M0 -10 L7 0 L0 10 L-7 0 Z" fill={GOLD} />
                        <path d="M0 -9 L6 0 L0 9 L-6 0 Z" fill={GREEN} transform="translate(8,2) rotate(15)" />
                    </g>
                    <text x={30} y={50} textAnchor="middle" fontSize={12.5} fontWeight={800}
                        fill={GOLD} letterSpacing={0.5}>JO</text>
                    <text x={30} y={64} textAnchor="middle" fontSize={12.5} fontWeight={800}
                        fill={GOLD} letterSpacing={0.5}>KER</text>
                    <path d="M14 70 h32" stroke={GOLD} strokeWidth={1.6} opacity={0.7} strokeLinecap="round" />
                </g>
            );
            break;
    }

    return (
        <svg className="tile-svg" viewBox="0 0 60 80" role="presentation" focusable="false">
            {art}
        </svg>
    );
};
