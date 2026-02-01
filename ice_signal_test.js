import dotenv from 'dotenv';
import { rewriteArticle } from './src/aiRewriter.js';
import { sendToWebhook } from './src/webhook.js';
import { translateArticle } from './src/translator.js';
import axios from 'axios';

dotenv.config();

async function sendIceSignal() {
    console.log('--- FORCED ICE NEWS SIGNAL TEST ---');

    // Recent news found via search
    const iceNews = {
        title: '"NATIONAL SHUTDOWN": Massive Protests Against ICE Explode Across U.S. Cities',
        description: 'Thousands of demonstrators have taken to the streets for "National Shutdown" protests, demanding the removal of ICE from major cities following recent clashes and controversial federal actions. Protests in Los Angeles and Minneapolis turned heated as activists called for "ICE Out of Everywhere."',
        url: 'https://www.cbsnews.com/news/ice-protests-national-shutdown-demonstrations/',
        pubDate: new Date().toISOString(),
        source: 'CBS News',
        sourceType: 'US',
        originalLanguage: 'en',
        imageUrl: 'https://images.unsplash.com/photo-1571597438128-4bc2ec6561bc?auto=format&fit=crop&q=80&w=1200'
    };

    console.log(`[Main] Processing: "${iceNews.title}"`);

    // 1. AI Rewrite (Viral style)
    console.log('[Main] Rewriting article with AI...');
    const rewritten = await rewriteArticle(iceNews, 'high');

    // 2. We can offer English or Spanish. User asked "send one", implying English or both. I'll send English as requested before.
    let finalArticle = rewritten;
    finalArticle.language = 'en';

    // 3. Pre-process for Cloudinary
    const clsafe = (text) => {
        if (!text) return '';
        return text.replace(/%/g, '%25').replace(/,/g, '%2C').replace(/\./g, '%2E').replace(/&/g, '%26');
    };

    finalArticle.cloudinaryTitle = clsafe(finalArticle.title);
    finalArticle.cloudinaryShortDesc = clsafe(finalArticle.shortDescription);
    finalArticle.cloudinaryCategory = 'BREAKING';
    finalArticle.cloudinarySource = clsafe(finalArticle.source);

    // 4. Image to Base64
    try {
        console.log('[Main] Downloading image for Base64 conversion...');
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

    // 5. Send to Make.com
    console.log('[Webhook] Sending ICE news to Make.com...');
    const success = await sendToWebhook(finalArticle);

    if (success) {
        console.log('✅ Success! ICE signal sent.');
    } else {
        console.log('❌ Failed to send.');
    }
}

sendIceSignal();
