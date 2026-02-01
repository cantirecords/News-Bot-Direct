import dotenv from 'dotenv';
import axios from 'axios';
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

    /* Quota Check Disabled: Posting every hour
    const targetLang = await getNextLanguage();
    if (!targetLang) {
        console.log('[Main] Daily quotas are full. Sleeping...');
        return;
    }
    */
    const targetLang = 'en'; // Forced EN for now
    console.log(`[Main] Target language for this run: ${targetLang.toUpperCase()}`);

    // 2. Fetch articles from all sources
    const articles = await fetchNews();
    console.log(`[Main] Fetched ${articles.length} articles total.`);

    // 3. Select the best one
    const best = await selectBestArticle(articles, targetLang);
    if (!best) {
        console.log('[Main] No new articles found in the last 3 hours that haven\'t been posted yet.');
        console.log('[Main] Tip: If you want to force a post, you can delete data/seen_articles.json, but the bot is working correctly by avoiding duplicates.');
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

    // 5. Dynamic Title Prefix (Premium Energetic Layout)
    const ageMs = new Date() - new Date(best.pubDate);
    let timeLabel = '';
    if (best.isTrending) timeLabel = 'CONFIRMED';
    else if (ageMs < 1200000) timeLabel = 'DEVELOPING';
    else if (ageMs < 3600000) timeLabel = 'JUST IN';
    else timeLabel = 'STORY UPDATE';

    const generalTopics = ['IMMIGRATION', 'ICE', 'TRUMP', 'DEPORTATION', 'BORDER', 'BREAKING NEWS', 'POLITICS', 'LEGAL', 'SHOWDOWN', 'CLASH', 'BATTLE', 'EMERGENCY', 'GENERAL'];
    const isSpecialLocation = !generalTopics.includes(finalArticle.category.toUpperCase());

    const badgeIcon = best.isTrending ? '🔥' : '🚨';
    const locationPart = isSpecialLocation ? `📍 ${finalArticle.category}` : finalArticle.category;

    // Title: 🔥 CONFIRMED | 📍 TEXAS | Title Text OR 🚨 JUST IN | IMMIGRATION | Title Text
    finalArticle.title = `${badgeIcon} ${timeLabel} | ${locationPart} | ${finalArticle.title}`;

    // 6. Pre-process for Cloudinary
    const clsafe = (text) => {
        if (!text) return '';
        return text
            .replace(/%/g, '%25')
            .replace(/\//g, '%2F')
            .replace(/\?/g, '%3F')
            .replace(/#/g, '%23')
            .replace(/&/g, '%26')
            .replace(/\+/g, '%2B')
            .replace(/,/g, '%2C')
            .replace(/:/g, '%3A')
            .replace(/;/g, '%3B')
            .replace(/=/g, '%3D')
            .replace(/"/g, "'")
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .trim();
    };

    finalArticle.cloudinaryTitle = clsafe(finalArticle.title);
    finalArticle.cloudinaryShortDesc = clsafe(finalArticle.shortDescription);
    finalArticle.cloudinaryCategory = clsafe(finalArticle.category);
    finalArticle.cloudinarySource = clsafe(finalArticle.source);

    // Add dynamic colors and trend flags
    finalArticle.categoryColor = best.categoryColor || '#333333';
    finalArticle.isTrending = best.isTrending || false;

    // 7. Append Source Link & Hashtags to Description (The Final Polish)
    let finalDescription = finalArticle.description;

    // Add Read More Link
    finalDescription += `\n\n🔗 Read more: ${finalArticle.source}`;

    // Add All Hashtags at the Absolute Bottom
    if (finalArticle.hashtags && Array.isArray(finalArticle.hashtags)) {
        const hashFormatted = finalArticle.hashtags.map(tag => tag.startsWith('#') ? tag : '#' + tag).join(' ');
        finalDescription += `\n\n${hashFormatted} #TheVitalViral #News`;
    }

    finalArticle.description = finalDescription;

    // 9. Download image and convert to Base64 (True Image Data)
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

        console.log('[Main] Image converted to Base64 successfully.');
    } catch (imgError) {
        console.error('[Main] Failed to download image for Base64:', imgError.message);
        // Fallback: Use the URL as is, but warn
        finalArticle.rawImageUrl = finalArticle.imageUrl;
        finalArticle.b64ImageUrl = ''; // Send empty if failed
    }

    // 7. Send to Make.com
    const success = await sendToWebhook(finalArticle);

    if (success) {
        console.log('[Main] Success! Article sent to Make.com');
        await markAsSeen(best);
        await incrementPostCount(targetLang);
        await saveLastSource(best.source);
    } else {
        console.error('[Main] Failed to send to webhook.');
        if (process.env.GITHUB_ACTIONS) {
            process.exit(1); // Fail the GitHub Action explicitly
        }
    }

    console.log('--- Run Completed ---');
}

main().catch(err => {
    console.error('[CRITICAL] Unhandled error:', err);
    process.exit(1);
});
