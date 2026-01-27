# 📰 News Scraper Pro (Bilingual & IA)

Sistema profesional de scraping de noticias con reescritura de IA (Groq), traducción automática y prevención de duplicados.

## 🚀 Características
- **Bilingüe**: Publica en Inglés y Español (Cuotas diarias configurables).
- **AI Rewriting**: Usa Groq (Llama-3.3) para crear títulos virales y descripciones originales (No copy-paste).
- **Inteligente**: Prioriza categorías como Immigration, ICE, y Trump.
- **Optimizado**: Reduce costos en Make.com enviando datos pre-procesados.
- **Automatizado**: Configurado para ejecutarse vía GitHub Actions.

## 🛠️ Instalación

1. Clona el repositorio.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno:
   ```bash
   cp .env.example .env
   # Edita .env con tu GROQ_API_KEY y WEBHOOK_URL
   ```

## ⚙️ Configuración
Edita `.env` para cambiar:
- `INTERVAL_MINUTES`: Cada cuántos minutos se ejecuta.
- `DAILY_POSTS_EN/ES`: Cuántos posts quieres al día por idioma.
- `CLICKBAIT_LEVEL`: `low`, `medium`, o `high`.

## 🤖 Automatización
El sistema ya incluye un workflow de GitHub Actions en `.github/workflows/scraper.yml`. 
Solo necesitas agregar los secretos `GROQ_API_KEY` y `WEBHOOK_URL` en los Settings de tu repo en GitHub.

## 🔗 Integración con Make.com
Consulta [MAKE_INTEGRATION.md](./MAKE_INTEGRATION.md) para configurar tu blueprint de forma eficiente.
