import { useEffect, useState } from 'react';

// Mats and tile sets are styled entirely in CSS via the
// [data-mat] / [data-tiles] attributes on the app shell.
// This file is the catalog the settings panel renders from.

export interface MatOption {
    id: string;
    name: string;
    description: string;
    // swatch colors for the picker preview
    feltCenter: string;
    feltEdge: string;
    rail: string;
}

export interface TileSetOption {
    id: string;
    name: string;
    description: string;
    // preview colors for the picker
    face: string;
    ink: string;
    accent: string;
}

export const MATS: MatOption[] = [
    {
        id: 'emerald',
        name: 'Emerald Felt',
        description: 'Classic card-room green',
        feltCenter: '#2d6a4f',
        feltEdge: '#1b4332',
        rail: '#5d3a1a'
    },
    {
        id: 'burgundy',
        name: 'Burgundy Club',
        description: 'Deep wine-red velvet',
        feltCenter: '#7a2734',
        feltEdge: '#4a141e',
        rail: '#3a2317'
    },
    {
        id: 'midnight',
        name: 'Midnight Blue',
        description: 'Moody navy lounge',
        feltCenter: '#1e3a5f',
        feltEdge: '#0f2240',
        rail: '#1f2937'
    },
    {
        id: 'walnut',
        name: 'Walnut Table',
        description: 'Warm polished wood',
        feltCenter: '#6b4226',
        feltEdge: '#452815',
        rail: '#2b1810'
    },
    {
        id: 'teal',
        name: 'Pacific Teal',
        description: 'Fresh coastal teal',
        feltCenter: '#1f6f6b',
        feltEdge: '#11403e',
        rail: '#4a3728'
    }
];

export const TILE_SETS: TileSetOption[] = [
    {
        id: 'ivory',
        name: 'Classic Ivory',
        description: 'Crisp tournament white',
        face: '#fdfbf4',
        ink: '#1e293b',
        accent: '#c0392b'
    },
    {
        id: 'bakelite',
        name: 'Vintage Bakelite',
        description: 'Butterscotch heirloom',
        face: '#e8b84b',
        ink: '#3d2b1f',
        accent: '#8e2f1c'
    },
    {
        id: 'jade',
        name: 'Imperial Jade',
        description: 'Cool pale-green stone',
        face: '#d7e8d4',
        ink: '#1c3a2a',
        accent: '#a02c2c'
    },
    {
        id: 'onyx',
        name: 'Onyx & Gold',
        description: 'Black lacquer luxury',
        face: '#23252b',
        ink: '#e7d9ad',
        accent: '#e0b84e'
    },
    {
        id: 'rose',
        name: 'Rose Quartz',
        description: 'Soft blush pink',
        face: '#f7e2e4',
        ink: '#4a2530',
        accent: '#b03a52'
    }
];

export interface ThemeSelection {
    mat: string;
    tiles: string;
}

const STORAGE_KEY = 'amj-theme';

const DEFAULT_THEME: ThemeSelection = { mat: 'emerald', tiles: 'ivory' };

function loadTheme(): ThemeSelection {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_THEME;
        const parsed = JSON.parse(raw) as Partial<ThemeSelection>;
        return {
            mat: MATS.some(m => m.id === parsed.mat) ? parsed.mat! : DEFAULT_THEME.mat,
            tiles: TILE_SETS.some(t => t.id === parsed.tiles) ? parsed.tiles! : DEFAULT_THEME.tiles
        };
    } catch {
        return DEFAULT_THEME;
    }
}

export function useTheme() {
    const [theme, setTheme] = useState<ThemeSelection>(loadTheme);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
        } catch {
            // storage unavailable (private mode etc.) — selection still works for the session
        }
    }, [theme]);

    return {
        theme,
        setMat: (mat: string) => setTheme(t => ({ ...t, mat })),
        setTiles: (tiles: string) => setTheme(t => ({ ...t, tiles }))
    };
}
