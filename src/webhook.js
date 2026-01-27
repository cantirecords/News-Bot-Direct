import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function sendToWebhook(article) {
    const url = process.env.WEBHOOK_URL;

    // Debug info for GitHub Actions (Doesn't leak the secret)
    if (process.env.GITHUB_ACTIONS) {
        console.log(`[Webhook] Running in GitHub Actions. URL length: ${url ? url.length : 0}`);
    }

    if (!url || url.includes('your-unique-webhook-id') || url.length < 10) {
        console.warn('[Webhook] No valid WEBHOOK_URL configured. Skipping send.');
        return false;
    }

    try {
        console.log('[Webhook] Sending article to Make.com...');
        const response = await axios.post(url, article);
        return response.status >= 200 && response.status < 300;
    } catch (error) {
        console.error('[Webhook] Error sending to Make.com:', error.message);
        return false;
    }
}
