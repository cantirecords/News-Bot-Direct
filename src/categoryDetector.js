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
        'court': 'LEGAL'
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
            // Elevate state to category if it's still generic
            if (detected === 'BREAKING NEWS' || detected === 'GENERAL') {
                detected = state.toUpperCase();
            }
        }
    }

    return {
        category: detected,
        score: score
    };
}
