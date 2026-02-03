import { translate } from '@vitalets/google-translate-api';
import fs from 'fs/promises';
import path from 'path';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CACHE_FILE = path.resolve(process.cwd(), 'data/translation_cache.json');

async function loadCache() {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function saveCache(cache) {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export async function translateArticle(article, targetLang = 'es') {
    if (article.originalLanguage === targetLang) return article;

    const cache = await loadCache();
    const textToTranslate = `${article.title}|||${article.description}|||${article.category}|||${article.shortDescription || ''}`;

    if (cache[textToTranslate]) {
        console.log('[Translator] Using cached translation');
        const [t, d, c, sd] = cache[textToTranslate].split('|||');
        return { ...article, title: t, description: d, category: c, shortDescription: sd, language: targetLang };
    }

    try {
        console.log(`[Translator] Translating to ${targetLang}...`);

        const { text: translatedTitle } = await translate(article.title, { to: targetLang });
        const { text: translatedDesc } = await translate(article.description, { to: targetLang });
        const { text: translatedCat } = await translate(article.category, { to: targetLang });

        let translatedShortDesc = '';
        if (article.shortDescription) {
            const { text } = await translate(article.shortDescription, { to: targetLang });
            translatedShortDesc = text;
        }

        const result = {
            ...article,
            title: translatedTitle,
            description: translatedDesc,
            category: translatedCat.toUpperCase(),
            shortDescription: translatedShortDesc,
            language: targetLang
        };

        cache[textToTranslate] = `${translatedTitle}|||${translatedDesc}|||${translatedCat}|||${translatedShortDesc}`;
        await saveCache(cache);

        return result;
    } catch (error) {
        console.error('[Translator] Google Translate failed, falling back to Groq AI:', error.message);

        try {
            const models = [
                'llama-3.3-70b-versatile',
                'llama-3.1-70b-versatile',
                'llama-3.1-8b-instant',
                'mixtral-8x7b-32768'
            ];

            for (const model of models) {
                try {
                    console.log(`[Translator] Attempting AI translation with model: ${model}`);

                    const prompt = `
                    Translate and REWRITE the following news article parts to Spanish. 
                    Tone: HIGHLY DRAMATIC, EXAGGERATED, SENSATIONALIST, and VIRAL. 
                    
                    RULES FOR SPANISH:
                    1. TITLE: MUST be BETWEEN 8 to 10 words. 
                    2. SHORT_DESC: MUST be BETWEEN 12 to 16 words. Use 1 or 2 emojis.
                    3. CATEGORY: One or two AGGRESSIVE words in Spanish.
                    
                    Tone: ABSOLUTELY EXAGGERATED, SENSATIONALIST, MOVIE-TRAILER STYLE. Use some emojis in the long description.
                    
                    Keep it factual but make it sound like a movie trailer.
                    
                    TITLE: ${article.title}
                    SHORT_DESC: ${article.shortDescription}
                    LONG_DESC: ${article.description}
                    CATEGORY: ${article.category}
                    
                    Format as JSON: {"title": "...", "shortDescription": "...", "longDescription": "...", "category": "..."}
                `;

                    const completion = await groq.chat.completions.create({
                        messages: [{ role: 'user', content: prompt }],
                        model: model,
                        response_format: { type: 'json_object' }
                    });

                    const translated = JSON.parse(completion.choices[0].message.content);
                    console.log(`[Translator] Success with model: ${model}`);

                    return {
                        ...article,
                        title: translated.title || article.title,
                        shortDescription: translated.shortDescription || article.shortDescription,
                        description: translated.longDescription || article.description,
                        category: (translated.category || article.category || 'NOTICIAS').toUpperCase(),
                        language: targetLang,
                        isTranslatedByAI: true
                    };
                } catch (groqError) {
                    console.error(`[Translator] Model ${model} failed:`, groqError.message);
                    // Continue to next model
                }
            }
        } catch (e) {
            console.error('[Translator] Critical error in Groq fallback:', e.message);
        }

        console.error('[Translator] All translation methods failed. Returning original.');
        return article;
    }
}
