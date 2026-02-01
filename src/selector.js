import fs from 'fs/promises';
import path from 'path';
import { isNew } from './deduplicator.js';
import { detectCategory } from './categoryDetector.js';

const STATE_FILE = path.resolve(process.cwd(), 'data/state.json');

async function getLastSource() {
    try {
        const data = await fs.readFile(STATE_FILE, 'utf8');
        return JSON.parse(data).lastSource;
    } catch {
        return null;
    }
}

export async function saveLastSource(source) {
    await fs.writeFile(STATE_FILE, JSON.stringify({ lastSource: source }, null, 2));
}

import { getHighQualityImage } from './scraper.js';

function calculateScore(text, source) {
    let score = 50; // Base score
    const lowerText = text.toLowerCase();

    // Priority Topics (Massive Boost)
    if (lowerText.includes('trump')) score += 100;
    if (lowerText.includes('ice') || lowerText.includes('immigration') || lowerText.includes('deportation')) score += 100;
    if (lowerText.includes('border') || lowerText.includes('frontera')) score += 80;

    // High Impact Keywords
    if (lowerText.includes('breaking')) score += 50;
    if (lowerText.includes('live updates')) score += 40;
    if (lowerText.includes('shoot') || lowerText.includes('kill') || lowerText.includes('dead')) score += 40;
    if (lowerText.includes('war') || lowerText.includes('attack')) score += 30;

    return score;
}

export async function selectBestArticle(articles, targetLanguage) {
    const lastSource = await getLastSource();
    const candidates = [];

    for (const art of articles) {
        const now = new Date();
        const pubDate = new Date(art.pubDate);
        // Strictly 3 hours (10,800,000 ms) 
        if ((now - pubDate) > 10800000) continue;

        if (await isNew(art)) {
            const detection = detectCategory(art);
            let finalScore = calculateScore(art.title, art.source);

            // Favor target language but allow general pool
            if (art.originalLanguage === targetLanguage) finalScore += 20;

            // Penalty for repeating same source
            if (art.source === lastSource) finalScore -= 40;

            candidates.push({ ...art, category: detection.category, score: finalScore });
        }
    }

    if (candidates.length === 0) return null;

    // Ordenamos por puntuación y fecha para elegir el mejor
    const bestArticles = candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.pubDate) - new Date(a.pubDate);
    });

    // Intentamos obtener la imagen de alta calidad solo para los mejores candidatos
    // hasta encontrar uno que tenga una imagen válida
    for (const best of bestArticles.slice(0, 5)) {
        console.log(`[Selector] Fetching HQ image for candidate: ${best.title.slice(0, 30)}...`);
        const hqImage = await getHighQualityImage(best.url);
        if (hqImage) {
            return { ...best, imageUrl: hqImage };
        }
        // If best has a fallback image URL from RSS, use it if no HQ found
        if (best.imageUrl) return best;
    }

    return null;
}
