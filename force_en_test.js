import dotenv from 'dotenv';
import { fetchNews } from './src/scraper.js';
import { rewriteArticle } from './src/aiRewriter.js';
import { sendToWebhook } from './src/webhook.js';

dotenv.config();

async function forceEnglishTest() {
    console.log('--- FORCED ENGLISH SIGNAL TEST ---');
    const targetLang = 'en';

    // 2. Fetch articles from all sources
    const articles = await fetchNews();

    // Pick the most impactfull one for the test
    const best = articles[0];
    console.log(`[Main] Selected: "${best.title}" from ${best.source}`);

    // 4. AI Rewrite
    console.log('[Main] Rewriting article with AI...');
    const finalArticle = await rewriteArticle(best, process.env.CLICKBAIT_LEVEL);
    finalArticle.language = 'en';

    // 7. Send to Make.com
    console.log('[Webhook] Sending forced English article to Make.com...');
    const success = await sendToWebhook(finalArticle);

    if (success) {
        console.log('[Main] Success! Forced English signal sent.');
    } else {
        console.log('[Main] Failed to send.');
    }
}

forceEnglishTest();
