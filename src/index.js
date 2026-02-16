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
import { GENERAL_TOPICS } from './categoryDetector.js';

dotenv.config();

const LOCK_FILE = 'data/scraper.lock';

async function main() {
    // 1. Double-Instance Protection
    const isCI = !!process.env.GITHUB_ACTIONS;
    if (!isCI) {
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
    }

    try {
        console.log('--- News Scraper Pro Started ---', new Date().toLocaleString());
        if (isCI) console.log('[Main] Running in CI environment (GitHub Actions)');

        const targetLang = 'en'; // Forced EN for now
        console.log(`[Main] Target language: ${targetLang.toUpperCase()}`);

        const articles = await fetchNews();
        if (!articles || articles.length === 0) {
            console.log('[Main] No articles fetched from sources.');
            return;
        }
        console.log(`[Main] Fetched ${articles.length} articles total.`);

        const best = await selectBestArticle(articles, targetLang);
        if (!best) {
            console.log('[Main] No suitable new articles found.');
            return;
        }
        console.log(`[Main] Selected candidate: "${best.title}" from ${best.source}`);

        let rewritten;
        try {
            rewritten = await rewriteArticle(best, process.env.CLICKBAIT_LEVEL);
        } catch (err) {
            console.error('[Main] AI Rewriter error:', err.message);
            rewritten = best;
        }

        let finalArticle = { ...rewritten };
        finalArticle.language = 'en';

        // Ensure critical fields exist
        if (!finalArticle.title) finalArticle.title = best.title || 'Breaking News';
        if (!finalArticle.category) finalArticle.category = 'NEWS';
        if (!finalArticle.description) finalArticle.description = best.description || '';

        if (finalArticle.category === 'ÚLTIMA HORA') finalArticle.category = 'BREAKING NEWS';

        // 5. Dynamic Title Prefix
        const ageMs = new Date() - new Date(best.pubDate);
        let timeLabel = '';
        if (best.isEmergency) timeLabel = 'EMERGENCY ALERT';
        else if (best.isTrending) timeLabel = 'CONFIRMED';
        else if (ageMs < 1200000) timeLabel = 'DEVELOPING';
        else if (ageMs < 3600000) timeLabel = 'JUST IN';
        else timeLabel = 'STORY UPDATE';

        const isSpecialLocation = !GENERAL_TOPICS.includes(finalArticle.category.toUpperCase());

        // Anti-Repetition & Cleaning Title Logic (Aggressive Sanitization)
        let cleanTitle = (finalArticle.title || '')
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Multi-range emoji strip
            .replace(/^[ |📍:🚨🔥-]+/, '') // Remove leading symbols including common ones AI likes
            .replace(/^[^|]+\|/, '') // Remove "CATEGORY |" prefixes if AI added any
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

        const catUpper = (finalArticle.category || '').toUpperCase();
        if (cleanTitle.toUpperCase().startsWith(catUpper)) {
            cleanTitle = cleanTitle.slice(catUpper.length).replace(/^[ |📍:-]+/, '').trim();
        }

        const badgeIcon = best.isEmergency ? '🔔' : best.isTrending ? '🔥' : '🚨';
        const locationPart = isSpecialLocation ? `📍 ${finalArticle.category}` : finalArticle.category;

        finalArticle.title = `${badgeIcon} ${timeLabel} | ${locationPart} | ${cleanTitle}`;

        const clsafe = (text) => {
            if (!text) return '';
            return text
                .replace(/%/g, '%25')
                .replace(/\//g, '%2F')
                .replace(/\?/g, '%3F')
                .replace(/#/g, '%23')
                .replace(/,/g, '%2C')
                .replace(/\./g, '%2E')
                .replace(/&/g, '%26')
                .replace(/\n/g, ' ')
                .trim();
        };

        finalArticle.cloudinaryTitle = clsafe(finalArticle.title);
        finalArticle.cloudinaryShortDesc = clsafe(finalArticle.shortDescription || '');
        finalArticle.cloudinaryCategory = clsafe(finalArticle.category || '');
        finalArticle.cloudinarySource = clsafe(finalArticle.source || '');

        finalArticle.categoryColor = best.categoryColor || '#333333';
        finalArticle.isTrending = best.isTrending || false;

        let finalDescription = finalArticle.description || '';

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

        if (finalArticle.styleUsed) {
            console.log(`[Main] Style used: ${finalArticle.styleUsed}`);
        }

        // Image Handling
        if (finalArticle.imageUrl) {
            try {
                console.log('[Main] Downloading image for Base64 conversion...');
                const imageResponse = await axios.get(finalArticle.imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 5000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                finalArticle.rawImageUrl = finalArticle.imageUrl;
                finalArticle.b64ImageUrl = Buffer.from(imageResponse.data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
                console.log('[Main] Image converted successfully.');
            } catch (imgError) {
                console.warn('[Main] Image conversion failed (skipping b64):', imgError.message);
                finalArticle.rawImageUrl = finalArticle.imageUrl;
                finalArticle.b64ImageUrl = '';
            }
        } else {
            console.warn('[Main] No image URL available for this article.');
            finalArticle.b64ImageUrl = '';
        }

        const success = await sendToWebhook(finalArticle);

        if (success) {
            console.log('[Main] Success! Article sent to Make.com');
            await markAsSeen(best);
            await saveLastSource(best.source);
        } else {
            console.error('[Main] Failed to send to webhook.');
            // Do not exit with error, just log it. The run itself is "successful" in terms of bot execution.
        }

        console.log('--- Run Completed ---');
    } catch (criticalError) {
        console.error('[CRITICAL] Unexpected error during execution:', criticalError);
        throw criticalError; // Rethrow to trigger workflow failure if desired, or skip if you want it green.
    } finally {
        if (!isCI) await fs.unlink(LOCK_FILE).catch(() => null);
    }
}

main().catch(async err => {
    console.error('[CRITICAL] Unhandled error:', err);
    await fs.unlink(LOCK_FILE).catch(() => null);
    process.exit(1);
});
