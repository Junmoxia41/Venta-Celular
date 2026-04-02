/* ============================================
   LA CASA DEL CELULAR - Componentes
   Autor: La Casa Del Celular
   Descripción: Renderizado de tarjetas, modal,
                carrito lateral y notificaciones
   ============================================ */

/**
 * Renderiza una tarjeta de producto.
 * @param {object} product - Datos del producto
 * @returns {HTMLElement} Elemento de la tarjeta
 */
function renderProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card fade-in';
  card.setAttribute('data-product-id', product.id);

  // Badge
  let badgeHTML = '';
  if (product.badge) {
    const badgeClass = product.badge.toLowerCase().includes('oferta') ? 'oferta'
      : product.badge.toLowerCase().includes('vendido') ? 'vendido'
      : product.badge.toLowerCase().includes('nuevo') ? 'nuevo'
      : 'top';
    badgeHTML = `<div class="product-card__badge product-card__badge--${badgeClass}">${escapeHTML(product.badge)}</div>`;
  }

  const brandColors = {
    'tecno': 'linear-gradient(135deg, #1a237e, #0d47a1)',
    'samsung': 'linear-gradient(135deg, #1428a0, #0d47a1)',
    'xiaomi': 'linear-gradient(135deg, #ff6900, #e65100)',
    'iphone': 'linear-gradient(135deg, #1c1c1e, #3a3a3c)'
  };
  const brand = (product.name || '').toLowerCase();
  let gradient = 'linear-gradient(135deg, #1b2838, #2d4059)';
  for (const key of Object.keys(brandColors)) {
    if (brand.includes(key)) { gradient = brandColors[key]; break; }
  }
  const initials = product.name.split(' ').filter(w => w.length > 3).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  card.innerHTML = `
    ${badgeHTML}
    <div class="product-card__img-wrapper">
      <img
        class="product-card__img"
        src="${getImagePath(product.img)}"
        alt="${getImageAlt(product)}"
        loading="lazy"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <div class="product-card__placeholder product-card__placeholder--branded" style="display:none; background: ${gradient};">
        <span class="product-card__placeholder-initials">${escapeHTML(initials)}</span>
        <span class="product-card__placeholder-name">${escapeHTML(product.name)}</span>
      </div>
    </div>
    <div class="product-card__info">
      <h3 class="product-card__name">${escapeHTML(product.name)}</h3>
      <div class="product-card__specs">
        <span class="product-card__spec">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6V4m12 2V4"/></svg>
          ${escapeHTML(product.ram)}
        </span>
        <span class="product-card__spec">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          ${escapeHTML(product.storage)}
        </span>
      </div>
      <div class="product-card__price-row">
        <div>
          <div class="product-card__price">${formatPrice(product.price)}</div>
          <div class="product-card__price-currency">USD</div>
        </div>
      </div>
      <div class="product-card__actions">
        <button class="btn btn--outline btn--sm" onclick="openModal(${product.id})" aria-label="Ver detalles de ${escapeHTML(product.name)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Ver
        </button>
        <button class="btn btn--primary btn--sm" id="add-btn-${product.id}" onclick="handleQuickAdd(${product.id})" aria-label="Agregar ${escapeHTML(product.name)} al carrito">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Agregar
        </button>
      </div>
    </div>
  `;

  return card;
}

/**
 * Renderiza el grid de productos.
 * @param {Array} products - Lista de productos a mostrar
 */
function renderProductGrid(products) {
  const grid = document.getElementById('products-grid');
  const countEl = document.getElementById('results-count');

  if (!grid) return;

  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="products__empty">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>No se encontraron productos que coincidan con tu búsqueda.</p>
      </div>
    `;
  } else {
    products.forEach(product => {
      grid.appendChild(renderProductCard(product));
    });
  }

  // Actualizar contador
  if (countEl) {
    countEl.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;
  }

  // Activar animaciones de entrada con IntersectionObserver
  requestAnimationFrame(() => {
    const fadeEls = grid.querySelectorAll('.fade-in');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      fadeEls.forEach(el => observer.observe(el));
    } else {
      // Fallback: mostrar todos
      fadeEls.forEach(el => el.classList.add('visible'));
    }
  });
}

/**
 * Abre el modal de detalle del producto.
 * @param {number} productId - ID del producto
 */
function openModal(productId) {
  const product = window.productsData.find(p => p.id === productId);
  if (!product) return;

  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  if (!overlay || !modalContent) return;

  // Badge
  let badgeHTML = '';
  if (product.badge) {
    const badgeClass = product.badge.toLowerCase().includes('oferta') ? 'oferta'
      : product.badge.toLowerCase().includes('vendido') ? 'vendido'
      : product.badge.toLowerCase().includes('nuevo') ? 'nuevo'
      : 'top';
    badgeHTML = `<span class="modal__badge product-card__badge--${badgeClass}">${escapeHTML(product.badge)}</span>`;
  }

  // Brand colors & initials for placeholder
  const brandColors = {
    'tecno': 'linear-gradient(135deg, #1a237e, #0d47a1)',
    'samsung': 'linear-gradient(135deg, #1428a0, #0d47a1)',
    'xiaomi': 'linear-gradient(135deg, #ff6900, #e65100)',
    'iphone': 'linear-gradient(135deg, #1c1c1e, #3a3a3c)'
  };
  const brand = (product.name || '').toLowerCase();
  let gradient = 'linear-gradient(135deg, #1b2838, #2d4059)';
  for (const key of Object.keys(brandColors)) {
    if (brand.includes(key)) { gradient = brandColors[key]; break; }
  }
  const initials = product.name.split(' ').filter(w => w.length > 3).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // Specs grid
  let specsHTML = '';
  if (product.specs) {
    specsHTML = Object.entries(product.specs).map(([key, value]) => `
      <div class="modal__spec-item">
        <span class="modal__spec-label">${escapeHTML(key)}</span>
        <span class="modal__spec-value">${escapeHTML(value)}</span>
      </div>
    `).join('');
  }

  modalContent.innerHTML = `
    <button class="modal__close" onclick="closeModal()" aria-label="Cerrar detalle del producto">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="modal__img-wrapper">
      <img
        class="modal__img"
        src="${getImagePath(product.img)}"
        alt="${getImageAlt(product)}"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <div class="modal__img-placeholder modal__img-placeholder--branded" style="display:none; background: ${gradient};">
        <span class="modal__img-placeholder-initials">${escapeHTML(initials)}</span>
        <span class="modal__img-placeholder-name">${escapeHTML(product.name)}</span>
      </div>
    </div>
    <div class="modal__body">
      ${badgeHTML}
      <h2 class="modal__name" id="modal-title">${escapeHTML(product.name)}</h2>
      <div class="modal__price">${formatPrice(product.price)} <small style="font-size:0.6em;color:var(--text-muted);">USD</small></div>
      <p class="modal__description">${escapeHTML(product.description || 'Sin descripción disponible.')}</p>
      
      ${specsHTML ? `
        <h3 class="modal__specs-title">Especificaciones</h3>
        <div class="modal__specs-grid">
          ${specsHTML}
        </div>
      ` : ''}

      <div class="modal__quantity">
        <span class="modal__quantity-label">Cantidad:</span>
        <div class="modal__quantity-controls">
          <button class="modal__quantity-btn" id="modal-qty-minus" onclick="changeModalQty(-1)" aria-label="Disminuir cantidad">−</button>
          <span class="modal__quantity-value" id="modal-qty-value" aria-live="polite">1</span>
          <button class="modal__quantity-btn" id="modal-qty-plus" onclick="changeModalQty(1)" aria-label="Aumentar cantidad">+</button>
        </div>
      </div>

      <button class="btn btn--primary btn--full modal__add-btn" id="modal-add-btn" onclick="handleModalAdd(${product.id})">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Agregar al carrito
      </button>
    </div>
  `;

  // Guardar ID y cantidad del producto en el modal
  window._modalProductId = productId;
  window._modalQty = 1;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Focus trap: enfocar el botón de cerrar
  const closeBtn = modalContent.querySelector('.modal__close');
  if (closeBtn) closeBtn.focus();
}

/**
 * Cierra el modal.
 */
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  overlay.classList.remove('open');
  document.body.style.overflow = '';

  // Devolver el foco al botón que abrió el modal
  const productId = window._modalProductId;
  const openBtn = document.querySelector(`[data-product-id="${productId}"] .btn--outline`);
  if (openBtn) openBtn.focus();

  window._modalProductId = null;
  window._modalQty = null;
}

/**
 * Cambia la cantidad en el modal.
 * @param {number} delta - Incremento (+1 o -1)
 */
function changeModalQty(delta) {
  const qtyEl = document.getElementById('modal-qty-value');
  const minusBtn = document.getElementById('modal-qty-minus');
  if (!qtyEl) return;

  window._modalQty = Math.max(1, (window._modalQty || 1) + delta);
  qtyEl.textContent = window._modalQty;

  // Animación bounce en el número
  if (typeof animateQtyChange === 'function') animateQtyChange();

  if (minusBtn) {
    minusBtn.disabled = window._modalQty <= 1;
  }
}

/**
 * Maneja la adición rápida desde la tarjeta (cantidad 1).
 * @param {number} productId - ID del producto
 */
function handleQuickAdd(productId) {
  const product = window.productsData.find(p => p.id === productId);
  if (!product) return;

  addToCart(product, 1);
  updateCartUI();

  // Feedback visual en el botón
  const btn = document.getElementById(`add-btn-${productId}`);
  if (btn) {
    btn.classList.add('btn--added');
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ¡Agregado!
    `;

    setTimeout(() => {
      btn.classList.remove('btn--added');
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Agregar
      `;
    }, 1500);
  }

  // Animación del contador del carrito
  const cartCount = document.querySelector('.header__cart-count');
  if (cartCount) {
    cartCount.classList.remove('bump');
    void cartCount.offsetWidth; // Force reflow
    cartCount.classList.add('bump');
  }

  // Confetti burst
  if (typeof launchConfetti === 'function' && btn) {
    const rect = btn.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top);
  }

  showToast(`${product.name} agregado al carrito`);
}

/**
 * Maneja la adición desde el modal (usa la cantidad seleccionada).
 * @param {number} productId - ID del producto
 */
function handleModalAdd(productId) {
  const product = window.productsData.find(p => p.id === productId);
  if (!product) return;

  const qty = window._modalQty || 1;
  addToCart(product, qty);
  updateCartUI();

  // Feedback en el botón del modal
  const btn = document.getElementById('modal-add-btn');
  if (btn) {
    btn.classList.add('btn--added');
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ¡Agregado al carrito!
    `;

    setTimeout(() => {
      btn.classList.remove('btn--added');
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Agregar al carrito
      `;
    }, 1500);
  }

  // Animación del contador
  const cartCount = document.querySelector('.header__cart-count');
  if (cartCount) {
    cartCount.classList.remove('bump');
    void cartCount.offsetWidth;
    cartCount.classList.add('bump');
  }

  // Confetti burst
  if (typeof launchConfetti === 'function' && btn) {
    const rect = btn.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top);
  }

  showToast(`${product.name} x${qty} agregado al carrito`);
}

/**
 * Abre el carrito lateral.
 */
function openCart() {
  const cart = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('cart-overlay');
  if (cart) cart.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateCartUI();
}

/**
 * Cierra el carrito lateral.
 */
function closeCart() {
  const cart = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('cart-overlay');
  if (cart) cart.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';

  // Devolver foco al botón del carrito en el header
  const cartBtn = document.querySelector('.header__cart-btn');
  if (cartBtn) cartBtn.focus();
}

/**
 * Actualiza toda la UI del carrito (contador, lista, total).
 */
function updateCartUI() {
  const cart = getCart();

  // Actualizar contador en el header
  const cartCount = document.querySelector('.header__cart-count');
  if (cartCount) {
    const count = getCartItemCount();
    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? 'flex' : 'none';
  }

  // Renderizar lista del carrito
  const cartBody = document.getElementById('cart-items');
  if (!cartBody) return;

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart__empty">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p>Tu carrito está vacío</p>
        <button class="btn btn--primary btn--sm" onclick="closeCart()">Ver productos</button>
      </div>
    `;
  } else {
    cartBody.innerHTML = cart.map(item => `
      <div class="cart-item" data-cart-item-id="${item.id}">
        <img
          class="cart-item__img"
          src="${getImagePath(item.img)}"
          alt="${escapeHTML(item.name)}"
          loading="lazy"
          onerror="this.src='${getPlaceholderPath()}'"
        />
        <div class="cart-item__info">
          <h4 class="cart-item__name">${escapeHTML(item.name)}</h4>
          <div class="cart-item__price">${formatPrice(item.price)}</div>
          <div class="cart-item__controls">
            <div class="cart-item__quantity">
              <button class="cart-item__qty-btn" onclick="handleCartQtyChange(${item.id}, -1)" aria-label="Disminuir cantidad de ${escapeHTML(item.name)}" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
              <span class="cart-item__qty-value" aria-live="polite">${item.quantity}</span>
              <button class="cart-item__qty-btn" onclick="handleCartQtyChange(${item.id}, 1)" aria-label="Aumentar cantidad de ${escapeHTML(item.name)}">+</button>
            </div>
            <button class="cart-item__remove" onclick="handleCartItemRemove(${item.id})" aria-label="Eliminar ${escapeHTML(item.name)} del carrito">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
          <div class="cart-item__subtotal">Subtotal: ${formatPrice(item.price * item.quantity)}</div>
        </div>
      </div>
    `).join('');
  }

  // Actualizar total
  const totalEl = document.getElementById('cart-total');
  if (totalEl) {
    totalEl.textContent = formatPrice(getCartTotal());
    // Animar el total
    if (typeof animateTotalChange === 'function') animateTotalChange();
  }

  // Habilitar/deshabilitar botón de checkout
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
    checkoutBtn.style.opacity = cart.length === 0 ? '0.5' : '1';
  }
}

/**
 * Maneja el cambio de cantidad en el carrito.
 * @param {number} productId - ID del producto
 * @param {number} delta - Incremento (+1 o -1)
 */
function handleCartQtyChange(productId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  const newQty = item.quantity + delta;
  updateCartItemQuantity(productId, newQty);
  updateCartUI();
}

/**
 * Maneja la eliminación de un ítem del carrito.
 * @param {number} productId - ID del producto
 */
function handleCartItemRemove(productId) {
  removeFromCart(productId);
  updateCartUI();
  showToast('Producto eliminado del carrito');
}

/**
 * Procesa el checkout (abre WhatsApp).
 */
function handleCheckout() {
  const cart = getCart();
  if (cart.length === 0) return;

  const url = generateWhatsAppURL();
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Activa/desactiva el menú móvil.
 */
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.toggle('open');
}
