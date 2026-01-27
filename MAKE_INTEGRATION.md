# 🔗 Integración con Make.com (Expert Version)

Este sistema ahora está calibrado para tu nuevo template de alto impacto (39_y1oqj2) con espacio 16:9 en la parte inferior.

## 💎 URL de Cloudinary Revertida (Versión Solicitada)

Usa esta URL en tu módulo HTTP de Make. Está diseñada para que la imagen se vea perfecta sin cortes y el texto encaje exactamente como el New York Times.

```text
https://res.cloudinary.com/dgrhcowkx/image/fetch/w_1080,h_1350,c_fill,f_auto/l_39_y1oqj2,g_north,w_1080,h_1350/fl_layer_apply/co_rgb:c00000,l_text:times_50_bold:{{1.cloudinaryCategory}}/fl_layer_apply,g_north_west,x_100,y_100/co_rgb:ffffff,l_text:times_85_bold:{{1.cloudinaryTitle}},w_900,c_fit/fl_layer_apply,g_north_west,x_100,y_170/co_rgb:ffffff,l_text:times_42:{{1.cloudinaryShortDesc}},w_880,c_fit/fl_layer_apply,g_north_west,x_100,y_460/co_rgb:ffffff,l_text:times_28_italic:Source%20{{1.cloudinarySource}}/fl_layer_apply,g_south_east,x_80,y_640/{{1.rawImageUrl}}
```

### 📋 Desglose Técnico:
1.  **Template (39_y1oqj2)**: Se aplica como capa base para mantener el diseño negro arriba y la marca de agua.
2.  **Imagen 16:9**: Se posiciona en la parte inferior (`g_south`) con un alto de 610px para que se vea completa y nítida.
3.  **Categoría (Rojo)**: x:100, y:100.
4.  **Título (Blanco)**: x:100, y:170... ajustado dinámicamente.
5.  **Sub-descripción**: x:100, y:460.
6.  **Source (Itálico)**: x:80, y:640. Posicionado elegantemente a la derecha justo antes de la imagen.

## 📤 Payload Actualizado
El scraper enviará estos campos adicionales para evitar errores de Cloudinary:
- `cloudinaryTitle`: Título sin caracteres especiales.
- `cloudinaryShortDesc`: Resumen sin caracteres especiales (aproximadamente 20-25 palabras).
- `cloudinaryCategory`: Categoría bilingüe limpia (POLÍTICA, CRIMEN, etc).
- `cloudinarySource`: Fuente limpia.
- `rawImageUrl`: URL de la imagen original.

## 🤖 Cómo configurar el Caption de Facebook
En el módulo de Facebook, usa el campo `description`:
```text
{{1.category}} | {{1.title}}

{{1.description}}

Fuente: {{1.source}}
#TheVitalViral #Noticias
```
