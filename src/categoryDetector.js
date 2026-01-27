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
        'inmigración': 'INMIGRACIÓN',
        'ice': 'ICE',
        'trump': 'TRUMP',
        'biden': 'POLITICS',
        'breaking': 'BREAKING NEWS',
        'última hora': 'ÚLTIMA HORA',
        'border': 'BORDER',
        'frontera': 'FRONTERA'
    };

    for (const [kw, cat] of Object.entries(mapping)) {
        if (text.includes(kw)) {
            detected = cat;
            score += 50;
            break;
        }
    }

    // State detection
    for (const state of PRIORITY_STATES) {
        if (text.includes(state)) {
            score += 30;
            // If we don't have a specific category yet, use the state
            if (detected === 'GENERAL') detected = state.toUpperCase();
        }
    }

    return {
        category: detected,
        score: score
    };
}
