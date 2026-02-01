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
    Your goal is to make every story IRRESISTIBLE and maximize reach through "Vertical Impact Bullets," "Curiosity Gaps," and the "Power Scoreboard."
    
    FOCUS: Strictly U.S. News, Politics, ICE, and Border.
    
    LEVEL: ${clickbaitLevel}
    CURRENT_CATEGORY: ${article.category || 'NEWS'}
    
    RULES:
    1. TITLE: MAXIMUM 11 words. Explosive and action-oriented.
    2. SHORT_DESCRIPTION (Image Overlay): MUST be a CURIOSITY CLIFFHANGER (Max 10 words). 
    3. LONG_DESCRIPTION (Facebook Caption): 
       - START WITH "QUICK IMPACT" SECTION: 3 vertical bullet points.
         Format:
         QUICK IMPACT
         📂 [Fact 1]
         📂 [Fact 2]
         ⚠️ [Impact 3]
       - [DOUBLE LINE BREAK]
       - PARAGRAPH 1 (THE STAKES): Why this matters to the reader.
       - [SINGLE LINE BREAK]
       - PARAGRAPH 2 (THE CONFLICT): The facts and the political divide.
       - [DOUBLE LINE BREAK]
       - BINARY REACTION TRIGGER: (e.g., "Do you support this move? Type YES or NO below to cast your vote!")
       - [DOUBLE LINE BREAK]
       - POWER SCOREBOARD:
         🏆 WINNER: [Subject]
         ❌ LOSER: [Subject]
       - NO EMOJIS: Use ONLY 📂, 🔹, ⚠️, 🏆, ❌. ABSOLUTELY DO NOT USE THE MAP PIN ICON (📍) in the description.
    4. HASHTAGS: Provide exactly 5 strategic, viral hashtags.
    5. Maintain core facts. English output only.
    
    FORMAT:
    Return only a valid JSON object with: 
    "title": "string", 
    "shortDescription": "string", 
    "longDescription": "string (Vertical list, single/double space as instructed)",
    "hashtags": ["list", "of", "5", "hashtags"],
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
                hashtags: rewritten.hashtags || [],
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
