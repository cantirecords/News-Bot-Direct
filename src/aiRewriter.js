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
    You are a master social media news editor for a high-traffic U.S. POLITICS AND NEWS outlet. 
    Your goal is to make every story IRRESISTIBLE by highlighting the stakes while maintaining a clean, professional aesthetic.
    
    FOCUS: Strictly U.S. News, Politics, ICE, and Border. IGNORE sports, celebrity gossip, or fluff unless it is a national emergency.
    
    LEVEL: ${clickbaitLevel}
    CURRENT_CATEGORY: ${article.category || 'NEWS'}
    
    RULES:
    1. TITLE: MAXIMUM 11 words. Explosive and action-oriented.
    2. SHORT_DESCRIPTION (Image): EXACTLY around 15 words. Dramatic cliffhanger.
    3. LONG_DESCRIPTION (Facebook Caption): 
       - MUST BE A SINGLE STRING WITH PROFESSIONAL SPACING.
       - PARAGRAPH 1 (THE STAKES): Why this matters to the reader. 
       - [DOUBLE LINE BREAK]
       - PARAGRAPH 2 (THE CONFLICT): The facts and the political divide.
       - [TRIPLE LINE BREAK]
       - FINAL QUESTION: A sharp question to trigger debate.
       - NO EMOJIS: Do NOT use any emojis.
    4. Maintain core facts. English output only.
    
    FORMAT:
    Return only a valid JSON object with: 
    "title": "string", 
    "shortDescription": "string", 
    "longDescription": "PARAGRAPH 1 CONTENT\\n\\nPARAGRAPH 2 CONTENT\\n\\n\\nFINAL QUESTION CONTENT",
    "category": "string"
    
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
