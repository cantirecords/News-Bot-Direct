import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function rewriteArticle(article, clickbaitLevel = 'medium') {
    if (process.env.AI_REWRITE_ENABLED !== 'true') return article;

    const prompt = `
    You are a master social media news editor specializing in VIRAL, HIGH-IMPACT, and DRAMATIC headlines for U.S. Breaking News.
    Your goal is to rewrite the news article to be ABSOLUTELY CAPTIVATING and SENSATIONAL, but strictly based on REAL, VERIFIED facts.
    
    LEVEL: ${clickbaitLevel}
    CURRENT_CATEGORY: ${article.category || 'NEWS'}
    
    RULES:
    1. TITLE: MAXIMUM 11 words. High-impact and bold.
    2. SHORT_DESCRIPTION (Image Overlay): EXACTLY around 15 words. Dramatic and punchy with 1-2 emojis.
    3. CATEGORY: If the news story is tied to a specific U.S. State (Texas, Florida, New York, etc.), use that state as the CATEGORY. Otherwise, use a high-impact news word (e.g., ICE, TRUMP, IMMIGRATION, BREAKING).
    4. LONG_DESCRIPTION (Facebook Caption): EXACTLY two informative paragraphs. Must be detailed and professional yet engaging. Do NOT use any emojis in this long description.
    5. Maintain all core facts. No fake details.
    6. English output only.
    
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
