import React, { useId } from 'react';
import type { Tile } from '../types/mahjong';
import { useTileStyle } from '../theme/TileStyleContext';
import type { TileArtStyle } from '../theme/themes';

// Hand-drawn SVG faces for every tile, replacing emoji glyphs.
// All colors come from CSS variables so the selected tile set
// (ivory, jade, onyx...) recolors the artwork automatically.
//
// Stage 1 clarity pass: tiles are identified BY THEIR ARTWORK the way
// real tiles are — N dots show N pips, N bams show N bamboo shoots,
// craks show the 数字 + 萬 stack, honors get distinct hero glyphs.
// No suit letters: the picture is the identifier. Everything is tuned
// to stay legible at the 0.6 scale used in the discard pile/exposures.

const RED = 'var(--tile-red)';
const GREEN = 'var(--tile-green)';
const BLUE = 'var(--tile-blue)';
const INK = 'var(--tile-ink)';
const GOLD = 'var(--tile-gold)';

const DOT_COLORS = [BLUE, RED, GREEN];

interface XY { x: number; y: number; }

// Dot arrangements mirror real tiles: corners, columns, diagonals.
// Radii are kept generous so 6–9 stay countable when the tile shrinks.
const DOT_LAYOUTS: Record<number, { r: number; pts: XY[] }> = {
    1: { r: 15, pts: [{ x: 30, y: 44 }] },
    2: { r: 11, pts: [{ x: 30, y: 27 }, { x: 30, y: 61 }] },
    3: { r: 10, pts: [{ x: 16, y: 24 }, { x: 30, y: 44 }, { x: 44, y: 64 }] },
    4: { r: 10, pts: [{ x: 19, y: 28 }, { x: 41, y: 28 }, { x: 19, y: 60 }, { x: 41, y: 60 }] },
    5: { r: 8.5, pts: [{ x: 17, y: 25 }, { x: 43, y: 25 }, { x: 30, y: 44 }, { x: 17, y: 63 }, { x: 43, y: 63 }] },
    6: { r: 8, pts: [{ x: 19, y: 24 }, { x: 41, y: 24 }, { x: 19, y: 44 }, { x: 41, y: 44 }, { x: 19, y: 64 }, { x: 41, y: 64 }] },
    7: {
        r: 7.2, pts: [
            { x: 14, y: 20 }, { x: 30, y: 24 }, { x: 46, y: 28 },
            { x: 19, y: 47 }, { x: 41, y: 47 }, { x: 19, y: 66 }, { x: 41, y: 66 }
        ]
    },
    8: {
        r: 7, pts: [
            { x: 20, y: 20 }, { x: 40, y: 20 }, { x: 20, y: 37 }, { x: 40, y: 37 },
            { x: 20, y: 54 }, { x: 40, y: 54 }, { x: 20, y: 71 }, { x: 40, y: 71 }
        ]
    },
    9: {
        r: 7, pts: [
            { x: 15, y: 24 }, { x: 30, y: 24 }, { x: 45, y: 24 },
            { x: 15, y: 44 }, { x: 30, y: 44 }, { x: 45, y: 44 },
            { x: 15, y: 64 }, { x: 30, y: 64 }, { x: 45, y: 64 }
        ]
    }
};

// Bamboo stick positions per value. 1-bam is special (the bird), so it
// isn't in this table. Heights shrink as count rises so they never crowd.
const BAM_LAYOUTS: Record<number, { h: number; pts: XY[] }> = {
    2: { h: 26, pts: [{ x: 30, y: 28 }, { x: 30, y: 60 }] },
    3: { h: 24, pts: [{ x: 30, y: 26 }, { x: 19, y: 60 }, { x: 41, y: 60 }] },
    4: { h: 24, pts: [{ x: 20, y: 28 }, { x: 40, y: 28 }, { x: 20, y: 60 }, { x: 40, y: 60 }] },
    5: { h: 20, pts: [{ x: 18, y: 27 }, { x: 42, y: 27 }, { x: 30, y: 44 }, { x: 18, y: 62 }, { x: 42, y: 62 }] },
    6: { h: 20, pts: [{ x: 16, y: 28 }, { x: 30, y: 28 }, { x: 44, y: 28 }, { x: 16, y: 60 }, { x: 30, y: 60 }, { x: 44, y: 60 }] },
    7: {
        h: 16, pts: [
            { x: 30, y: 22 },
            { x: 16, y: 45 }, { x: 30, y: 45 }, { x: 44, y: 45 },
            { x: 16, y: 66 }, { x: 30, y: 66 }, { x: 44, y: 66 }
        ]
    },
    8: {
        h: 15, pts: [
            { x: 20, y: 21 }, { x: 40, y: 21 }, { x: 20, y: 38 }, { x: 40, y: 38 },
            { x: 20, y: 55 }, { x: 40, y: 55 }, { x: 20, y: 72 }, { x: 40, y: 72 }
        ]
    },
    9: {
        h: 15, pts: [
            { x: 16, y: 25 }, { x: 30, y: 25 }, { x: 44, y: 25 },
            { x: 16, y: 45 }, { x: 30, y: 45 }, { x: 44, y: 45 },
            { x: 16, y: 65 }, { x: 30, y: 65 }, { x: 44, y: 65 }
        ]
    }
};

// Chinese numerals for craks (number + 萬), so a crak reads as a real
// tile would: "三萬", not a lone Arabic digit.
const CRAK_NUMERALS: Record<number, string> = {
    1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九'
};

// Small top-left index number for the three suits, so the value reads at
// a glance without counting pips/sticks. Number only — no suit letter;
// the artwork conveys the suit, the number confirms the count. A flat-face
// chip sits behind it so it stays legible even where artwork reaches the
// corner (e.g. the across-the-top pip/stick rows).
const CornerNum: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <g>
        <rect x={1.5} y={2} width={13} height={15} rx={3}
            fill="var(--tile-face-flat)" opacity={0.85} />
        <text x={8} y={14} textAnchor="middle" fontSize={12} fontWeight={800} fill={color}>{value}</text>
    </g>
);

const Dot: React.FC<{ x: number; y: number; r: number; color: string }> = ({ x, y, r, color }) => (
    <g>
        {/* solid ring + filled core reads clearly even when tiny */}
        <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={r * 0.42} />
        <circle cx={x} cy={y} r={r * 0.58} fill={color} opacity={0.18} />
        <circle cx={x} cy={y} r={r * 0.32} fill={color} />
    </g>
);

// A single bamboo cane: rounded shaft, two node bands, and a pair of
// leaves so it reads as bamboo (not a plain bar) at small sizes.
const BambooStick: React.FC<{ x: number; y: number; h: number; color: string }> = ({ x, y, h, color }) => {
    const w = 7.5;
    return (
        <g transform={`translate(${x},${y})`}>
            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w / 2.4} fill={color} />
            {/* node bands at the upper & lower third */}
            <rect x={-w / 2 - 1.4} y={-h / 6 - 1.6} width={w + 2.8} height={3.2} rx={1.6} fill={color} />
            <rect x={-w / 2 - 1.4} y={h / 6 - 1.6} width={w + 2.8} height={3.2} rx={1.6} fill={color} />
            {/* leaves at the crown */}
            <path d={`M0 ${-h / 2} q-7 -3 -9 -9 q7 1 9 6z`} fill={color} opacity={0.9} />
            <path d={`M0 ${-h / 2} q7 -3 9 -9 q-7 1 -9 6z`} fill={color} opacity={0.9} />
            {/* center sheen */}
            <line x1={0} y1={-h / 2 + 4} x2={0} y2={h / 2 - 4} stroke="var(--tile-face-flat)" strokeWidth={1.3} opacity={0.45} strokeLinecap="round" />
        </g>
    );
};

// The classic 1-Bam bird (sparrow) instead of a single cane.
const OneBamBird: React.FC<{ color: string }> = ({ color }) => (
    <g transform="translate(30,44)" fill={color}>
        {/* body */}
        <ellipse cx={0} cy={2} rx={11} ry={14} />
        {/* head */}
        <circle cx={1} cy={-13} r={7} />
        {/* beak */}
        <path d="M7 -14 l9 -2 l-8 5z" fill={GOLD} />
        {/* tail */}
        <path d="M-9 12 l-11 12 l8 -3 l-3 8 l13 -13z" />
        {/* wing detail */}
        <path d="M-2 -2 q9 2 11 13 q-9 -1 -13 -7z" fill="var(--tile-face-flat)" opacity={0.4} />
        {/* eye */}
        <circle cx={3} cy={-14} r={1.6} fill="var(--tile-face-flat)" />
    </g>
);

const WIND_CHARS: Record<string, string> = { north: '北', east: '東', south: '南', west: '西' };
const WIND_LETTERS: Record<string, string> = { north: 'N', east: 'E', south: 'S', west: 'W' };
// Each wind points its arrow at its cardinal direction (degrees clockwise
// from north). The compass-rose frame + directional arrow give winds a
// silhouette no crak shares, so they never read as a numbered suit tile.
const WIND_ROTATION: Record<string, number> = {
    north: 0, east: 90, south: 180, west: 270
};

// A compass rose in the tile's upper area: a four-point star frame plus a
// bold arrow, rotated to the wind's direction. Kept within an inner radius
// (~20) and centered high (y=36) so the arrow never reaches the CJK glyph
// or the direction letter in the band below — including South's down-arrow.
const CompassRose: React.FC<{ rotation: number }> = ({ rotation }) => (
    <g transform={`translate(30,36) rotate(${rotation})`}>
        {/* four-point star frame */}
        <path d="M0 -21 L5 -5 L21 0 L5 5 L0 21 L-5 5 L-21 0 L-5 -5 Z"
            fill="none" stroke={INK} strokeWidth={1.3} opacity={0.26} />
        {/* bold direction arrow toward the top (north of the rose) */}
        <path d="M0 -20 L6 -10 L2 -10 L2 -3 L-2 -3 L-2 -10 L-6 -10 Z"
            fill={RED} />
    </g>
);

// Eight distinct flower faces: values 1–4 are the four Flowers (blooms,
// each a different petal count/color), values 5–8 are the four Seasons
// (a different motif each, so the two quartets read as a set of 8). All
// are interchangeable in the rules — variety is purely visual.
const BLOOMS = [
    { petals: 5, color: RED, ry: 9 },
    { petals: 6, color: GOLD, ry: 8 },
    { petals: 8, color: BLUE, ry: 7.5 },
    { petals: 4, color: GREEN, ry: 10 },
];

const Bloom: React.FC<{ idx: number }> = ({ idx }) => {
    const { petals, color, ry } = BLOOMS[idx % 4];
    return (
        <g transform="translate(30,40)">
            {Array.from({ length: petals }).map((_, i) => (
                <ellipse
                    key={i}
                    cx={0} cy={-10} rx={5} ry={ry}
                    fill={color} opacity={0.85}
                    transform={`rotate(${(360 / petals) * i})`}
                />
            ))}
            <circle cx={0} cy={0} r={5} fill={GOLD} />
            <circle cx={0} cy={0} r={2.4} fill={INK} opacity={0.6} />
        </g>
    );
};

// Seasons (5–8): Spring=sprout, Summer=sun, Autumn=leaf, Winter=snowflake.
const Season: React.FC<{ idx: number }> = ({ idx }) => {
    switch (idx % 4) {
        case 0: // Spring — green sprout
            return (
                <g transform="translate(30,42)" stroke={GREEN} fill={GREEN}>
                    <path d="M0 16 V-4" strokeWidth={2.6} fill="none" strokeLinecap="round" />
                    <path d="M0 2 q-12 -2 -15 -13 q12 0 15 9z" opacity={0.9} stroke="none" />
                    <path d="M0 -2 q12 -2 15 -13 q-12 0 -15 9z" opacity={0.9} stroke="none" />
                </g>
            );
        case 1: // Summer — sun
            return (
                <g transform="translate(30,40)" stroke={RED} fill={RED}>
                    <circle cx={0} cy={0} r={8} stroke="none" />
                    {Array.from({ length: 8 }).map((_, i) => (
                        <line key={i} x1={0} y1={-12} x2={0} y2={-16}
                            strokeWidth={2.2} strokeLinecap="round"
                            transform={`rotate(${45 * i})`} />
                    ))}
                </g>
            );
        case 2: // Autumn — maple leaf
            return (
                <g transform="translate(30,40)" fill={GOLD}>
                    <path d="M0 -15 L4 -5 L13 -7 L6 2 L11 11 L0 6 L-11 11 L-6 2 L-13 -7 L-4 -5 Z" />
                    <path d="M0 16 V0" stroke={GREEN} strokeWidth={2} fill="none" strokeLinecap="round" />
                </g>
            );
        default: // Winter — snowflake
            return (
                <g transform="translate(30,40)" stroke={BLUE} fill="none">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <g key={i} transform={`rotate(${60 * i})`}>
                            <line x1={0} y1={0} x2={0} y2={-15} strokeWidth={2.2} strokeLinecap="round" />
                            <line x1={0} y1={-8} x2={-5} y2={-12} strokeWidth={1.8} strokeLinecap="round" />
                            <line x1={0} y1={-8} x2={5} y2={-12} strokeWidth={1.8} strokeLinecap="round" />
                        </g>
                    ))}
                </g>
            );
    }
};

// ============================================================
// Per-set art styles. Colors come from CSS [data-tiles]; these add the
// *drawing treatment* a recolor can't: glow, bevel, gold-leaf outline,
// painted softness. The same Stage-1 geometry flows through an SVG filter
// + group attributes so every set reads as a distinct material.
// ============================================================

interface StyleEnvelope {
    // SVG <filter> markup (or null) applied to the whole art group.
    filter: (id: string) => React.ReactNode;
    // attributes spread onto the wrapping <g>
    groupProps: React.SVGProps<SVGGElement>;
}

function styleEnvelope(style: TileArtStyle, id: string): StyleEnvelope {
    switch (style) {
        case 'neon':
            // bright outlined art with an outer glow; faces are dark so it pops
            return {
                filter: (fid) => (
                    <filter id={fid} x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b" />
                        <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                ),
                groupProps: { filter: `url(#${id})` },
            };
        case 'engraved':
            // carved-stone: a soft light bevel above + dark shadow below
            return {
                filter: (fid) => (
                    <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0.8" stdDeviation="0.3" floodColor="#000" floodOpacity="0.35" />
                        <feDropShadow dx="0" dy="-0.7" stdDeviation="0.3" floodColor="#fff" floodOpacity="0.4" />
                    </filter>
                ),
                groupProps: { filter: `url(#${id})` },
            };
        case 'inlay':
            // gold-leaf: a fine luminous edge around the strokes
            return {
                filter: (fid) => (
                    <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="0.6" floodColor="#ffe9a8" floodOpacity="0.55" />
                    </filter>
                ),
                groupProps: { filter: `url(#${id})` },
            };
        case 'watercolor':
            // painted wash: slight softening + a touch of bleed
            return {
                filter: (fid) => (
                    <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="0.45" result="soft" />
                        <feDropShadow in="soft" dx="0.4" dy="0.5" stdDeviation="0.7" floodColor="#5a6a72" floodOpacity="0.2" />
                    </filter>
                ),
                groupProps: { filter: `url(#${id})`, opacity: 0.94 },
            };
        case 'linework':
            // delicate: lighten the whole mark so it reads as fine line art
            return { filter: () => null, groupProps: { opacity: 0.82 } };
        case 'retro':
            // warm vintage: a faint soft halo, no hard edges
            return {
                filter: (fid) => (
                    <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0.6" stdDeviation="0.4" floodColor="#5a3b14" floodOpacity="0.28" />
                    </filter>
                ),
                groupProps: { filter: `url(#${id})` },
            };
        case 'classic':
        default:
            return { filter: () => null, groupProps: {} };
    }
}

export const TileFace: React.FC<{ tile: Tile }> = ({ tile }) => {
    let art: React.ReactNode = null;

    switch (tile.type) {
        case 'suit': {
            // Suit accent color also tints the corner index number.
            const suitColor = tile.suit === 'dots' ? BLUE : tile.suit === 'bams' ? GREEN : RED;
            let suitArt: React.ReactNode;
            if (tile.suit === 'dots') {
                const { r, pts } = DOT_LAYOUTS[tile.value];
                suitArt = (
                    <>
                        {pts.map((p, i) => (
                            <Dot key={i} x={p.x} y={p.y} r={r}
                                color={pts.length >= 5 ? DOT_COLORS[i % 3] : BLUE} />
                        ))}
                    </>
                );
            } else if (tile.suit === 'bams') {
                if (tile.value === 1) {
                    suitArt = <OneBamBird color={GREEN} />;
                } else {
                    const { h, pts } = BAM_LAYOUTS[tile.value];
                    suitArt = (
                        <>
                            {pts.map((p, i) => (
                                <BambooStick key={i} x={p.x} y={p.y} h={h}
                                    color={tile.value === 5 && i === 2 ? RED : GREEN} />
                            ))}
                        </>
                    );
                }
            } else {
                // craks: Chinese numeral over the character 萬 (10,000)
                suitArt = (
                    <>
                        <text x={30} y={40} textAnchor="middle" fontSize={32} fontWeight={800} fill={INK}>
                            {CRAK_NUMERALS[tile.value]}
                        </text>
                        <text x={30} y={70} textAnchor="middle" fontSize={26} fontWeight={700} fill={RED}>
                            萬
                        </text>
                    </>
                );
            }
            art = (
                <>
                    {suitArt}
                    <CornerNum value={tile.value} color={suitColor} />
                </>
            );
            break;
        }
        case 'wind': {
            art = (
                <>
                    {/* compass rose + directional arrow — a wind silhouette, never a crak */}
                    <CompassRose rotation={WIND_ROTATION[tile.wind]} />
                    {/* hero CJK glyph centered in the rose */}
                    <text x={30} y={46} textAnchor="middle" fontSize={24} fontWeight={800} fill={INK}>
                        {WIND_CHARS[tile.wind]}
                    </text>
                    {/* bold Latin direction letter below */}
                    <text x={30} y={74} textAnchor="middle" fontSize={15} fontWeight={800} fill={RED}
                        letterSpacing={1}>
                        {WIND_LETTERS[tile.wind]}
                    </text>
                </>
            );
            break;
        }
        case 'dragon':
            if (tile.dragon === 'red') {
                art = (
                    <>
                        <circle cx={30} cy={42} r={24} fill="none" stroke={RED} strokeWidth={2.4} opacity={0.5} />
                        <text x={30} y={54} textAnchor="middle" fontSize={36} fontWeight={700} fill={RED}>中</text>
                    </>
                );
            } else if (tile.dragon === 'green') {
                art = (
                    <>
                        <circle cx={30} cy={42} r={24} fill="none" stroke={GREEN} strokeWidth={2.4} opacity={0.5} />
                        <text x={30} y={54} textAnchor="middle" fontSize={34} fontWeight={700} fill={GREEN}>發</text>
                    </>
                );
            } else {
                // white dragon "soap" — the classic empty blue frame
                art = (
                    <g stroke={BLUE} fill="none">
                        <rect x={15} y={15} width={30} height={50} rx={3} strokeWidth={3.4} />
                        <path d="M15 31 h7 M38 31 h7 M15 48 h7 M38 48 h7" strokeWidth={2.4} opacity={0.85} />
                    </g>
                );
            }
            break;
        case 'flower': {
            // 1–4 Flowers (blooms with a stem); 5–8 Seasons (standalone motifs).
            const isBloom = tile.value <= 4;
            art = isBloom ? (
                <>
                    <Bloom idx={tile.value - 1} />
                    {/* stem + leaves anchor it as a flower tile */}
                    <path d="M30 54 q-1.5 10 1 18" stroke={GREEN} strokeWidth={2.6} fill="none" strokeLinecap="round" />
                    <path d="M30 62 q-7 -1 -9.5 -6.5 q7 -1 9.5 6.5z" fill={GREEN} opacity={0.9} />
                    <path d="M30.5 66 q6.5 -0.5 8.5 -5.5 q-6.5 -1 -8.5 5.5z" fill={GREEN} opacity={0.9} />
                    <CornerNum value={tile.value} color={GREEN} />
                </>
            ) : (
                <>
                    <Season idx={tile.value - 5} />
                    <CornerNum value={tile.value} color={GREEN} />
                </>
            );
            break;
        }
        case 'joker':
            art = (
                <g>
                    {/* jester diamond burst */}
                    <g transform="translate(30,26)">
                        <path d="M0 -10 L7 0 L0 10 L-7 0 Z" fill={RED} transform="translate(-9,2) rotate(-15)" />
                        <path d="M0 -12 L8 0 L0 12 L-8 0 Z" fill={GOLD} />
                        <path d="M0 -10 L7 0 L0 10 L-7 0 Z" fill={GREEN} transform="translate(9,2) rotate(15)" />
                    </g>
                    {/* bold single-line wordmark survives downscaling better than stacked JO/KER */}
                    <text x={30} y={56} textAnchor="middle" fontSize={13} fontWeight={800}
                        fill={GOLD} letterSpacing={0.5}>JOKER</text>
                    <path d="M12 64 h36" stroke={GOLD} strokeWidth={1.8} opacity={0.7} strokeLinecap="round" />
                    <text x={30} y={75} textAnchor="middle" fontSize={9} fontWeight={700}
                        fill={INK} opacity={0.4} letterSpacing={1}>WILD</text>
                </g>
            );
            break;
    }

    return <StyledTileSvg>{art}</StyledTileSvg>;
};

// Wraps the tile art in the active set's style envelope (filter + group attrs).
// Split out so it can call hooks (useTileStyle / useId) cleanly.
const StyledTileSvg: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const style = useTileStyle();
    const rawId = useId();
    const filterId = `tf${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const env = styleEnvelope(style, filterId);
    return (
        <svg className="tile-svg" viewBox="0 0 60 80" role="presentation" focusable="false">
            <defs>{env.filter(filterId)}</defs>
            <g {...env.groupProps}>{children}</g>
        </svg>
    );
};
