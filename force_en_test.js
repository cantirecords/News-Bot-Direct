import dotenv from 'dotenv';
import { fetchNews } from './src/scraper.js';
import { rewriteArticle } from './src/aiRewriter.js';
import { sendToWebhook } from './src/webhook.js';
import { selectBestArticle } from './src/selector.js';
import { markAsSeen } from './src/deduplicator.js';

dotenv.config();

async function forceEnglishTest() {
    console.log('--- FORCED ENGLISH SIGNAL TEST ---');
    const targetLang = 'en';

    // 2. Fetch articles
    const articles = await fetchNews();

    // 3. Selection (Using the smart selector)
    const best = await selectBestArticle(articles, targetLang);

    if (!best) {
        console.log('[Main] No new articles found in the last 12 hours.');
        return;
    }
    console.log(`[Main] Selected: "${best.title}" from ${best.source}`);

    // 4. AI Rewrite
    console.log('[Main] Rewriting article with AI...');
    const rewritten = await rewriteArticle(best, process.env.CLICKBAIT_LEVEL);

    let finalArticle = rewritten;
    finalArticle.language = 'en';

    // 6. Pre-process for Cloudinary
    const clsafe = (text) => {
        if (!text) return '';
        return text.replace(/%/g, '%25').replace(/,/g, '%2C').replace(/\./g, '%2E').replace(/&/g, '%26');
    };

    finalArticle.cloudinaryTitle = clsafe(finalArticle.title);
    finalArticle.cloudinaryShortDesc = clsafe(finalArticle.shortDescription);
    finalArticle.cloudinaryCategory = clsafe(finalArticle.category);
    finalArticle.cloudinarySource = clsafe(finalArticle.source);

    // 7. Image to Base64
    try {
        console.log('[Main] Downloading image for Base64 conversion...');
        const axios = (await import('axios')).default;
        const imageResponse = await axios.get(finalArticle.imageUrl, {
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        finalArticle.rawImageUrl = finalArticle.imageUrl;
        finalArticle.b64ImageUrl = Buffer.from(imageResponse.data).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        console.log('[Main] Image converted successfully.');
    } catch (imgError) {
        console.error('[Main] Failed to download image:', imgError.message);
        finalArticle.rawImageUrl = finalArticle.imageUrl;
        finalArticle.b64ImageUrl = '';
    }

    // 8. Send to Make.com
    console.log('[Webhook] Sending forced English article to Make.com...');
    const success = await sendToWebhook(finalArticle);

    if (success) {
        console.log('[Main] Success! Forced English signal sent.');
        await markAsSeen(best);
    } else {
        console.log('[Main] Failed to send.');
    }
}

forceEnglishTest();
