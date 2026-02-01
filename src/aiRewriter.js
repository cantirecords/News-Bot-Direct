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
    Your goal is to make every story feel PREMIUM and URGENT.
    
    FOCUS: Strictly U.S. News, Politics, ICE, and Border.
    
    LEVEL: ${clickbaitLevel}
    CURRENT_CATEGORY: ${article.category || 'NEWS'}
    
    RULES:
    1. TITLE: MAXIMUM 11 words. NO prefixes, NO icons. Return ONLY the headline text.
    2. SHORT_DESCRIPTION (Image Overlay): MUST be a CURIOSITY CLIFFHANGER (Max 10 words). 
    3. LONG_DESCRIPTION (Facebook Caption): 
       [IMPORTANT: Start the string with a NEWLINE character]
       - STORY SECTION: 
         Exactly 2 High-impact narrative paragraphs about the news.
         (Separated by 1 newline). NO emojis in these paragraphs.
       - [SINGLE LINE BREAK]
       - QUICK IMPACT:
         ⚡ [Fact 1]
         ⚡ [Fact 2]
         🔸 [Impact 3]
       - [SINGLE LINE BREAK]
       - VOTE SECTION:
         🗳️ VOTE: [The Question] (Type YES or NO below!)
       - [SINGLE LINE BREAK]
       - POWER SCOREBOARD:
         🏆 WINNER: [Subject]
         ❌ LOSER: [Subject]
       - CRITICAL: DO NOT include hashtags or "Read more" links in this field.
    4. HASHTAGS: Provide exactly 5 strategic, viral hashtags.
    5. Maintain core facts. English output only.
    
    FORMAT:
    Return only a valid JSON object with: 
    "title": "string", 
    "shortDescription": "string", 
    "longDescription": "string",
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
