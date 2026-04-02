/* ============================================
   LA CASA DEL CELULAR - Utilidades
   Autor: La Casa Del Celular
   Descripción: Funciones auxiliares para formato,
                almacenamiento, y helpers generales
   ============================================ */

/**
 * Configuración global de la tienda.
 * Modifica estos valores según sea necesario.
 */
const CONFIG = {
  // Número de WhatsApp (formato internacional sin + ni espacios)
  whatsappNumber: '5352678747',

  // Texto de entrega
  deliveryText: 'Santa Clara',

  // Símbolo de moneda
  currencySymbol: '$',

  // Clave para localStorage
  cartStorageKey: 'lcdc_cart',

  // Ruta relativa a las imágenes
  imagesBasePath: '../assets/images/',

  // Nombre del archivo placeholder
  placeholderImage: 'placeholder.jpg',
};

/**
 * Formatea un número como precio en USD.
 * @param {number} amount - Cantidad numérica
 * @returns {string} Precio formateado (ej: "$110")
 */
function formatPrice(amount) {
  return `${CONFIG.currencySymbol}${Number(amount).toFixed(2)}`;
}

/**
 * Obtiene la ruta completa de una imagen de producto.
 * @param {string} imgFilename - Nombre del archivo de imagen
 * @returns {string} Ruta completa
 */
function getImagePath(imgFilename) {
  return `${CONFIG.imagesBasePath}${imgFilename}`;
}

/**
 * Obtiene la ruta del placeholder.
 * @returns {string} Ruta del placeholder
 */
function getPlaceholderPath() {
  return `${CONFIG.imagesBasePath}${CONFIG.placeholderImage}`;
}

/**
 * Genera el texto alternativo descriptivo para una imagen de producto.
 * @param {object} product - Objeto del producto
 * @returns {string} Texto alt descriptivo
 */
function getImageAlt(product) {
  return `${product.name}, ${product.ram} RAM, ${product.storage} almacenamiento, precio ${formatPrice(product.price)}. Caja incluida, sellado de fábrica.`;
}

/**
 * Obtiene el carrito desde localStorage.
 * @returns {Array} Lista de ítems del carrito
 */
function getCart() {
  try {
    const data = localStorage.getItem(CONFIG.cartStorageKey);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error al leer el carrito:', error);
    return [];
  }
}

/**
 * Guarda el carrito en localStorage.
 * @param {Array} cart - Lista de ítems del carrito
 */
function saveCart(cart) {
  try {
    localStorage.setItem(CONFIG.cartStorageKey, JSON.stringify(cart));
  } catch (error) {
    console.error('Error al guardar el carrito:', error);
  }
}

/**
 * Agrega un producto al carrito. Si ya existe, incrementa la cantidad.
 * @param {object} product - Producto a agregar
 * @param {number} quantity - Cantidad a agregar
 * @returns {Array} Carrito actualizado
 */
function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existingIndex = cart.findIndex(item => item.id === product.id);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      img: product.img,
      ram: product.ram,
      storage: product.storage,
      quantity: quantity,
    });
  }

  saveCart(cart);
  return cart;
}

/**
 * Actualiza la cantidad de un ítem en el carrito.
 * @param {number} productId - ID del producto
 * @param {number} newQuantity - Nueva cantidad (0 para eliminar)
 * @returns {Array} Carrito actualizado
 */
function updateCartItemQuantity(productId, newQuantity) {
  let cart = getCart();

  if (newQuantity <= 0) {
    cart = cart.filter(item => item.id !== productId);
  } else {
    const index = cart.findIndex(item => item.id === productId);
    if (index > -1) {
      cart[index].quantity = newQuantity;
    }
  }

  saveCart(cart);
  return cart;
}

/**
 * Elimina un producto del carrito.
 * @param {number} productId - ID del producto a eliminar
 * @returns {Array} Carrito actualizado
 */
function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
  return cart;
}

/**
 * Obtiene el total de ítems en el carrito.
 * @returns {number} Total de ítems
 */
function getCartItemCount() {
  return getCart().reduce((total, item) => total + item.quantity, 0);
}

/**
 * Calcula el precio total del carrito.
 * @returns {number} Precio total
 */
function getCartTotal() {
  return getCart().reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Genera el mensaje preformateado para WhatsApp.
 * @returns {string} Mensaje formateado
 */
function generateWhatsAppMessage() {
  const cart = getCart();

  if (cart.length === 0) {
    return '';
  }

  const lines = cart.map(item =>
    `${item.name} x${item.quantity} (${formatPrice(item.price * item.quantity)})`
  );

  const total = getCartTotal();

  const message = [
    'Hola La Casa Del Celular. Quiero comprar:',
    '',
    ...lines.map(line => `- ${line}`),
    '',
    `Total: ${formatPrice(total)}`,
    `Entrega: ${CONFIG.deliveryText}`,
  ];

  // Incluir código promocional si existe
  if (typeof window._lcdcGetPromoCode === 'function') {
    const promoCode = window._lcdcGetPromoCode();
    if (promoCode) {
      message.push('', `Código de descuento: ${promoCode}`);
    }
  }

  message.push('', 'Gracias.');

  return message.join('\n');
}

/**
 * Genera la URL de WhatsApp con el mensaje preformateado.
 * @returns {string} URL de WhatsApp
 */
function generateWhatsAppURL() {
  const message = generateWhatsAppMessage();
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodedMessage}`;
}

/**
 * Muestra una notificación tipo toast.
 * @param {string} text - Texto a mostrar
 * @param {number} duration - Duración en milisegundos (default: 3000)
 */
function showToast(text, duration = 3000) {
  // Eliminar toast existente si hay
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span>${text}</span>
    <div class="toast__progress" style="animation-duration:${duration}ms;"></div>
  `;

  document.body.appendChild(toast);

  // Forzar reflow para activar la animación
  toast.offsetHeight;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Escapa HTML para prevenir XSS.
 * @param {string} str - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Debounce simple para optimizar eventos.
 * @param {Function} func - Función a debaunce
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
