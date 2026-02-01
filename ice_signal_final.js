import dotenv from 'dotenv';
import { rewriteArticle } from './src/aiRewriter.js';
import { sendToWebhook } from './src/webhook.js';
import axios from 'axios';

dotenv.config();

async function sendIceSignalFinal() {
    console.log('--- FINAL ICE NEWS SIGNAL ATTEMPT ---');

    // Real news story from the search results
    const iceNews = {
        title: 'ICE Lodges Detainer After Brutal Rape Case in Kentucky Involving Egyptian National',
        description: 'Federal immigration agents have lodged a detainer against an Egyptian national apprehended in Louisville, Kentucky, in connection with the alleged rape of a 16-year-old girl. The move comes as scrutiny intensifies over federal immigration enforcement and public safety.',
        url: 'https://www.dhs.gov/news/2026/01/30/ice-lodges-detainer-louisville-arrest',
        pubDate: new Date().toISOString(),
        source: 'DHS News',
        sourceType: 'US',
        originalLanguage: 'en',
        // Using a high-quality guaranteed image for the test
        imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1200'
    };

    console.log(`[Main] Processing: "${iceNews.title}"`);

    // 1. AI Rewrite
    console.log('[Main] Rewriting article with AI...');
    const rewritten = await rewriteArticle(iceNews, 'high');

    let finalArticle = rewritten;
    finalArticle.language = 'en';

    // 2. Pre-process for Cloudinary
    const clsafe = (text) => {
        if (!text) return '';
        return text.replace(/%/g, '%25').replace(/,/g, '%2C').replace(/\./g, '%2E').replace(/&/g, '%26');
    };

    finalArticle.cloudinaryTitle = clsafe(finalArticle.title);
    finalArticle.cloudinaryShortDesc = clsafe(finalArticle.shortDescription);
    finalArticle.cloudinaryCategory = 'CRIME';
    finalArticle.cloudinarySource = clsafe(finalArticle.source);

    // 3. Image to Base64 (Crucial for the signal to "go through" visually)
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

    // 4. Send to Make.com
    console.log('[Webhook] Sending ICE news to Make.com...');
    const success = await sendToWebhook(finalArticle);

    if (success) {
        console.log('✅ Success! ICE signal sent to Webhook.');
    } else {
        console.log('❌ Failed to send to Webhook.');
    }
}

sendIceSignalFinal();
