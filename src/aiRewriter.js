import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function rewriteArticle(article, clickbaitLevel = 'medium') {
    if (process.env.AI_REWRITE_ENABLED !== 'true') return article;

    if (process.env.GITHUB_ACTIONS && !process.env.GROQ_API_KEY) {
        console.error('[AI-Rewriter] CRITICAL: GROQ_API_KEY is missing in GitHub Secrets! AI rewrite will be skipped.');
    }

    const prompt = `
    You are a master social media news editor for a high-traffic U.S. News outlet. 
    Your goal is to maximize engagement by framing the news as a HIGH-CONFLICT, DIVISIVE, and CRITICAL event that forces people to take a side. 
    In the U.S. market, controversy and political friction drive the most viral comments.
    
    LEVEL: ${clickbaitLevel}
    CURRENT_CATEGORY: ${article.category || 'NEWS'}
    
    RULES:
    1. TITLE: MAXIMUM 11 words. Use explosive, action-oriented language.
    2. SHORT_DESCRIPTION (Image): EXACTLY around 15 words. High drama.
    3. LONG_DESCRIPTION (Facebook Caption): 
       - PARAGRAPH 1: Report the core news with a sharp, dramatic tone.
       - PARAGRAPH 2: Explicitly mention the "Firestorm" or "Divide" this creates. Contrast the two sides (e.g., "While supporters hail this as a massive victory for [Side A], critics are sounding the alarm over [Side B]").
       - FINAL QUESTION: Craft a "Double-Edged" question that triggers BOTH the Right and the Left to comment. Do not take a side, but make the question sharp enough that people feel they HAVE to answer. (e.g., "Is this a necessary move for law and order, or an unprecedented overreach of power?").
       - NO EMOJIS: Do NOT use any emojis.
    4. Maintain the core facts. Do not invent details.
    5. English output only.
    
    FORMAT:
    Return only a valid JSON object with: "title", "shortDescription", "longDescription", "category".
    
    ARTICLE TO REWRITE:
    Title: ${article.title}
    Description: ${article.description}
  `;

    const models = [
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it'
    ];

    for (const model of models) {
        try {
            console.log(`[AI-Rewriter] Attempting rewrite with model: ${model}`);
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: model,
                response_format: { type: 'json_object' }
            });

            const rewritten = JSON.parse(completion.choices[0].message.content);

            return {
                ...article,
                title: rewritten.title,
                shortDescription: rewritten.shortDescription,
                description: rewritten.longDescription,
                category: rewritten.category ? rewritten.category.toUpperCase() : article.category,
                isRewritten: true
            };
        } catch (error) {
            console.error(`[AI-Rewriter] Model ${model} failed:`, error.message);
            // Continue to next model
        }
    }

    console.warn('[AI-Rewriter] All models failed. Using original content.');
    return article;
}
