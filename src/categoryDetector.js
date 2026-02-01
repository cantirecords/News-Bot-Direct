import dotenv from 'dotenv';
dotenv.config();

const PRIORITY_CATEGORIES = (process.env.PRIORITY_CATEGORIES || '').split(',').map(k => k.trim().toLowerCase());
const PRIORITY_STATES = (process.env.PRIORITY_STATES || '').split(',').map(k => k.trim().toLowerCase());

export function detectCategory(article) {
    const text = `${article.title} ${article.description}`.toLowerCase();

    let detected = 'BREAKING NEWS';
    let score = 0;

    // Keyword mapping to clean categories
    const mapping = {
        'immigration': 'IMMIGRATION',
        'ice': 'ICE',
        'trump': 'TRUMP',
        'deportation': 'DEPORTATION',
        'border': 'BORDER',
        'breaking': 'BREAKING NEWS',
        'white house': 'POLITICS',
        'court': 'LEGAL',
        'showdown': 'SHOWDOWN',
        'clash': 'CLASH',
        'battle': 'BATTLE',
        'emergency': 'EMERGENCY'
    };

    for (const [kw, cat] of Object.entries(mapping)) {
        if (text.includes(kw)) {
            detected = cat;
            score += 70; // High priority for these topics
            break;
        }
    }

    // State detection boosting
    const states = [
        'texas', 'florida', 'california', 'new york', 'arizona', 'georgia', 'pennsylvania',
        'ohio', 'michigan', 'illinois', 'louisiana', 'alabama', 'kentucky', 'tennessee'
    ];

    for (const state of states) {
        if (text.includes(state)) {
            score += 50;
            if (detected === 'BREAKING NEWS' || detected === 'GENERAL') {
                detected = state.toUpperCase();
            }
        }
    }

    // City & Hotspot detection (Ultra-Local)
    const hotspots = {
        'eagle pass': 'EAGLE PASS, TX',
        'el paso': 'EL PASO, TX',
        'miami': 'MIAMI, FL',
        'chicago': 'CHICAGO, IL',
        'new york city': 'NEW YORK CITY',
        'nyc': 'NEW YORK CITY',
        'brownsville': 'BROWNSVILLE, TX',
        'mcallen': 'MCALLEN, TX',
        'del rio': 'DEL RIO, TX'
    };

    for (const [kw, name] of Object.entries(hotspots)) {
        if (text.includes(kw)) {
            detected = name;
            score += 80;
            break; // City is the most specific, so we stop here
        }
    }

    // Color Mapping (Fail-safe)
    const colorMapping = {
        'TRUMP': '#D4AF37',       // Gold
        'ICE': '#CC0000',         // Deep Red
        'EMERGENCY': '#FF0000',   // Bright Red
        'SHOWDOWN': '#FF4500',    // OrangeRed
        'CLASH': '#FF4500',
        'BATTLE': '#FF4500',
        'BORDER': '#FF8C00',      // Dark Orange
        'LEGAL': '#000080',       // Navy Blue
        'IMMIGRATION': '#2F4F4F', // Dark Slate
        'BREAKING NEWS': '#000000' // Black
    };

    const finalColor = colorMapping[detected] || '#333333'; // Default to Dark Gray

    return {
        category: detected,
        score: score,
        color: finalColor
    };
}
