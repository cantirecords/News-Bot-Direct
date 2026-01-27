import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function rewriteArticle(article, clickbaitLevel = 'medium') {
    if (process.env.AI_REWRITE_ENABLED !== 'true') return article;

    const prompt = `
    You are a master social media news editor specializing in VIRAL, HIGH-IMPACT, and DRAMATIC headlines. 
    Your goal is to rewrite the following news article to be ABSOLUTELY CAPTIVATING, EXAGGERATED (yet factual), and CLICKBAIT-Y. 
    Think "sensationalist" but legitimate journalism.
    
    LEVEL: ${clickbaitLevel}
    CATEGORY: ${article.category || 'NEWS'}
    
    RULES:
    1. TITLE: Must be BETWEEN 8 to 10 words long. NEVER exceed 10 words. High impact Explosive Clickbait style.
    2. SHORT_DESCRIPTION: Must be BETWEEN 12 to 16 words long. Use 1 or 2 impactful emojis. Pure drama.
    3. CATEGORY: One or two AGGRESSIVE words. (e.g., FRENZY, ULTIMATUM, REVENGE, HERO, SHOCK). 
    4. LONG_DESCRIPTION: 2 short paragraphs. TONE: ABSOLUTELY EXAGGERATED, SENSATIONALIST, MOVIE-TRAILER STYLE. Use 1-2 emojis.
    5. Maintain the core facts. Do not invent details.
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
