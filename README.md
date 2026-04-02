# 📱 La Casa Del Celular

Tienda online estática profesional para la venta de smartphones nuevos, sellados de fábrica, con garantía y accesorios incluidos.

## 🛒 Características

- **Catálogo dinámico** — Los productos se cargan desde `products.json`
- **Carrito persistente** — Guardado en `localStorage`, se mantiene al recargar
- **Checkout vía WhatsApp** — Envía un resumen de pedido preformateado
- **Modal de producto** — Vista detallada con especificaciones técnicas
- **Búsqueda y filtros** — Filtra por nombre, RAM, almacenamiento y rango de precio
- **100% responsive** — Adaptado a móviles, tablets y escritorio
- **Accesible** — Roles ARIA, navegación por teclado, alt en imágenes
- **Sin dependencias** — HTML, CSS y JavaScript puro (vanilla)
- **SEO básico** — Meta tags, Open Graph, Twitter Cards
- **Animaciones sutiles** — Hover, transiciones, prefers-reduced-motion
- **Preloader** — Pantalla de carga elegante mientras se carga el catálogo

## 📁 Estructura del Proyecto

```
la_casa_del_celular/
├── README.md                    ← Este archivo
├── LICENSE                      ← Licencia MIT
└── src/
    ├── html/
    │   └── index.html           ← Página principal
    ├── css/
    │   ├── styles.css           ← Estilos principales (layout, header, hero, footer)
    │   └── components.css       ← Estilos de componentes (tarjetas, modal, carrito)
    ├── js/
    │   ├── app.js               ← Lógica principal (carga, filtros, eventos)
    │   ├── components.js        ← Componentes UI (tarjetas, modal, carrito)
    │   └── utils.js             ← Funciones auxiliares (formato, localStorage, WhatsApp)
    ├── data/
    │   └── products.json        ← Datos de productos (editable)
    └── assets/
        └── images/
            ├── .gitkeep
            ├── placeholder.jpg  ← Imagen de respuesto (cuando falta la real)
            ├── itel_a90.jpg
            ├── samsung_f07.jpg
            ├── redmi_a5.jpg
            ├── samsung_a07.jpg
            ├── samsung_a06.jpg
            ├── redmi_15c.jpg
            ├── samsung_a16.jpg
            ├── samsung_a17.jpg
            └── redmi_note14.jpg
```

## 🚀 Cómo Usar

### 1. Abrir localmente

Simplemente abre el archivo `src/html/index.html` en tu navegador:

- **Windows:** Haz doble clic en `index.html`
- **macOS:** Haz doble clic o usa `open src/html/index.html` en la terminal
- **Linux:** Usa `xdg-open src/html/index.html` o tu navegador preferido

> ⚠️ **Nota:** Para que funcione correctamente la carga de `products.json` y las imágenes, necesitas un servidor local (no abre directamente el archivo en el navegador). Puedes usar:

```bash
# Con Python 3
cd src/html && python3 -m http.server 8080

# Con Node.js (npx)
npx serve src/html

# Con VS Code: instala la extensión "Live Server" y haz clic derecho → "Open with Live Server"
```

Luego abre `http://localhost:8080` en tu navegador.

### 2. Colocar imágenes

Coloca las imágenes de los productos en la carpeta `src/assets/images/`. Los nombres deben coincidir exactamente con los que están en `products.json`:

| Archivo | Producto |
|---------|----------|
| `itel_a90.jpg` | Tecno iTel A90 |
| `samsung_f07.jpg` | Samsung Galaxy F07 |
| `redmi_a5.jpg` | Xiaomi Redmi A5 |
| `samsung_a07.jpg` | Samsung Galaxy A07 |
| `samsung_a06.jpg` | Samsung Galaxy A06 |
| `redmi_15c.jpg` | Xiaomi Redmi 15C |
| `samsung_a16.jpg` | Samsung Galaxy A16 |
| `samsung_a17.jpg` | Samsung Galaxy A17 |
| `redmi_note14.jpg` | Xiaomi Redmi Note 14 |

Si una imagen falta, se mostrará automáticamente el `placeholder.jpg`.

### 3. Cambiar número de WhatsApp

Abre el archivo `src/js/utils.js` y modifica la variable `CONFIG.whatsappNumber`:

```javascript
const CONFIG = {
  // Número de WhatsApp (formato internacional sin + ni espacios)
  whatsappNumber: '53535267874',  // ← Cambia aquí
  // ...
};
```

### 4. Editar productos

Abre `src/data/products.json` y edita los campos que necesites. Puedes agregar o eliminar productos siguiendo la misma estructura.

### 5. Desplegar en hosting estático

El proyecto es 100% estático y se puede deployar en:

- **GitHub Pages** — Sube la carpeta completa y habilita GitHub Pages
- **Netlify** — Arrastra la carpeta `src/html` al dashboard de Netlify
- **Vercel** — `vercel --prod` desde la raíz del proyecto
- **Firebase Hosting** — `firebase deploy`

## 📋 Checklist de Pruebas

- [ ] El catálogo se carga correctamente al abrir la página
- [ ] Las imágenes de producto se muestran (o placeholder si faltan)
- [ ] El modal se abre al hacer clic en "Ver" y muestra toda la información
- [ ] El modal se cierra con el botón ✕ y con la tecla Escape
- [ ] Al agregar un producto al carrito, se muestra notificación toast
- [ ] El carrito persiste al recargar la página
- [ ] Se pueden aumentar/disminuir cantidades en el carrito
- [ ] Se pueden eliminar ítems del carrito
- [ ] El botón "Contactar y Comprar" abre WhatsApp con el resumen correcto
- [ ] Responsive en 320px (móvil), 768px (tablet) y 1200px (escritorio)
- [ ] Navegación por teclado (Tab) funciona correctamente
- [ ] Búsqueda por nombre funciona
- [ ] Filtros de precio funcionan
- [ ] Probado en Chrome, Firefox y Edge

## 🔧 Personalización

### Cambiar moneda

En `src/js/utils.js`:
```javascript
currencySymbol: '$',  // Cambiar a '€', 'CUP', etc.
```

### Cambiar colores

En `src/css/styles.css`, edita las variables CSS en `:root`:
```css
:root {
  --color-primary: #0d1b2a;     /* Color principal */
  --color-accent: #e63946;      /* Color de acento */
  --color-gold: #f4a261;        /* Color dorado */
}
```

## 📄 Licencia

MIT License — Ver archivo [LICENSE](./LICENSE) para más detalles.

---

**La Casa Del Celular** — Santa Clara, Villa Clara, Cuba
