import fs from 'fs/promises';
import path from 'path';

const SEEN_FILE = path.resolve(process.cwd(), 'data/seen_articles.json');

async function loadSeen() {
    try {
        const data = await fs.readFile(SEEN_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function isNew(article) {
    const seen = await loadSeen();
    const clean = (str) => (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3);
    const artWords = clean(article.title);

    for (const s of seen) {
        // 1. Strict URL Check
        if (s.url === article.url) return false;

        // 2. Strict Title Check
        if (s.title.toLowerCase() === article.title.toLowerCase()) return false;

        // 3. Fuzzy Title Check (Over 60% keyword overlap)
        const seenWords = clean(s.title);
        const overlap = artWords.filter(w => seenWords.includes(w));
        const similarity = overlap.length / Math.max(artWords.length, seenWords.length);

        if (similarity > 0.6) {
            console.log(`[Deduplicator] Potential duplicate found (Similarity: ${Math.round(similarity * 100)}%): "${article.title.slice(0, 30)}..." matches seen "${s.title.slice(0, 30)}..."`);
            return false;
        }
    }

    return true;
}

export async function markAsSeen(article) {
    const seen = await loadSeen();
    seen.push({
        url: article.url,
        title: article.title,
        timestamp: new Date().toISOString()
    });

    // Keep only last 1000 items or last 48 hours
    const limit = new Date();
    limit.setHours(limit.getHours() - 48);

    const filtered = seen.filter(s => new Date(s.timestamp) > limit).slice(-1000);

    await fs.writeFile(SEEN_FILE, JSON.stringify(filtered, null, 2));
}
