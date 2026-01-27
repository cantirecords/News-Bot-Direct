import dotenv from 'dotenv';
import { fetchNews } from './scraper.js';
import { getNextLanguage, incrementPostCount } from './languageQuota.js';
import { selectBestArticle, saveLastSource } from './selector.js';
import { rewriteArticle } from './aiRewriter.js';
import { translateArticle } from './translator.js';
import { markAsSeen } from './deduplicator.js';
import { sendToWebhook } from './webhook.js';

dotenv.config();

async function main() {
    console.log('--- News Scraper Pro Started ---', new Date().toLocaleString());

    // 1. Check if we should post (quota check)
    const targetLang = await getNextLanguage();
    if (!targetLang) {
        console.log('[Main] Daily quotas are full. Sleeping...');
        return;
    }
    console.log(`[Main] Target language for this run: ${targetLang.toUpperCase()}`);

    // 2. Fetch articles from all sources
    const articles = await fetchNews();
    console.log(`[Main] Fetched ${articles.length} articles total.`);

    // 3. Select the best one
    const best = await selectBestArticle(articles, targetLang);
    if (!best) {
        console.log('[Main] No new articles with images found. Try again later.');
        return;
    }
    console.log(`[Main] Selected: "${best.title}" from ${best.source}`);

    // 4. AI Rewrite (Brings original tone and clickbait)
    console.log('[Main] Rewriting article with AI...');
    const rewritten = await rewriteArticle(best, process.env.CLICKBAIT_LEVEL);

    // 5. Translate if needed
    let finalArticle = rewritten;
    if (targetLang === 'es') {
        finalArticle = await translateArticle(rewritten, 'es');

        // Ensure category is in Spanish and meaningful
        if (finalArticle.category === 'BREAKING NEWS') finalArticle.category = 'ÚLTIMA HORA';
        if (finalArticle.category === 'WORLD NEWS') finalArticle.category = 'NOTICIAS MUNDIALES';
        if (finalArticle.category === 'CRIME') finalArticle.category = 'CRIMEN';
        if (finalArticle.category === 'POLITICS') finalArticle.category = 'POLÍTICA';
    } else {
        // Ensure English articles also have the language property set
        finalArticle.language = 'en';
        // Ensure category is in English
        if (finalArticle.category === 'ÚLTIMA HORA') finalArticle.category = 'BREAKING NEWS';
    }

    // 6. Pre-process for Cloudinary (Fix "Bad Request" error)
    // Cloudinary's l_text is extremely sensitive. We need to be very aggressive.
    const clsafe = (text) => {
        if (!text) return '';
        return text
            .replace(/%/g, '%25')     // Must be first!
            .replace(/,/g, '%2C')     // Comma
            .replace(/\./g, '%2E')    // Dot
            .replace(/\//g, '%2F')    // Slash
            .replace(/\?/g, '%3F')    // Question
            .replace(/!/g, '%21')     // Exclamation
            .replace(/:/g, '%3A')     // Colon
            .replace(/'/g, '%27')     // Single quote
            .replace(/"/g, '%22')     // Double quote
            .replace(/&/g, '%26');    // Ampersand
    };

    finalArticle.cloudinaryTitle = clsafe(finalArticle.title);
    finalArticle.cloudinaryShortDesc = clsafe(finalArticle.shortDescription);
    finalArticle.cloudinaryCategory = clsafe(finalArticle.category);
    finalArticle.cloudinarySource = clsafe(finalArticle.source);

    // We also need the image URL encoded for the 'fetch' part
    // Using Base64 is the only 100% reliable way to avoid Cloudinary processing errors
    finalArticle.rawImageUrl = finalArticle.imageUrl;
    finalArticle.b64ImageUrl = Buffer.from(finalArticle.imageUrl).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // 7. Send to Make.com
    const success = await sendToWebhook(finalArticle);

    if (success) {
        console.log('[Main] Success! Article sent to Make.com');
        await markAsSeen(best);
        await incrementPostCount(targetLang);
        await saveLastSource(best.source);
    } else {
        console.log('[Main] Failed to send to webhook.');
    }

    console.log('--- Run Completed ---');
}

main().catch(err => {
    console.error('[CRITICAL] Unhandled error:', err);
    process.exit(1);
});
