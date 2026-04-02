/* ============================================
   LA CASA DEL CELULAR - Aplicación Principal
   Autor: La Casa Del Celular
   Descripción: Inicialización, carga de datos,
                filtros, eventos globales, preloader
   ============================================ */

(function () {
  'use strict';

  // --- Estado global ---
  window.productsData = [];
  window._modalProductId = null;
  window._modalQty = 1;

  // --- Rango de precios para filtros ---
  const priceRanges = [
    { label: 'Todos', min: 0, max: Infinity },
    { label: 'Hasta $120', min: 0, max: 120 },
    { label: '$120 - $160', min: 120, max: 160 },
    { label: '$160 - $200', min: 160, max: 200 },
    { label: 'Más de $170', min: 170, max: Infinity },
  ];

  let activePriceRange = priceRanges[0];
  let searchQuery = '';

  /**
   * Carga los productos desde el JSON.
   * @returns {Promise<Array>} Lista de productos
   */
  async function loadProducts() {
    try {
      const response = await fetch('../data/products.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error al cargar productos:', error);
      return [];
    }
  }

  /**
   * Renderiza los botones de filtro de precio.
   */
  function renderPriceFilters() {
    const container = document.getElementById('price-filters');
    if (!container) return;

    container.innerHTML = priceRanges.map((range, index) => `
      <button
        class="filters__price-btn ${index === 0 ? 'active' : ''}"
        data-range-index="${index}"
        aria-label="Filtrar por precio: ${range.label}"
      >
        ${range.label}
      </button>
    `).join('');

    // Event listeners para los botones de precio
    container.querySelectorAll('.filters__price-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.rangeIndex);
        activePriceRange = priceRanges[index];

        // Actualizar estado activo
        container.querySelectorAll('.filters__price-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        applyFilters();
      });
    });
  }

  /**
   * Filtra los productos según búsqueda y rango de precio.
   */
  function applyFilters() {
    let filtered = [...window.productsData];

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.ram.toLowerCase().includes(query) ||
        p.storage.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Filtro por precio
    filtered = filtered.filter(p =>
      p.price >= activePriceRange.min && p.price <= activePriceRange.max
    );

    renderProductGrid(filtered);
  }

  /**
   * Configura los event listeners globales.
   */
  function setupEventListeners() {
    // --- Búsqueda ---
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        searchQuery = e.target.value;
        applyFilters();
      }, 250));
    }

    // --- Botón del carrito (header) ---
    const cartBtn = document.getElementById('header-cart-btn');
    if (cartBtn) {
      cartBtn.addEventListener('click', openCart);
    }

    // --- Cerrar carrito ---
    const cartCloseBtn = document.getElementById('cart-close-btn');
    if (cartCloseBtn) {
      cartCloseBtn.addEventListener('click', closeCart);
    }

    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) {
      cartOverlay.addEventListener('click', closeCart);
    }

    // --- Cerrar modal ---
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    // --- Checkout ---
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', handleCheckout);
    }

    // --- Menú móvil ---
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', toggleMobileMenu);
    }

    // --- Teclado global ---
    document.addEventListener('keydown', (e) => {
      // Cerrar modal con Escape
      if (e.key === 'Escape') {
        const modalEl = document.getElementById('modal-overlay');
        if (modalEl && modalEl.classList.contains('open')) {
          closeModal();
          return;
        }
        // Cerrar carrito con Escape
        const cartEl = document.getElementById('cart-sidebar');
        if (cartEl && cartEl.classList.contains('open')) {
          closeCart();
          return;
        }
        // Cerrar menú móvil con Escape
        const menuEl = document.getElementById('mobile-menu');
        if (menuEl && menuEl.classList.contains('open')) {
          toggleMobileMenu();
          return;
        }
      }
    });

    // Cerrar menú móvil al hacer clic fuera
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('mobile-menu');
      const menuBtn = document.getElementById('mobile-menu-btn');
      if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
        toggleMobileMenu();
      }
    });
  }

  /**
   * Oculta el preloader después de que el contenido esté listo.
   */
  function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hidden');
      // Remover del DOM después de la animación
      setTimeout(() => preloader.remove(), 600);
    }
  }

  /**
   * Inicializa la aplicación.
   */
  async function init() {
    try {
      // Cargar productos
      window.productsData = await loadProducts();

      // Renderizar filtros de precio
      renderPriceFilters();

      // Renderizar productos
      applyFilters();

      // Configurar eventos
      setupEventListeners();

      // Inicializar UI del carrito
      updateCartUI();

      // Esperar a que las imágenes empiecen a cargar
      await Promise.race([
        document.fonts.ready,
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      // Ocultar preloader
      hidePreloader();

    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
      hidePreloader();
    }
  }

  // --- Iniciar cuando el DOM esté listo ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
