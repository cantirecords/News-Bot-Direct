import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const QUOTA_FILE = path.resolve(process.cwd(), 'data/daily_quota.json');

async function getQuotaData() {
    const today = new Date().toISOString().split('T')[0];
    try {
        const data = await fs.readFile(QUOTA_FILE, 'utf8');
        const json = JSON.parse(data);
        if (json.date === today) return json;
    } catch { }

    return { date: today, posts_en: 0, posts_es: 0 };
}

export async function canPost(language) {
    const data = await getQuotaData();
    const limit_en = parseInt(process.env.DAILY_POSTS_EN || '5');
    const limit_es = parseInt(process.env.DAILY_POSTS_ES || '5');

    if (language === 'en' && data.posts_en < limit_en) return true;
    if (language === 'es' && data.posts_es < limit_es) return true;

    return false;
}

export async function incrementPostCount(language) {
    const data = await getQuotaData();
    if (language === 'en') data.posts_en++;
    if (language === 'es') data.posts_es++;

    await fs.writeFile(QUOTA_FILE, JSON.stringify(data, null, 2));
}

export async function getNextLanguage() {
    const data = await getQuotaData();
    const limit_en = parseInt(process.env.DAILY_POSTS_EN || '5');
    const limit_es = parseInt(process.env.DAILY_POSTS_ES || '5');

    // Priority logic for 50/50 balance
    // 1. If Spanish has fewer posts than English, go Spanish
    if (data.posts_es < data.posts_en && data.posts_es < limit_es) return 'es';
    // 2. If English has fewer posts, go English
    if (data.posts_en < data.posts_es && data.posts_en < limit_en) return 'en';
    // 3. If they are equal, pick Spanish first this time to please the user
    if (data.posts_es < limit_es) return 'es';
    if (data.posts_en < limit_en) return 'en';

    return null; // All quotas full
}
