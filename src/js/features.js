/* ============================================
   LA CASA DEL CELULAR - Funcionalidades
   Autor: La Casa Del Celular
   Descripción: Módulo de funciones adicionales
                (modo oscuro, WhatsApp flotante,
                 vistos recientemente, favoritos,
                 zoom, compartir, comparar, FAQ,
                 volver arriba, configuración)
   ============================================ */

(function () {
  'use strict';

  // --- Almacenamiento local para comparación ---
  window.compareList = window.compareList || [];

  // --- Estado interno ---
  let _originalOpenModal = null;
  let _scrollTicking = false;
  let _faqOpenIndex = -1;

  // =============================================
  // 1. CARGADOR DE CONFIGURACIÓN
  // =============================================

  /**
   * Carga la configuración de la tienda desde config.json.
   * Aplica eventos/promociones a los productos.
   * @returns {Promise<Object|null>} Configuración de la tienda
   */
  async function loadStoreConfig() {
    try {
      const response = await fetch('../data/config.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const config = await response.json();

      // Guardar en window para acceso global
      window.storeConfig = config;

      // Actualizar número de WhatsApp si viene en la configuración
      if (config.general && config.general.whatsappNumber) {
        CONFIG.whatsappNumber = config.general.whatsappNumber;
      }

      // Aplicar eventos/promociones a los productos
      applyEventsToProducts(config.events || []);

      return config;
    } catch (error) {
      console.error('Error al cargar la configuración de la tienda:', error);
      return null;
    }
  }

  /**
   * Aplica eventos (descuentos, precios especiales) a los productos.
   * Modifica window.productsData según la configuración de eventos.
   * @param {Array} events - Lista de eventos desde config.json
   */
  function applyEventsToProducts(events) {
    if (!Array.isArray(events) || !window.productsData) return;

    events.forEach(function (event) {
      // Ignorar eventos deshabilitados
      if (!event.enabled) return;

      const productIds = event.productIds || [];

      productIds.forEach(function (pid) {
        const product = window.productsData.find(function (p) { return p.id === pid; });
        if (!product) return;

        if (event.type === 'discount') {
          // Tipo descuento: calcular precio con descuento
          const percent = event.discountPercent || 0;
          const amount = event.discountAmount || 0;
          const originalPrice = product.price;
          let discountedPrice = originalPrice;

          if (amount > 0) {
            // Descuento fijo (ej: -$10 USD)
            discountedPrice = Math.max(0, originalPrice - amount);
            product._discountAmount = amount;
          } else if (percent > 0) {
            // Descuento porcentual
            discountedPrice = originalPrice * (1 - percent / 100);
            product._discountPercent = percent;
          }

          product._originalPrice = originalPrice;
          product._eventLabel = event.label || (amount > 0 ? `-$${amount}` : `-${percent}%`);
          product.price = Math.round(discountedPrice * 100) / 100;
        } else if (event.type === 'price_override') {
          // Tipo precio especial: sobreescribir precio
          const overridePrice = event.newPrice || product.price;
          product._originalPrice = product.price;
          product._eventLabel = event.label || 'Precio especial';
          product.price = overridePrice;
        }
      });
    });

    // Re-renderizar el grid con los productos actualizados
    if (typeof renderProductGrid === 'function') {
      renderProductGrid(window.productsData);
    }
  }

  // =============================================
  // 2. MODO OSCURO (Dark Mode)
  // =============================================

  /**
   * Inicializa el toggle de modo oscuro.
   * Crea el botón en el header y gestiona el tema.
   */
  function initDarkMode() {
    const actionsContainer = document.querySelector('.header__actions');
    if (!actionsContainer) return;

    // Crear botón de tema
    const themeBtn = document.createElement('button');
    themeBtn.className = 'header__theme-btn';
    themeBtn.setAttribute('aria-label', 'Cambiar tema claro/oscuro');
    themeBtn.style.cssText = 'background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--radius-full);transition:background-color 0.3s,color 0.3s;color:var(--text-secondary);';

    themeBtn.innerHTML = `
      <svg class="theme-icon theme-icon--sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="transition:transform 0.4s ease,opacity 0.3s ease;">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <svg class="theme-icon theme-icon--moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="position:absolute;transition:transform 0.4s ease,opacity 0.3s ease;">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    `;

    // Determinar tema inicial
    const savedTheme = localStorage.getItem('lcdc_theme');
    let currentTheme = savedTheme;

    if (!currentTheme) {
      // Detectar preferencia del sistema
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        currentTheme = 'dark';
      } else {
        currentTheme = 'light';
      }
    }

    // Aplicar tema
    applyTheme(currentTheme);

    // Evento de click para alternar
    themeBtn.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('lcdc_theme', next);
    });

    // Insertar antes del botón de WhatsApp en el header
    const whatsappBtn = actionsContainer.querySelector('.header__whatsapp');
    if (whatsappBtn) {
      actionsContainer.insertBefore(themeBtn, whatsappBtn);
    } else {
      actionsContainer.insertBefore(themeBtn, actionsContainer.firstChild);
    }

    // Escuchar cambios de preferencia del sistema
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', function (e) {
        // Solo cambiar automáticamente si no hay preferencia guardada
        if (!localStorage.getItem('lcdc_theme')) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * Aplica el tema (dark/light) al documento.
   * @param {string} theme - 'dark' o 'light'
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const sunIcon = document.querySelector('.theme-icon--sun');
    const moonIcon = document.querySelector('.theme-icon--moon');
    if (!sunIcon || !moonIcon) return;

    if (theme === 'dark') {
      sunIcon.style.transform = 'rotate(90deg)';
      sunIcon.style.opacity = '0';
      moonIcon.style.transform = 'rotate(0deg)';
      moonIcon.style.opacity = '1';
    } else {
      sunIcon.style.transform = 'rotate(0deg)';
      sunIcon.style.opacity = '1';
      moonIcon.style.transform = 'rotate(-90deg)';
      moonIcon.style.opacity = '0';
    }
  }

  // =============================================
  // 3. BOTÓN FLOTANTE DE WHATSAPP
  // =============================================

  /**
   * Crea el botón flotante de WhatsApp.
   * Incluye animación de pulso y se oculta con el carrito.
   */
  function initFloatingWhatsApp() {
    // No crear si ya existe
    if (document.querySelector('.floating-whatsapp')) return;

    const link = document.createElement('a');
    link.className = 'floating-whatsapp';
    link.href = 'https://wa.me/' + CONFIG.whatsappNumber;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Contactar por WhatsApp');

    link.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor"/>
      </svg>
    `;

    document.body.appendChild(link);

    // Ocultar/mostrar cuando el carrito se abre/cierra
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.attributeName === 'class') {
            if (cartSidebar.classList.contains('open')) {
              link.classList.add('cart-hidden');
            } else {
              link.classList.remove('cart-hidden');
            }
          }
        });
      });
      observer.observe(cartSidebar, { attributes: true });
    }
  }

  // =============================================
  // 4. BOTÓN "VOLVER ARRIBA"
  // =============================================

  /**
   * Crea el botón "Volver arriba" con flecha SVG.
   * Se muestra después de 400px de scroll.
   */
  function initBackToTop() {
    // No crear si ya existe
    if (document.querySelector('.back-to-top')) return;

    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Volver arriba');

    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
        <path d="M12 4l-8 8h5v8h6v-8h5z" fill="currentColor"/>
      </svg>
    `;

    document.body.appendChild(btn);

    // Click: scroll suave hacia arriba
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Mostrar/ocultar con scroll optimizado con requestAnimationFrame
    window.addEventListener('scroll', function () {
      if (!_scrollTicking) {
        _scrollTicking = true;
        requestAnimationFrame(function () {
          if (window.scrollY > 400) {
            btn.classList.add('visible');
          } else {
            btn.classList.remove('visible');
          }
          _scrollTicking = false;
        });
      }
    }, { passive: true });

    // Ocultar cuando el carrito está abierto
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.attributeName === 'class') {
            if (cartSidebar.classList.contains('open')) {
              btn.classList.add('cart-hidden');
            } else {
              btn.classList.remove('cart-hidden');
            }
          }
        });
      });
      observer.observe(cartSidebar, { attributes: true });
    }
  }

  // =============================================
  // 5. VISTOS RECIENTEMENTE
  // =============================================

  /**
   * Agrega un producto a la lista de vistos recientemente.
   * Máximo 8 productos, los más recientes primero.
   * @param {number} productId - ID del producto
   */
  function addToRecentlyViewed(productId) {
    try {
      const data = localStorage.getItem('lcdc_recent');
      let recent = data ? JSON.parse(data) : [];

      // Eliminar si ya existe (para reubicarlo al inicio)
      recent = recent.filter(function (id) { return id !== productId; });

      // Agregar al inicio
      recent.unshift(productId);

      // Limitar a 8 items
      if (recent.length > 8) {
        recent = recent.slice(0, 8);
      }

      localStorage.setItem('lcdc_recent', JSON.stringify(recent));

      // Renderizar si la función está disponible
      renderRecentlyViewed();
    } catch (error) {
      console.error('Error al guardar producto visto recientemente:', error);
    }
  }

  /**
   * Renderiza la sección de productos vistos recientemente.
   * Se muestra debajo del grid de productos.
   */
  function renderRecentlyViewed() {
    const section = document.getElementById('recently-viewed-section');
    if (!section) return;

    try {
      const data = localStorage.getItem('lcdc_recent');
      const recentIds = data ? JSON.parse(data) : [];

      // No mostrar si no hay items
      if (!Array.isArray(recentIds) || recentIds.length === 0) {
        section.style.display = 'none';
        return;
      }

      // Obtener productos válidos
      const products = recentIds
        .map(function (id) { return window.productsData ? window.productsData.find(function (p) { return p.id === id; }) : null; })
        .filter(Boolean);

      if (products.length === 0) {
        section.style.display = 'none';
        return;
      }

      section.style.display = 'block';
      section.innerHTML = `
        <div class="recently-viewed">
          <h3 class="recently-viewed__title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Vistos recientemente
          </h3>
          <div class="recently-viewed__scroll">
            ${products.map(function (p) {
              const currentPrice = p.price;
              const originalPrice = p._originalPrice;
              const priceHTML = originalPrice
                ? '<span style="text-decoration:line-through;font-size:11px;color:var(--text-muted);margin-right:4px;">' + formatPrice(originalPrice) + '</span>' + formatPrice(currentPrice)
                : formatPrice(currentPrice);

              return `
                <div class="recently-viewed__card" onclick="openModal(${p.id})" tabindex="0" role="button" aria-label="Ver ${escapeHTML(p.name)}">
                  <img class="recently-viewed__card-img" src="${getImagePath(p.img)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.src='${getPlaceholderPath()}'"/>
                  <div class="recently-viewed__card-info">
                    <div class="recently-viewed__card-name">${escapeHTML(p.name)}</div>
                    <div class="recently-viewed__card-price">${priceHTML}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Soporte de teclado para las tarjetas
      section.querySelectorAll('.recently-viewed__card').forEach(function (card) {
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
          }
        });
      });
    } catch (error) {
      console.error('Error al renderizar productos vistos recientemente:', error);
      section.style.display = 'none';
    }
  }

  /**
   * Inicializa la funcionalidad de vistos recientemente.
   * Intercepta openModal para registrar las visitas.
   */
  function initRecentlyViewed() {
    // Crear el contenedor de la sección si no existe
    let section = document.getElementById('recently-viewed-section');
    if (!section) {
      section = document.createElement('section');
      section.id = 'recently-viewed-section';
      section.className = 'recently-viewed-section';
      section.setAttribute('aria-label', 'Productos vistos recientemente');

      // Insertar después del grid de productos
      const productsSection = document.querySelector('.products');
      if (productsSection) {
        productsSection.appendChild(section);
      } else {
        const footer = document.querySelector('.footer');
        if (footer) {
          footer.parentNode.insertBefore(section, footer);
        }
      }
    }

    // Monkey-patch openModal para registrar la visita
    if (typeof openModal === 'function' && !_originalOpenModal) {
      _originalOpenModal = openModal;
      window.openModal = function (productId) {
        // Registrar la visita
        addToRecentlyViewed(productId);
        // Llamar a la función original
        return _originalOpenModal.call(null, productId);
      };
    }

    // Renderizar los existentes
    renderRecentlyViewed();
  }

  // =============================================
  // 6. FAVORITOS / WISHLIST
  // =============================================

  /**
   * Alterna un producto en la lista de favoritos.
   * @param {number} productId - ID del producto
   */
  function toggleFavorite(productId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(productId);

    if (index > -1) {
      favorites.splice(index, 1);
      showToast('Eliminado de favoritos');
    } else {
      favorites.push(productId);
      showToast('Agregado a favoritos ❤️');
    }

    try {
      localStorage.setItem('lcdc_favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error al guardar favoritos:', error);
    }

    // Actualizar visual de todos los botones de favoritos
    updateAllFavoriteButtons();
  }

  /**
   * Verifica si un producto está en favoritos.
   * @param {number} productId - ID del producto
   * @returns {boolean}
   */
  function isFavorite(productId) {
    return getFavorites().indexOf(productId) > -1;
  }

  /**
   * Obtiene la lista de IDs de favoritos.
   * @returns {Array<number>}
   */
  function getFavorites() {
    try {
      const data = localStorage.getItem('lcdc_favorites');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error al leer favoritos:', error);
      return [];
    }
  }

  /**
   * Actualiza el estado visual de todos los botones de favorito.
   */
  function updateAllFavoriteButtons() {
    const favorites = getFavorites();
    document.querySelectorAll('.favorite-btn').forEach(function (btn) {
      const pid = parseInt(btn.dataset.productId, 10);
      if (favorites.indexOf(pid) > -1) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Genera el HTML del botón de favorito para una tarjeta de producto.
   * @param {number} productId - ID del producto
   * @returns {string} HTML del botón
   */
  function getFavoriteButtonHTML(productId) {
    const isActive = isFavorite(productId);
    return `
      <button class="favorite-btn ${isActive ? 'active' : ''}" data-product-id="${productId}" aria-label="${isActive ? 'Quitar de favoritos' : 'Agregar a favoritos'}" onclick="event.stopPropagation(); toggleFavorite(${productId});">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
          <path class="heart-stroke" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="2"/>
          <path class="heart-fill" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    `;
  }

  /**
   * Inyecta botones de favorito en las tarjetas de producto existentes.
   * Se ejecuta después de cada renderizado del grid.
   */
  function injectFavoriteButtons() {
    document.querySelectorAll('.product-card').forEach(function (card) {
      // Evitar duplicados
      if (card.querySelector('.favorite-btn')) return;

      const pid = parseInt(card.dataset.productId, 10);
      if (!pid) return;

      const imgWrapper = card.querySelector('.product-card__img-wrapper');
      if (imgWrapper) {
        imgWrapper.insertAdjacentHTML('beforeend', getFavoriteButtonHTML(pid));
      }
    });
  }

  /**
   * Inicializa la funcionalidad de favoritos.
   * Observa el grid para inyectar botones en nuevas tarjetas.
   */
  function initFavorites() {
    // Inyectar botones iniciales
    injectFavoriteButtons();

    // Observar cambios en el grid para inyectar en nuevas tarjetas
    const grid = document.getElementById('products-grid');
    if (grid) {
      const observer = new MutationObserver(function () {
        // Pequeño retraso para que las tarjetas estén listas
        setTimeout(injectFavoriteButtons, 50);
      });
      observer.observe(grid, { childList: true, subtree: false });
    }

    // Exponer funciones globalmente
    window.toggleFavorite = toggleFavorite;
    window.isFavorite = isFavorite;
    window.getFavorites = getFavorites;
  }

  // =============================================
  // 7. ZOOM EN IMAGEN
  // =============================================

  /**
   * Inicializa la funcionalidad de zoom en las imágenes de producto.
   * Solo funciona en dispositivos de escritorio.
   */
  function initImageZoom() {
    // No activar en dispositivos táctiles
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    // Delegación de eventos para las tarjetas de producto
    document.addEventListener('mouseenter', function (e) {
      const imgWrapper = e.target.closest('.product-card__img-wrapper');
      if (!imgWrapper) return;

      // No crear si ya existe una lente
      if (imgWrapper.querySelector('.zoom-lens')) return;

      const img = imgWrapper.querySelector('.product-card__img');
      if (!img || !img.src || img.style.display === 'none') return;

      // Crear la lente de zoom
      const lens = document.createElement('div');
      lens.className = 'zoom-lens';
      imgWrapper.appendChild(lens);

      // Precargar la imagen para el fondo de la lente
      const bgImg = new Image();
      bgImg.onload = function () {
        lens.style.backgroundImage = 'url(' + bgImg.src + ')';
      };
      bgImg.onerror = function () {
        lens.remove();
      };
      bgImg.src = img.src;

      // Seguir el cursor
      imgWrapper.addEventListener('mousemove', function (e) {
        if (lens.style.display === 'none') return;
        handleZoomMove(e, imgWrapper, lens);
      });

      // Mostrar al entrar
      imgWrapper.addEventListener('mousemove', function showLens() {
        lens.classList.add('active');
      }, { once: false });

      // Ocultar al salir
      imgWrapper.addEventListener('mouseleave', function () {
        lens.classList.remove('active');
      });
    }, true);

    // Limpiar lentes al salir de las tarjetas
    document.addEventListener('mouseleave', function (e) {
      const imgWrapper = e.target.closest('.product-card__img-wrapper');
      if (imgWrapper) {
        const lens = imgWrapper.querySelector('.zoom-lens');
        if (lens) lens.classList.remove('active');
      }
    }, true);
  }

  /**
   * Maneja el movimiento del zoom.
   * @param {MouseEvent} e - Evento del ratón
   * @param {HTMLElement} wrapper - Contenedor de la imagen
   * @param {HTMLElement} lens - Elemento de la lente
   */
  function handleZoomMove(e, wrapper, lens) {
    const rect = wrapper.getBoundingClientRect();
    const lensSize = 120;
    const zoomFactor = 3; // Factor de zoom 3x

    // Posición del ratón relativa al contenedor
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Centro de la lente
    const lensX = x - lensSize / 2;
    const lensY = y - lensSize / 2;

    // Posicionar la lente
    lens.style.left = lensX + 'px';
    lens.style.top = lensY + 'px';

    // Calcular posición del fondo para el efecto de zoom
    const bgWidth = rect.width * zoomFactor;
    const bgHeight = rect.height * zoomFactor;
    lens.style.backgroundSize = bgWidth + 'px ' + bgHeight + 'px';

    const bgX = -(x * zoomFactor - lensSize / 2);
    const bgY = -(y * zoomFactor - lensSize / 2);
    lens.style.backgroundPosition = bgX + 'px ' + bgY + 'px';
  }

  // =============================================
  // 8. BOTONES DE COMPARTIR
  // =============================================

  /**
   * Agrega botones de compartir dentro del modal del producto.
   * Se inyecta después del botón "Agregar al carrito".
   */
  function initShareButtons() {
    // Observar el modal para inyectar botones cuando se abra
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;

    const observer = new MutationObserver(function () {
      const addBtn = modalContent.querySelector('.modal__add-btn');
      if (!addBtn) return;

      // Evitar duplicados
      if (modalContent.querySelector('.share-buttons')) return;

      // Obtener producto actual
      const productId = window._modalProductId;
      if (!productId) return;
      const product = window.productsData ? window.productsData.find(function (p) { return p.id === productId; }) : null;
      if (!product) return;

      // Crear botones de compartir
      const shareContainer = document.createElement('div');
      shareContainer.className = 'share-buttons';
      shareContainer.setAttribute('aria-label', 'Compartir producto');

      const productURL = window.location.href.split('?')[0].split('#')[0];
      const productText = escapeHTML(product.name) + ' - ' + formatPrice(product.price) + ' | La Casa Del Celular';

      shareContainer.innerHTML = `
        <span class="share-buttons__label">Compartir:</span>
        <a class="share-buttons__btn share-buttons__btn--whatsapp" href="https://wa.me/?text=${encodeURIComponent(productText + ' ' + productURL)}" target="_blank" rel="noopener noreferrer" aria-label="Compartir por WhatsApp">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor"/></svg>
        </a>
        <a class="share-buttons__btn share-buttons__btn--facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productURL)}" target="_blank" rel="noopener noreferrer" aria-label="Compartir por Facebook">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/></svg>
        </a>
        <a class="share-buttons__btn share-buttons__btn--twitter" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(productText)}&url=${encodeURIComponent(productURL)}" target="_blank" rel="noopener noreferrer" aria-label="Compartir por Twitter">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/></svg>
        </a>
        <button class="share-buttons__btn share-buttons__btn--copy" aria-label="Copiar enlace del producto" data-copy-url="${productURL}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      `;

      // Insertar después del botón de agregar al carrito
      addBtn.parentNode.insertBefore(shareContainer, addBtn.nextSibling);

      // Evento de copiar enlace
      const copyBtn = shareContainer.querySelector('.share-buttons__btn--copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          const url = copyBtn.dataset.copyUrl || window.location.href;
          navigator.clipboard.writeText(url).then(function () {
            showToast('¡Enlace copiado!');
            copyBtn.classList.add('copied');
            setTimeout(function () {
              copyBtn.classList.remove('copied');
            }, 2000);
          }).catch(function () {
            // Fallback para navegadores sin soporte de clipboard
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand('copy');
              showToast('¡Enlace copiado!');
              copyBtn.classList.add('copied');
              setTimeout(function () {
                copyBtn.classList.remove('copied');
              }, 2000);
            } catch (err) {
              showToast('No se pudo copiar el enlace');
            }
            document.body.removeChild(textArea);
          });
        });
      }
    });

    observer.observe(modalContent, { childList: true, subtree: true });
  }

  // =============================================
  // 9. COMPARACIÓN DE PRODUCTOS
  // =============================================

  /**
   * Agrega un producto a la lista de comparación.
   * Máximo 3 productos.
   * @param {number} productId - ID del producto
   */
  function addToCompare(productId) {
    if (window.compareList.indexOf(productId) > -1) {
      showToast('Este producto ya está en la comparación');
      return;
    }

    if (window.compareList.length >= 3) {
      showToast('Máximo 3 productos para comparar. Quita uno primero.');
      return;
    }

    window.compareList.push(productId);
    showToast('Producto agregado a comparación');
    renderCompareBar();
    updateCompareCheckboxes();
  }

  /**
   * Elimina un producto de la lista de comparación.
   * @param {number} productId - ID del producto
   */
  function removeFromCompare(productId) {
    window.compareList = window.compareList.filter(function (id) { return id !== productId; });
    renderCompareBar();
    updateCompareCheckboxes();
    closeComparisonModal();
  }

  /**
   * Actualiza el estado visual de los checkboxes de comparar en las tarjetas.
   */
  function updateCompareCheckboxes() {
    document.querySelectorAll('.compare-check').forEach(function (checkbox) {
      const pid = parseInt(checkbox.dataset.productId, 10);
      checkbox.checked = window.compareList.indexOf(pid) > -1;
    });
  }

  /**
   * Inyecta checkboxes de comparación en las tarjetas de producto.
   */
  function injectCompareCheckboxes() {
    document.querySelectorAll('.product-card').forEach(function (card) {
      if (card.querySelector('.compare-check')) return;

      const pid = parseInt(card.dataset.productId, 10);
      if (!pid) return;

      const infoContainer = card.querySelector('.product-card__info');
      if (!infoContainer) return;

      const isChecked = window.compareList.indexOf(pid) > -1;
      const checkbox = document.createElement('label');
      checkbox.className = 'compare-check-label';
      checkbox.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);cursor:pointer;margin-top:4px;user-select:none;';
      checkbox.innerHTML = `
        <input type="checkbox" class="compare-check" data-product-id="${pid}" ${isChecked ? 'checked' : ''} style="width:14px;height:14px;cursor:pointer;accent-color:var(--color-accent);"/>
        Comparar
      `;

      checkbox.addEventListener('click', function (e) {
        e.stopPropagation();
      });

      checkbox.querySelector('.compare-check').addEventListener('change', function (e) {
        e.stopPropagation();
        if (e.target.checked) {
          addToCompare(pid);
        } else {
          removeFromCompare(pid);
        }
      });

      infoContainer.appendChild(checkbox);
    });
  }

  /**
   * Renderiza la barra de comparación fija en la parte inferior.
   */
  function renderCompareBar() {
    let bar = document.querySelector('.compare-bar');

    if (window.compareList.length === 0) {
      // Ocultar y eliminar la barra
      if (bar) {
        bar.classList.remove('active');
        setTimeout(function () { if (bar) bar.remove(); }, 300);
      }
      return;
    }

    // Crear la barra si no existe
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'compare-bar';
      document.body.appendChild(bar);
    }

    // Obtener productos de la lista
    const products = window.compareList.map(function (id) {
      return window.productsData ? window.productsData.find(function (p) { return p.id === id; }) : null;
    }).filter(Boolean);

    bar.innerHTML = `
      <div class="compare-bar__items">
        ${products.map(function (p) {
          return `
            <div class="compare-bar__item">
              <img class="compare-bar__item-img" src="${getImagePath(p.img)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.src='${getPlaceholderPath()}'"/>
              <span class="compare-bar__item-name">${escapeHTML(p.name)}</span>
              <button class="compare-bar__item-remove" onclick="removeFromCompare(${p.id})" aria-label="Quitar ${escapeHTML(p.name)} de la comparación">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          `;
        }).join('')}
      </div>
      ${products.length >= 2 ? `
        <button class="compare-bar__compare-btn" onclick="openComparisonModal()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Comparar
        </button>
      ` : '<span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">Agrega al menos 2 productos</span>'}
      <button class="compare-bar__close" onclick="clearComparison()" aria-label="Limpiar comparación">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    // Mostrar la barra
    requestAnimationFrame(function () {
      bar.classList.add('active');
    });
  }

  /**
   * Limpia toda la lista de comparación.
   */
  function clearComparison() {
    window.compareList = [];
    renderCompareBar();
    updateCompareCheckboxes();
    closeComparisonModal();
  }

  /**
   * Abre el modal de comparación con la tabla de productos lado a lado.
   */
  function openComparisonModal() {
    if (window.compareList.length < 2) {
      showToast('Agrega al menos 2 productos para comparar');
      return;
    }

    const products = window.compareList.map(function (id) {
      return window.productsData ? window.productsData.find(function (p) { return p.id === id; }) : null;
    }).filter(Boolean);

    if (products.length === 0) return;

    // Definir filas de la tabla
    const rows = [
      { label: 'Nombre', key: 'name' },
      { label: 'RAM', key: 'ram' },
      { label: 'Almacenamiento', key: 'storage' },
      { label: 'Precio', key: 'price', isPrice: true },
      { label: 'Pantalla', key: 'screen', specKey: 'pantalla' },
      { label: 'Procesador', key: 'processor', specKey: 'procesador' },
      { label: 'Cámara', key: 'camera', specKey: 'cámara' },
      { label: 'Batería', key: 'battery', specKey: 'batería' },
      { label: 'Sistema Operativo', key: 'os', specKey: 'sistema' }
    ];

    let tableHTML = '<div class="comparison__table-wrapper"><table class="comparison__table">';

    // Encabezado con imagen y nombre de cada producto
    tableHTML += '<thead><tr>';
    tableHTML += '<th class="comparison__th"></th>';
    products.forEach(function (p) {
      const currentPrice = p.price;
      const originalPrice = p._originalPrice;
      const priceHTML = originalPrice
        ? '<div style="text-decoration:line-through;font-size:12px;color:var(--text-muted);margin-bottom:2px;">' + formatPrice(originalPrice) + '</div>' + formatPrice(currentPrice)
        : formatPrice(currentPrice);

      tableHTML += `
        <th class="comparison__th">
          <img class="comparison__th-img" src="${getImagePath(p.img)}" alt="${escapeHTML(p.name)}" onerror="this.src='${getPlaceholderPath()}'"/>
          <div class="comparison__th-name">${escapeHTML(p.name)}</div>
          <div class="comparison__th-price">${priceHTML}</div>
          <button class="comparison__th-remove" onclick="removeFromCompare(${p.id})">Quitar</button>
        </th>
      `;
    });
    tableHTML += '</tr></thead>';

    // Cuerpo de la tabla
    tableHTML += '<tbody>';
    rows.forEach(function (row) {
      tableHTML += '<tr>';
      tableHTML += '<td class="comparison__td">' + escapeHTML(row.label) + '</td>';
      products.forEach(function (p) {
        let value = '';
        if (row.isPrice) {
          value = formatPrice(p.price);
        } else if (row.specKey && p.specs && p.specs[row.specKey]) {
          value = escapeHTML(p.specs[row.specKey]);
        } else if (p[row.key]) {
          value = escapeHTML(String(p[row.key]));
        }
        tableHTML += '<td class="comparison__td">' + value + '</td>';
      });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table></div>';

    // Usar el overlay del modal existente
    const overlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    if (!overlay || !modalContent) return;

    modalContent.innerHTML = `
      <div class="comparison-modal" style="max-width:900px;width:100%;max-height:80vh;overflow-y:auto;">
        <button class="modal__close" onclick="closeComparisonModal()" aria-label="Cerrar comparación" style="position:sticky;top:0;float:right;z-index:10;background:var(--bg-white);border-radius:var(--radius-full);width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;box-shadow:var(--shadow-md);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 style="text-align:center;font-size:1.5rem;font-weight:800;color:var(--text-primary);margin-bottom:1.5rem;padding:0 1rem;">
          Comparación de Productos
        </h2>
        ${tableHTML}
      </div>
    `;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus en el botón de cerrar
    const closeBtn = modalContent.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();
  }

  /**
   * Cierra el modal de comparación.
   */
  function closeComparisonModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  /**
   * Inicializa la funcionalidad de comparación de productos.
   */
  function initComparison() {
    // Inyectar checkboxes iniciales
    injectCompareCheckboxes();

    // Observar cambios en el grid para inyectar en nuevas tarjetas
    const grid = document.getElementById('products-grid');
    if (grid) {
      const observer = new MutationObserver(function () {
        setTimeout(injectCompareCheckboxes, 50);
      });
      observer.observe(grid, { childList: true, subtree: false });
    }

    // Exponer funciones globalmente
    window.addToCompare = addToCompare;
    window.removeFromCompare = removeFromCompare;
    window.openComparisonModal = openComparisonModal;
    window.closeComparisonModal = closeComparisonModal;
    window.clearComparison = clearComparison;
  }

  // =============================================
  // 10. ACORDEÓN DE PREGUNTAS FRECUENTES (FAQ)
  // =============================================

  /**
   * Renderiza la sección de preguntas frecuentes.
   * Lee los datos desde window.storeConfig.faq.
   */
  function renderFAQ() {
    const faqData = (window.storeConfig && window.storeConfig.faq) || [];
    if (!Array.isArray(faqData) || faqData.length === 0) return;

    const section = document.createElement('section');
    section.id = 'faq-section';
    section.className = 'faq';
    section.setAttribute('aria-label', 'Preguntas frecuentes');

    section.innerHTML = `
      <div class="container">
        <h2 class="faq__title">Preguntas Frecuentes</h2>
        ${faqData.map(function (item, index) {
          return `
            <div class="faq__item" data-faq-index="${index}">
              <button class="faq__question" aria-expanded="false" aria-controls="faq-answer-${index}">
                <span>${escapeHTML(item.question)}</span>
                <span class="faq__icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </span>
              </button>
              <div class="faq__answer" id="faq-answer-${index}" role="region">
                <div class="faq__answer-text">${escapeHTML(item.answer)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Insertar antes del footer
    const footer = document.querySelector('.footer');
    if (footer) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }

    // Evento de click para el acordeón (delegación)
    section.addEventListener('click', function (e) {
      const questionBtn = e.target.closest('.faq__question');
      if (!questionBtn) return;

      const item = questionBtn.closest('.faq__item');
      if (!item) return;

      const isOpen = item.classList.contains('open');
      const clickedIndex = parseInt(item.dataset.faqIndex, 10);

      // Cerrar todos los items
      section.querySelectorAll('.faq__item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
        const openBtn = openItem.querySelector('.faq__question');
        if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      });

      // Abrir el item clickeado si no estaba abierto
      if (!isOpen) {
        item.classList.add('open');
        questionBtn.setAttribute('aria-expanded', 'true');
        _faqOpenIndex = clickedIndex;
      } else {
        _faqOpenIndex = -1;
      }
    });
  }

  /**
   * Inicializa la sección de preguntas frecuentes.
   */
  function initFAQ() {
    renderFAQ();
  }

  // =============================================
  // FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
  // =============================================

  /**
   * Inicializa todas las funcionalidades según la configuración.
   */
  async function initFeatures() {
    // Cargar configuración
    const config = await loadStoreConfig();
    if (!config) return;

    // Inicializar cada funcionalidad si está habilitada
    if (config.features.darkMode) initDarkMode();
    if (config.features.floatingWhatsApp) initFloatingWhatsApp();
    if (config.features.backToTop) initBackToTop();
    if (config.features.recentlyViewed) initRecentlyViewed();
    if (config.features.favorites) initFavorites();
    if (config.features.imageZoom) initImageZoom();
    if (config.features.shareButtons) initShareButtons();
    if (config.features.comparison) initComparison();
    if (config.features.faq) initFAQ();
  }

  // --- Exponer funciones globalmente ---
  window.addToRecentlyViewed = addToRecentlyViewed;
  window.renderRecentlyViewed = renderRecentlyViewed;
  window.toggleFavorite = toggleFavorite;
  window.isFavorite = isFavorite;
  window.getFavorites = getFavorites;
  window.addToCompare = addToCompare;
  window.removeFromCompare = removeFromCompare;
  window.openComparisonModal = openComparisonModal;
  window.closeComparisonModal = closeComparisonModal;
  window.clearComparison = clearComparison;

  // --- Iniciar cuando el DOM esté listo ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeatures);
  } else {
    initFeatures();
  }

})();
