import fs from 'fs/promises';
import path from 'path';
import { isNew } from './deduplicator.js';
import { detectCategory } from './categoryDetector.js';
import { getHighQualityImage } from './scraper.js';

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

function calculateScore(text, source) {
    let score = 50; // Base score
    const lowerText = text.toLowerCase();

    // Priority Topics (Massive Boost)
    if (lowerText.includes('trump')) score += 100;
    if (lowerText.includes('ice') || lowerText.includes('immigration') || lowerText.includes('deportation')) score += 100;
    if (lowerText.includes('border') || lowerText.includes('frontera')) score += 80;

    // Power Verbs (Action-Oriented Headlines)
    const powerVerbs = ['seized', 'deported', 'arrested', 'signed', 'banned', 'emergency', 'raided', 'raids', 'order', 'confirmed'];
    for (const verb of powerVerbs) {
        if (lowerText.includes(verb)) {
            score += 100;
            break;
        }
    }

    // High Impact Keywords
    if (lowerText.includes('breaking')) score += 50;
    if (lowerText.includes('live updates')) score += 40;
    if (lowerText.includes('shoot') || lowerText.includes('kill') || lowerText.includes('dead')) score += 40;
    if (lowerText.includes('war') || lowerText.includes('attack')) score += 30;

    // Penalty for Sports (unless it's a massive trend)
    const sportsKeywords = ['nba', 'nfl', 'mlb', 'trading', 'player', 'cavaliers', 'kings', 'lakers', 'team', 'score', 'game', 'espn'];
    for (const sport of sportsKeywords) {
        if (lowerText.includes(sport)) {
            score -= 150; // Heavy penalty for sports
            break;
        }
    }

    return score;
}

export async function selectBestArticle(articles, targetLanguage) {
    const lastSource = await getLastSource();
    const candidates = [];

    for (const art of articles) {
        const now = new Date();
        const pubDate = new Date(art.pubDate);
        const ageMs = now - pubDate;

        // Extended Window: 12 hours (43,200,000 ms)
        if (ageMs > 43200000) continue;

        const isKnown = !(await isNew(art));
        if (isKnown) {
            console.log(`[Selector] Skipping seen article: ${art.title.slice(0, 40)}...`);
            continue;
        }

        const detection = detectCategory(art);
        let finalScore = calculateScore(art.title, art.source);

        // --- Recency Bonus (Prioritizing the "Just Happened") ---
        let recencyBonus = 0;
        if (ageMs < 3600000) recencyBonus = 150;      // < 1 hour: Massive boost
        else if (ageMs < 10800000) recencyBonus = 80; // 1-3 hours: Strong boost
        else if (ageMs < 21600000) recencyBonus = 40; // 3-6 hours: Small boost

        finalScore += recencyBonus;

        // --- Multi-Source Trend Detection ---
        let matchCount = 0;
        const artWords = art.title.toLowerCase().split(' ').filter(w => w.length > 4);

        for (const other of articles) {
            if (other.source === art.source) continue;
            const otherWords = other.title.toLowerCase();
            const overlap = artWords.filter(w => otherWords.includes(w));
            if (overlap.length >= 3) matchCount++;
        }

        let isTrending = false;
        if (matchCount > 0) {
            isTrending = true;
            finalScore += 200;
            console.log(`[Selector] Hot Trend Detected! (${matchCount} sources): ${art.title.slice(0, 40)}`);
        }

        // Favor target language
        if (art.originalLanguage === targetLanguage) finalScore += 20;

        // Penalty for repeating same source
        if (art.source === lastSource) finalScore -= 40;

        candidates.push({
            ...art,
            category: detection.category,
            categoryColor: detection.color,
            isTrending: isTrending,
            score: finalScore
        });
    }

    if (candidates.length === 0) return null;

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Picking the winner with Image-First verification
    const topCandidates = candidates.slice(0, 3);
    for (const candidate of topCandidates) {
        console.log(`[Selector] Probing HQ image for: ${candidate.title.slice(0, 40)}...`);
        const hqImage = await getHighQualityImage(candidate.url);
        if (hqImage) {
            candidate.imageUrl = hqImage;
            console.log(`[Selector] Winner found with HQ image: ${candidate.source}`);
            return candidate;
        }
    }

    // Fallback to top candidate if no HQ image found in top 3
    console.log(`[Selector] No HQ image found in top 3, falling back to top candidate.`);
    return candidates[0];
}
