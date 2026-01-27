import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function testGroq() {
    console.log('--- Testing Groq API Connection ---');
    console.log('Using API Key ending in:', process.env.GROQ_API_KEY.slice(-4));

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: 'Say "Groq is working!"' }],
            model: 'llama-3.3-70b-versatile',
        });

        console.log('✅ Success! Groq response:', completion.choices[0].message.content);
    } catch (error) {
        console.error('❌ Groq API Error:', error.message);
    }
}

testGroq();
