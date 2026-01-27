# 🚀 Bot de Noticias - Versión Directa (Sin Overlays)

Esta es una versión simplificada del bot diseñada para publicar **directamente** en Facebook sin usar Cloudinary.

## 🛠️ Configuración en Make.com (Solo 2 Módulos)

1.  **Módulo 1: Custom Webhook**
    *   Crea un nuevo Webhook y obtén la URL.
    *   Pega esta URL en tu archivo `.env` o en los Secrets de GitHub de este nuevo repo como `WEBHOOK_URL`.

2.  **Módulo 2: Facebook Groups/Pages (Create a Photo Post)**
    *   **File URL**: Usa el campo `imageUrl` que viene del webhook.
    *   **Description**: Puedes armar un caption potente usando:
        ```text
        {{category}} | {{title}}
        
        {{description}}
        
        Fuente: {{source}}
        #Noticias #Viral
        ```

## ✨ Características de esta versión
- **Velocidad Máxima**: Al no procesar imágenes, el flujo es casi instantáneo.
- **Imagen Original**: Se sube la foto de la noticia tal cual aparece en el medio original (nítida y 16:9).
- **IA Dramática**: Mantiene el sistema de reescritura exagerada y viral de Grok.

---

### 🕒 ¿Cómo cambiar los minutos?
Edita `.github/workflows/scraper.yml` en la línea:
`cron: '*/30 * * * *'` (actualmente cada 30 minutos).
