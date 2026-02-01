import dotenv from 'dotenv';
import fs from 'fs/promises';
import axios from 'axios';
import { fetchNews } from './scraper.js';
import { getNextLanguage, incrementPostCount } from './languageQuota.js';
import { selectBestArticle, saveLastSource } from './selector.js';
import { rewriteArticle } from './aiRewriter.js';
import { translateArticle } from './translator.js';
import { markAsSeen } from './deduplicator.js';
import { sendToWebhook } from './webhook.js';

dotenv.config();

const LOCK_FILE = 'data/scraper.lock';

async function main() {
    // 1. Double-Instance Protection
    try {
        const lockStat = await fs.stat(LOCK_FILE).catch(() => null);
        if (lockStat) {
            const age = Date.now() - lockStat.mtimeMs;
            if (age < 600000) { // 10 minutes
                console.warn('[Main] Bot is already running (Lock active). Exiting.');
                return;
            }
        }
        await fs.writeFile(LOCK_FILE, Buffer.from(Date.now().toString()));
    } catch (e) { }

    try {
        console.log('--- News Scraper Pro Started ---', new Date().toLocaleString());

        const targetLang = 'en'; // Forced EN for now
        console.log(`[Main] Target language for this run: ${targetLang.toUpperCase()}`);

        const articles = await fetchNews();
        console.log(`[Main] Fetched ${articles.length} articles total.`);

        const best = await selectBestArticle(articles, targetLang);
        if (!best) {
            console.log('[Main] No new articles found in the last 12 hours.');
            return;
        }
        console.log(`[Main] Selected: "${best.title}" from ${best.source}`);

        const rewritten = await rewriteArticle(best, process.env.CLICKBAIT_LEVEL);

        let finalArticle = rewritten;
        finalArticle.language = 'en';
        if (finalArticle.category === 'ÚLTIMA HORA') finalArticle.category = 'BREAKING NEWS';

        // 5. Dynamic Title Prefix
        const ageMs = new Date() - new Date(best.pubDate);
        let timeLabel = '';
        if (best.isTrending) timeLabel = 'CONFIRMED';
        else if (ageMs < 1200000) timeLabel = 'DEVELOPING';
        else if (ageMs < 3600000) timeLabel = 'JUST IN';
        else timeLabel = 'STORY UPDATE';

        const generalTopics = ['IMMIGRATION', 'ICE', 'TRUMP', 'DEPORTATION', 'BORDER', 'BREAKING NEWS', 'POLITICS', 'LEGAL', 'SHOWDOWN', 'CLASH', 'BATTLE', 'EMERGENCY', 'GENERAL', 'HOUSE', 'CONGRESS', 'ELECTION'];
        const isSpecialLocation = !generalTopics.includes(finalArticle.category.toUpperCase());

        // Anti-Repetition & Cleaning Title Logic (Strip AI Emojis/Prefixes)
        let cleanTitle = finalArticle.title
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove all emojis
            .replace(/^[ |📍:-]+/, '') // Remove leading symbols
            .replace(/^[^|]+\|/, '') // Remove "CATEGORY |" prefixes if AI added any
            .trim();

        const catUpper = finalArticle.category.toUpperCase();
        if (cleanTitle.toUpperCase().startsWith(catUpper)) {
            cleanTitle = cleanTitle.slice(catUpper.length).replace(/^[ |📍:-]+/, '').trim();
        }

        const badgeIcon = best.isTrending ? '🔥' : '🚨';
        const locationPart = isSpecialLocation ? `📍 ${finalArticle.category}` : finalArticle.category;

        finalArticle.title = `${badgeIcon} ${timeLabel} | ${locationPart} | ${cleanTitle}`;

        const clsafe = (text) => {
            if (!text) return '';
            return text.replace(/%/g, '%25').replace(/,/g, '%2C').replace(/\./g, '%2E').replace(/&/g, '%26').replace(/\n/g, ' ').trim();
        };

        finalArticle.cloudinaryTitle = clsafe(finalArticle.title);
        finalArticle.cloudinaryShortDesc = clsafe(finalArticle.shortDescription);
        finalArticle.cloudinaryCategory = clsafe(finalArticle.category);
        finalArticle.cloudinarySource = clsafe(finalArticle.source);

        finalArticle.categoryColor = best.categoryColor || '#333333';
        finalArticle.isTrending = best.isTrending || false;

        let finalDescription = finalArticle.description;

        // Add Read More Link (Perfect Spacing)
        if (!finalDescription.includes('Read more:')) {
            finalDescription += `\n\n🔗 Read more: ${finalArticle.source}`;
        }

        // Add All Hashtags (Perfect Spacing)
        if (finalArticle.hashtags && Array.isArray(finalArticle.hashtags) && !finalDescription.includes('#')) {
            const hashFormatted = finalArticle.hashtags.map(tag => tag.startsWith('#') ? tag : '#' + tag).join(' ');
            finalDescription += `\n\n${hashFormatted} #TheVitalViral #News`;
        }

        finalArticle.description = finalDescription;

        try {
            console.log('[Main] Downloading image for Base64 conversion...');
            const imageResponse = await axios.get(finalArticle.imageUrl, { responseType: 'arraybuffer', timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            finalArticle.rawImageUrl = finalArticle.imageUrl;
            finalArticle.b64ImageUrl = Buffer.from(imageResponse.data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            console.log('[Main] Image converted successfully.');
        } catch (imgError) {
            console.error('[Main] Failed image conversion:', imgError.message);
            finalArticle.rawImageUrl = finalArticle.imageUrl;
            finalArticle.b64ImageUrl = '';
        }

        const success = await sendToWebhook(finalArticle);

        if (success) {
            console.log('[Main] Success! Article sent to Make.com');
            await markAsSeen(best);
            await saveLastSource(best.source);
        } else {
            console.error('[Main] Failed to send to webhook.');
        }

        console.log('--- Run Completed ---');
    } finally {
        await fs.unlink(LOCK_FILE).catch(() => null);
    }
}

main().catch(async err => {
    console.error('[CRITICAL] Unhandled error:', err);
    await fs.unlink(LOCK_FILE).catch(() => null);
    process.exit(1);
});
