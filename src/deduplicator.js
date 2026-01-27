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
    // Check URL or very similar title
    return !seen.some(s => s.url === article.url || s.title.toLowerCase() === article.title.toLowerCase());
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
