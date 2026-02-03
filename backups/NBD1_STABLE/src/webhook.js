import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function sendToWebhook(article) {
    const url = process.env.WEBHOOK_URL;

    // Debug info for GitHub Actions (Doesn't leak the secret)
    if (process.env.GITHUB_ACTIONS) {
        if (!url) {
            console.error('[Webhook] CRITICAL: WEBHOOK_URL is missing in GitHub Secrets!');
        } else if (url.length < 10) {
            console.error(`[Webhook] CRITICAL: WEBHOOK_URL is too short (${url.length} chars). Check your Secrets.`);
        } else {
            console.log(`[Webhook] URL detected (${url.length} chars). Sending...`);
        }
    }

    if (!url || url.includes('your-unique-webhook-id') || url.length < 10) {
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
