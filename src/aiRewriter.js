import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Writing Styles for Variety
const WRITING_STYLES = {
  casual_emoji: {
    name: 'Casual Emoji',
    description: 'Emoji-heavy, conversational, engaging',
    prompt: `
      You are a social media expert creating VIRAL, emoji-rich content.
      
      STYLE: Casual, conversational, lots of emojis (🔥💥⚡🚨👀)
      
      RULES:
      1. TITLE: MAXIMUM 11 words. NO prefixes, NO icons. Return ONLY the headline text.
      2. SHORT_DESCRIPTION (Image Overlay): MUST be a CURIOSITY CLIFFHANGER with emojis (Max 10 words). 
      3. LONG_DESCRIPTION (Facebook Caption): 
         [IMPORTANT: Start with a NEWLINE character]
         - Start with an emoji hook (e.g., "🚨 BREAKING:")
         - 2 short, punchy paragraphs with strategic emojis (separated by 1 newline)
         - [DOUBLE NEWLINE]
         - 💥 [Shocking Fact 1]
         - 🔥 [Shocking Fact 2]
         - ⚡ [Impact 3]
         - [DOUBLE NEWLINE]
         - 🗳️ VOTE: [Controversial Question] (Type YES or NO below! 👇)
         - [DOUBLE NEWLINE]
         - 🏆 WINNER: [Subject]
         - ❌ LOSER: [Subject]
         - CRITICAL: NO hashtags, NO "Read more" links.
      4. HASHTAGS: Provide exactly 5 strategic, viral hashtags.
      5. Maintain core facts. English output only.
    `
  },
  professional: {
    name: 'Professional',
    description: 'Formal, authoritative, minimal emojis',
    prompt: `
      You are a professional news editor for a serious political outlet.
      
      STYLE: Professional, authoritative, minimal emojis (only 1-2 per post)
      
      RULES:
      1. TITLE: MAXIMUM 11 words. NO prefixes, NO icons. Return ONLY the headline text.
      2. SHORT_DESCRIPTION (Image Overlay): Professional summary (Max 10 words). 
      3. LONG_DESCRIPTION (Facebook Caption): 
         [IMPORTANT: Start with a NEWLINE character]
         - 2 well-structured, formal paragraphs (separated by 1 newline). Use ONE emoji max.
         - [DOUBLE NEWLINE]
         - • [Key Point 1]
         - • [Key Point 2]
         - • [Key Point 3]
         - [DOUBLE NEWLINE]
         - 📊 YOUR TAKE: [Thoughtful Question]
         - [DOUBLE NEWLINE]
         - ✓ IMPACT: [Who benefits]
         - ✗ CONCERN: [Who is affected negatively]
         - CRITICAL: NO hashtags, NO "Read more" links.
      4. HASHTAGS: Provide exactly 5 strategic, professional hashtags.
      5. Maintain core facts. English output only.
    `
  },
  urgent_breaking: {
    name: 'Urgent Breaking',
    description: 'High urgency, action-focused, dramatic',
    prompt: `
      You are creating URGENT BREAKING NEWS content.
      
      STYLE: High urgency, dramatic, action-focused
      
      RULES:
      1. TITLE: MAXIMUM 11 words. NO prefixes, NO icons. Return ONLY the headline text.
      2. SHORT_DESCRIPTION (Image Overlay): URGENT cliffhanger (Max 10 words). 
      3. LONG_DESCRIPTION (Facebook Caption): 
         [IMPORTANT: Start with a NEWLINE character]
         - Start with "⚠️ DEVELOPING:" or "🚨 JUST IN:"
         - 2 urgent, fast-paced paragraphs (separated by 1 newline)
         - [DOUBLE NEWLINE]
         - ⚡ WHAT HAPPENED: [Brief]
         - 🔥 WHY IT MATTERS: [Impact]
         - 👀 WHAT'S NEXT: [Consequence]
         - [DOUBLE NEWLINE]
         - ❓ QUESTION: [Urgent question for engagement]
         - [DOUBLE NEWLINE]
         - ✅ WHO WINS: [Subject]
         - ⛔ WHO LOSES: [Subject]
         - CRITICAL: NO hashtags, NO "Read more" links.
      4. HASHTAGS: Provide exactly 5 urgent, trending hashtags.
      5. Maintain core facts. English output only.
    `
  },
  interactive_question: {
    name: 'Interactive Question',
    description: 'Question-based, engagement-focused',
    prompt: `
      You are creating highly INTERACTIVE, question-driven content.
      
      STYLE: Question-based, curiosity-driven, engagement-focused
      
      RULES:
      1. TITLE: MAXIMUM 11 words. Frame as a question if possible. NO prefixes, NO icons.
      2. SHORT_DESCRIPTION (Image Overlay): Intriguing question (Max 10 words). 
      3. LONG_DESCRIPTION (Facebook Caption): 
         [IMPORTANT: Start with a NEWLINE character]
         - Start with a provocative question
         - 2 narrative paragraphs that build curiosity (separated by 1 newline)
         - [DOUBLE NEWLINE]
         - 🤔 THE QUESTION: [Main question]
         - 💭 WHAT IF: [Hypothetical scenario]
         - 🎯 THE STAKES: [What's at risk]
         - [DOUBLE NEWLINE]
         - 🗣️ YOUR OPINION: [Engagement question] (Comment below!)
         - [DOUBLE NEWLINE]
         - 👍 AGREE: [Position A]
         - 👎 DISAGREE: [Position B]
         - CRITICAL: NO hashtags, NO "Read more" links.
      4. HASHTAGS: Provide exactly 5 engaging hashtags.
      5. Maintain core facts. English output only.
    `
  },
  storytelling: {
    name: 'Storytelling',
    description: 'Narrative-driven, emotional, human-focused',
    prompt: `
      You are a master storyteller creating emotionally resonant news content.
      
      STYLE: Narrative-driven, emotional, human-focused
      
      RULES:
      1. TITLE: MAXIMUM 11 words. Make it compelling and human. NO prefixes, NO icons.
      2. SHORT_DESCRIPTION (Image Overlay): Emotional hook (Max 10 words). 
      3. LONG_DESCRIPTION (Facebook Caption): 
         [IMPORTANT: Start with a NEWLINE character]
         - Tell it like a story with emotional resonance
         - 2 narrative paragraphs focusing on human impact (separated by 1 newline)
         - [DOUBLE NEWLINE]
         - 💔 THE REALITY: [Human impact]
         - 💪 THE RESPONSE: [What's being done]
         - 🌟 THE HOPE: [Positive angle or future]
         - [DOUBLE NEWLINE]
         - 💬 SHARE: [Personal question] (Tell us your story)
         - [DOUBLE NEWLINE]
         - 🙏 SUPPORT: [Who to support]
         - ⚠️ CONCERN: [What to watch]
         - CRITICAL: NO hashtags, NO "Read more" links.
      4. HASHTAGS: Provide exactly 5 emotional, human-focused hashtags.
      5. Maintain core facts. English output only.
    `
  }
};

// Select a style based on rotation (deterministic but varied)
function selectStyle(articleTitle) {
  const styles = Object.keys(WRITING_STYLES);
  // Use article title hash to deterministically select a style (ensures variety)
  const hash = articleTitle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const styleKey = styles[hash % styles.length];
  return { key: styleKey, ...WRITING_STYLES[styleKey] };
}

export async function rewriteArticle(article, clickbaitLevel = 'medium') {
  if (process.env.AI_REWRITE_ENABLED !== 'true') return article;

  if (process.env.GITHUB_ACTIONS && !process.env.GROQ_API_KEY) {
    console.error('[AI-Rewriter] CRITICAL: GROQ_API_KEY is missing in GitHub Secrets! AI rewrite will be skipped.');
  }

  // Select a writing style for this article
  const selectedStyle = selectStyle(article.title);
  console.log(`[AI-Rewriter] Using style: ${selectedStyle.name} (${selectedStyle.description})`);

  const prompt = `
    ${selectedStyle.prompt}
    
    LEVEL: ${clickbaitLevel}
    CURRENT_CATEGORY: ${article.category || 'NEWS'}
    
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
        isRewritten: true,
        styleUsed: selectedStyle.name // Track which style was used
      };
    } catch (error) {
      console.error(`[AI-Rewriter] Model ${model} failed:`, error.message);
      // Continue to next model
    }
  }

  console.warn('[AI-Rewriter] All models failed. Using original content.');
  return article;
}
