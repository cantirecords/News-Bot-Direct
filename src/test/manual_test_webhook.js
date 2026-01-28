import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testWebhook() {
    const url = process.env.WEBHOOK_URL;

    if (!url) {
        console.error('❌ WEBHOOK_URL no está configurado en .env');
        return;
    }

    console.log('🚀 Enviando señal de prueba REALISTA (Con imagen binaria) a Make.com...');
    console.log(`📡 URL: ${url.substring(0, 40)}...`);

    const clsafe = (text) => {
        if (!text) return '';
        return text.replace(/%/g, '%25').replace(/,/g, '%2C').replace(/\./g, '%2E').replace(/&/g, '%26');
    };

    // 1. Descargar una imagen real (Foto de noticias/tecnología para prueba realista)
    const testImageUrl = "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // Foto de robot futurista
    let b64Image = "";

    try {
        console.log("📥 Descargando imagen de prueba...");
        const imgRes = await axios.get(testImageUrl, { responseType: 'arraybuffer' });
        b64Image = Buffer.from(imgRes.data, 'binary').toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        console.log(`✅ Imagen descargada y convertida (${b64Image.length} chars)`);
    } catch (e) {
        console.error("❌ Falló la descarga de imagen de prueba:", e.message);
        return;
    }

    const payload = {
        title: "TEST: Image Upload Fix",
        shortDescription: "Testing real base64 image upload functionality.",
        description: "This is a test to verify that the Node.js bot is now correctly downloading and encoding the image before sending it to Make.",
        url: "https://example.com/test",
        pubDate: new Date().toISOString(),
        source: "DebugScript",
        sourceType: "Test",
        language: "en",
        imageUrl: testImageUrl,
        isRewritten: true,

        cloudinaryTitle: clsafe("TEST: Image Upload Fix"),
        cloudinaryShortDesc: clsafe("Testing real base64 image upload functionality."),
        cloudinaryCategory: "TEST",
        cloudinarySource: "DebugScript",

        rawImageUrl: testImageUrl,
        b64ImageUrl: b64Image // ¡Esta vez es la imagen real!
    };

    try {
        const response = await axios.post(url, payload);
        console.log('✅ ¡Señal enviada exitosamente!');
        console.log(`📊 Status: ${response.status}`);
    } catch (error) {
        if (error.response) {
            console.error(`❌ Error HTTP Make: ${error.response.status}`);
            console.error('📦 Respuesta:', error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testWebhook();
