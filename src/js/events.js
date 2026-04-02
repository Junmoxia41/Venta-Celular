/* ============================================
   LA CASA DEL CELULAR - Sistema de Eventos v2
   Descripción: Caja de regalo animada, modal
                de eventos, codigo promocional,
                cuenta regresiva de 24h por usuario,
                zona horaria Santa Clara, Cuba
   ============================================ */

(function () {
  'use strict';

  var _activeEvents = [];
  var _promoCodes = {};
  var _countdownInterval = null;
  var _celebrationInterval = null;
  var _giftBoxRemoved = false;
  var _HABANA_TZ = 'America/Havana';

  // =============================================
  // OBTENER HORA ACTUAL EN SANTA CLARA, CUBA
  // =============================================

  function getHavanaTime() {
    try {
      var now = new Date();
      var formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: _HABANA_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      });
      var parts = formatter.formatToParts(now);
      var get = function(type) {
        var p = parts.find(function(x) { return x.type === type; });
        return p ? p.value : '0';
      };
      // Return a Date-like object with Havana time
      return new Date(
        parseInt(get('year')),
        parseInt(get('month')) - 1,
        parseInt(get('day')),
        parseInt(get('hour')),
        parseInt(get('minute')),
        parseInt(get('second'))
      );
    } catch(e) {
      // Fallback: usar hora local
      return new Date();
    }
  }

  function getHavanaTimestamp() {
    try {
      var now = new Date();
      var str = now.toLocaleString('en-US', { timeZone: _HABANA_TZ });
      return new Date(str).getTime();
    } catch(e) {
      return Date.now();
    }
  }

  function getHavanaTimeString() {
    try {
      return new Date().toLocaleString('es-CU', {
        timeZone: _HABANA_TZ,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true
      });
    } catch(e) {
      return new Date().toLocaleTimeString('es-CU', { hour12: true });
    }
  }

  // =============================================
  // INYECCIÓN DE CSS GLOBAL
  // =============================================

  (function injectEventCSS() {
    var css = document.createElement('style');
    css.id = 'lcdc-events-css';
    css.textContent = '\
      @keyframes giftBounce {\
        0%, 100% { transform: translateY(0); }\
        25% { transform: translateY(-12px); }\
        50% { transform: translateY(-4px); }\
        75% { transform: translateY(-8px); }\
      }\
      @keyframes giftGlow {\
        0% { filter: drop-shadow(0 4px 15px rgba(230,57,70,0.4)); }\
        100% { filter: drop-shadow(0 4px 25px rgba(230,57,70,0.7)); }\
      }\
      @keyframes giftShake {\
        0%, 100% { transform: translate(0,0) rotate(0deg); }\
        10% { transform: translate(-4px,-2px) rotate(-3deg); }\
        20% { transform: translate(4px,2px) rotate(3deg); }\
        30% { transform: translate(-3px,3px) rotate(-2deg); }\
        40% { transform: translate(3px,-3px) rotate(2deg); }\
        50% { transform: translate(-2px,4px) rotate(-4deg); }\
        60% { transform: translate(2px,-4px) rotate(4deg); }\
        70% { transform: translate(-4px,1px) rotate(-1deg); }\
        80% { transform: translate(4px,-1px) rotate(1deg); }\
        90% { transform: translate(-1px,3px) rotate(-3deg); }\
      }\
      @keyframes giftExplode {\
        0% { transform: scale(1) rotate(0deg); opacity: 1; }\
        50% { transform: scale(1.8) rotate(180deg); opacity: 0.8; }\
        100% { transform: scale(3) rotate(360deg); opacity: 0; }\
      }\
      @keyframes eventParticleFloat {\
        0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }\
        10% { opacity: 0.6; }\
        90% { opacity: 0.6; }\
        100% { transform: translateY(-100vh) translateX(50px) rotate(720deg); opacity: 0; }\
      }\
      @keyframes bannerShimmer {\
        0% { background-position: 200% 0; }\
        100% { background-position: -200% 0; }\
      }\
      @keyframes eventFloat {\
        0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }\
        50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }\
      }\
      @keyframes eventPop {\
        0% { transform: scale(0); opacity: 0; }\
        50% { transform: scale(1.2); }\
        100% { transform: scale(1); opacity: 1; }\
      }\
      @keyframes pulseScale {\
        0%, 100% { transform: scale(1); }\
        50% { transform: scale(1.05); }\
      }\
      @keyframes sparkle {\
        0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }\
        50% { opacity: 1; transform: scale(1) rotate(180deg); }\
      }\
    ';
    if (document.head) {
      document.head.appendChild(css);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        document.head.appendChild(css);
      });
    }
  })();

  // =============================================
  // 1. CARGAR EVENTOS (nuevo sistema sin fechas)
  // =============================================

  function loadEvents() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '../data/events.json', true);
    xhr.onload = function() {
      if (xhr.status !== 200) return;
      try {
        var data = JSON.parse(xhr.responseText);
        var allEvents = data.eventos || [];

        // Filtrar solo eventos activos
        _activeEvents = allEvents.filter(function(ev) {
          return ev.activo === true;
        });

        if (_activeEvents.length === 0) return;

        // Para cada evento activo, verificar si ya expiró para este usuario
        var validEvents = [];
        for (var i = 0; i < _activeEvents.length; i++) {
          var ev = _activeEvents[i];
          var status = getUserEventStatus(ev);
          if (status === 'expired') {
            // Evento ya terminó para este usuario, no mostrar
            continue;
          }
          validEvents.push(ev);

          // Si es primera vez, guardar timestamp de inicio
          if (status === 'new') {
            setUserEventStart(ev.id, getHavanaTimestamp());
          }
        }

        _activeEvents = validEvents;

        if (_activeEvents.length > 0) {
          console.log('[LCDC Events] Eventos activos para este usuario:', _activeEvents.length);
          loadPromoCodes();
          initEventBanner();
          initGiftBox();
          initCelebrationAnimations();
          startCountdownTimer();

          window._lcdcEvents = {
            getActive: function() { return _activeEvents; },
            getPromoCode: function(eventId) { return _promoCodes[eventId] || null; },
            generatePromoCode: function(eventId) { return generatePromoCode(eventId); }
          };
        }
      } catch(e) {
        console.error('[LCDC Events] Error:', e);
      }
    };
    xhr.onerror = function() {};
    xhr.send();
  }

  // =============================================
  // 2. GESTIÓN DE TIEMPO POR USUARIO (localStorage)
  // =============================================

  function getUserEventStatus(ev) {
    var key = 'lcdc_ev_' + ev.id;
    try {
      var stored = localStorage.getItem(key);
      if (!stored) return 'new'; // Primera vez que ve este evento

      var startTime = parseInt(stored, 10);
      var now = getHavanaTimestamp();
      var durationMs = (ev.duracionHoras || 24) * 60 * 60 * 1000;

      if (now - startTime >= durationMs) {
        return 'expired'; // Ya pasó el tiempo
      }

      return 'active'; // Aún está dentro del tiempo
    } catch(e) {
      return 'new';
    }
  }

  function setUserEventStart(eventId, timestamp) {
    var key = 'lcdc_ev_' + eventId;
    try {
      localStorage.setItem(key, timestamp.toString());
    } catch(e) {}
  }

  function getUserEventRemainingMs(ev) {
    var key = 'lcdc_ev_' + ev.id;
    try {
      var stored = localStorage.getItem(key);
      if (!stored) return (ev.duracionHoras || 24) * 60 * 60 * 1000; // Tiempo completo

      var startTime = parseInt(stored, 10);
      var now = getHavanaTimestamp();
      var durationMs = (ev.duracionHoras || 24) * 60 * 60 * 1000;
      var remaining = durationMs - (now - startTime);

      return remaining > 0 ? remaining : 0;
    } catch(e) {
      return (ev.duracionHoras || 24) * 60 * 60 * 1000;
    }
  }

  // =============================================
  // 3. BANNER DE EVENTO ACTIVO
  // =============================================

  function initEventBanner() {
    if (_activeEvents.length === 0) return;
    var ev = _activeEvents[0];

    var remaining = getUserEventRemainingMs(ev);
    var hoursLeft = Math.floor(remaining / 3600000);
    var minsLeft = Math.floor((remaining % 3600000) / 60000);

    var banner = document.createElement('div');
    banner.className = 'event-banner';
    banner.id = 'event-banner';
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:1000;' +
      'background:linear-gradient(90deg,' + ev.colores.primario + ',' + ev.colores.secundario + ',' + ev.colores.primario + ');' +
      'background-size:200% 100%;animation:bannerShimmer 3s ease-in-out infinite;' +
      'color:white;text-align:center;padding:8px 16px;font-size:0.8rem;font-weight:700;' +
      'letter-spacing:0.5px;cursor:pointer;box-shadow:0 2px 15px rgba(0,0,0,0.3);' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    banner.innerHTML = ev.emoji + ' ' + escapeHTML(ev.nombre) + ' \u2014 Quedan ' + hoursLeft + 'h ' + minsLeft + 'm \u2014 ' + escapeHTML(ev.descripcion);

    banner.addEventListener('click', function() {
      openEventModal(ev);
    });

    document.body.appendChild(banner);
    document.body.style.paddingTop = '40px';

    var header = document.querySelector('.header');
    if (header) {
      header.style.top = '40px';
    }
  }

  // =============================================
  // 4. CAJA DE REGALO ANIMADA
  // =============================================

  function initGiftBox() {
    var giftEvents = _activeEvents.filter(function(e) { return e.mostrarCajaRegalo; });
    if (giftEvents.length === 0) return;
    if (document.getElementById('gift-box')) return;

    var ev = giftEvents[0];
    var remaining = getUserEventRemainingMs(ev);
    var hoursLeft = Math.floor(remaining / 3600000);

    var giftBox = document.createElement('div');
    giftBox.className = 'gift-box';
    giftBox.id = 'gift-box';
    giftBox.style.cssText =
      'position:fixed;bottom:100px;left:20px;z-index:999;cursor:pointer;' +
      'width:64px;height:64px;' +
      'animation:giftBounce 2s ease-in-out infinite, giftGlow 2s ease-in-out infinite alternate;' +
      'transition:transform 0.3s ease;';

    giftBox.innerHTML =
      '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
        '<rect x="10" y="45" width="80" height="45" rx="4" fill="' + ev.colores.primario + '" stroke="' + ev.colores.secundario + '" stroke-width="2"/>' +
        '<rect x="5" y="35" width="90" height="15" rx="4" fill="' + ev.colores.secundario + '" stroke="' + ev.colores.primario + '" stroke-width="2"/>' +
        '<rect x="42" y="35" width="16" height="55" rx="2" fill="' + ev.colores.primario + '" opacity="0.7"/>' +
        '<rect x="10" y="42" width="80" height="10" rx="2" fill="' + ev.colores.primario + '" opacity="0.7"/>' +
        '<ellipse cx="38" cy="38" rx="14" ry="10" fill="' + ev.colores.secundario + '" transform="rotate(-15 38 38)"/>' +
        '<ellipse cx="62" cy="38" rx="14" ry="10" fill="' + ev.colores.secundario + '" transform="rotate(15 62 38)"/>' +
        '<circle cx="50" cy="40" r="5" fill="' + ev.colores.primario + '"/>' +
        '<circle cx="25" cy="55" r="3" fill="white" opacity="0.4">' +
          '<animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite"/>' +
        '</circle>' +
        '<circle cx="70" cy="70" r="2" fill="white" opacity="0.3">' +
          '<animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.5s" repeatCount="indefinite"/>' +
        '</circle>' +
      '</svg>' +
      '<span style="position:absolute;top:-8px;right:-8px;background:' + ev.colores.primario + ';color:white;font-size:0.55rem;padding:2px 6px;border-radius:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);max-width:50px;text-align:center;line-height:1.1;">' + hoursLeft + 'h</span>';

    giftBox.addEventListener('click', function() {
      explodeGiftBox(giftBox, ev);
    });

    giftBox.addEventListener('mouseenter', function() {
      giftBox.style.transform = 'scale(1.15) rotate(-5deg)';
    });
    giftBox.addEventListener('mouseleave', function() {
      giftBox.style.transform = 'scale(1) rotate(0deg)';
    });

    document.body.appendChild(giftBox);

    // Auto-sacudir a los 5 segundos
    setTimeout(function() {
      if (giftBox && giftBox.parentNode && !_giftBoxRemoved) {
        giftBox.style.animation = 'giftShake 0.8s ease-in-out, giftGlow 2s ease-in-out infinite alternate';
        setTimeout(function() {
          if (giftBox && giftBox.parentNode) {
            giftBox.style.animation = 'giftBounce 2s ease-in-out infinite, giftGlow 2s ease-in-out infinite alternate';
          }
        }, 1500);
      }
    }, 5000);
  }

  // =============================================
  // 5. EXPLOSIÓN DE LA CAJA DE REGALO
  // =============================================

  function explodeGiftBox(giftBox, event) {
    _giftBoxRemoved = true;
    giftBox.style.animation = 'none';
    giftBox.style.transform = 'scale(1)';
    giftBox.style.animation = 'giftShake 0.3s linear infinite';

    setTimeout(function() {
      giftBox.style.transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.6s ease';
      giftBox.style.animation = 'giftExplode 0.6s ease-out forwards';
      createExplosionParticles(giftBox, event);

      setTimeout(function() {
        if (giftBox.parentNode) giftBox.remove();
        openEventModal(event);
        setTimeout(function() { launchCelebrationConfetti(event); }, 300);
      }, 700);
    }, 800);
  }

  function createExplosionParticles(element, event) {
    var rect = element.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var colors = [event.colores.primario, event.colores.secundario, '#ffd700', '#ff6b6b', '#ffffff', '#4caf50'];

    for (var i = 0; i < 35; i++) {
      (function(idx) {
        var particle = document.createElement('div');
        var size = Math.random() * 12 + 4;
        var color = colors[Math.floor(Math.random() * colors.length)];
        var angle = (Math.PI * 2 / 35) * idx + (Math.random() - 0.5) * 0.5;
        var distance = Math.random() * 180 + 60;
        var tx = Math.cos(angle) * distance;
        var ty = Math.sin(angle) * distance;
        var duration = Math.random() * 900 + 500;

        particle.style.cssText =
          'position:fixed;left:' + cx + 'px;top:' + cy + 'px;' +
          'width:' + size + 'px;height:' + size + 'px;background:' + color + ';' +
          'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';' +
          'pointer-events:none;z-index:10000;' +
          'transition:all ' + duration + 'ms cubic-bezier(0.25, 0.46, 0.45, 0.94);' +
          'opacity:1;box-shadow:0 0 8px ' + color + ';';

        document.body.appendChild(particle);
        particle.offsetWidth;
        particle.style.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + (Math.random() * 720) + 'deg)';
        particle.style.opacity = '0';

        setTimeout(function() { if (particle.parentNode) particle.remove(); }, duration + 100);
      })(i);
    }
  }

  // =============================================
  // 6. MODAL DE EVENTO (con cuenta regresiva de 24h)
  // =============================================

  function openEventModal(event) {
    var existing = document.getElementById('event-modal-overlay');
    if (existing) existing.remove();

    var promoCode = _promoCodes[event.id] || generatePromoCode(event.id, event.prefijoCodigo);
    var remaining = getUserEventRemainingMs(event);
    var duracionH = event.duracionHoras || 24;

    var overlay = document.createElement('div');
    overlay.className = 'event-modal-overlay';
    overlay.id = 'event-modal-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
      'z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;' +
      'opacity:0;visibility:hidden;transition:opacity 0.4s ease, visibility 0.4s;';

    overlay.innerHTML =
      '<div class="event-modal" style="' +
        'background:' + event.colores.fondo + ';' +
        'border-radius:24px;max-width:500px;width:100%;position:relative;overflow:hidden;' +
        'transform:scale(0.8) translateY(30px);' +
        'transition:transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);' +
        'box-shadow:0 25px 80px rgba(0,0,0,0.5);' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      '">' +
        '<!-- Partículas decorativas -->' +
        '<div style="position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;pointer-events:none;">' +
          '<div style="position:absolute;top:10%;left:10%;width:6px;height:6px;background:' + event.colores.secundario + ';border-radius:50%;opacity:0.3;animation:eventFloat 4s ease-in-out infinite;"></div>' +
          '<div style="position:absolute;top:20%;right:15%;width:8px;height:8px;background:' + event.colores.primario + ';border-radius:50%;opacity:0.2;animation:eventFloat 5s ease-in-out infinite 1s;"></div>' +
          '<div style="position:absolute;bottom:20%;left:20%;width:4px;height:4px;background:#ffd700;border-radius:50%;opacity:0.4;animation:eventFloat 3s ease-in-out infinite 0.5s;"></div>' +
          '<div style="position:absolute;bottom:30%;right:10%;width:5px;height:5px;background:' + event.colores.secundario + ';border-radius:50%;opacity:0.3;animation:eventFloat 4.5s ease-in-out infinite 2s;"></div>' +
          '<div style="position:absolute;top:50%;left:5%;width:3px;height:3px;background:white;border-radius:50%;opacity:0.2;animation:sparkle 3s ease-in-out infinite;"></div>' +
          '<div style="position:absolute;top:70%;right:8%;width:4px;height:4px;background:#ffd700;border-radius:50%;opacity:0.3;animation:sparkle 2.5s ease-in-out infinite 0.8s;"></div>' +
        '</div>' +

        '<!-- Cerrar -->' +
        '<button id="event-modal-close" style="position:absolute;top:16px;right:16px;z-index:10;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s;font-size:1.2rem;" aria-label="Cerrar">\u2715</button>' +

        '<!-- Contenido -->' +
        '<div style="padding:40px 30px;text-align:center;color:white;position:relative;z-index:1;">' +
          '<div style="font-size:4rem;margin-bottom:10px;animation:eventPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;">' + event.emoji + '</div>' +

          '<h2 style="font-size:1.6rem;font-weight:800;margin:0 0 8px;background:linear-gradient(135deg, white, ' + event.colores.secundario + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">' + escapeHTML(event.nombre) + '</h2>' +

          '<div style="display:inline-block;background:linear-gradient(135deg, ' + event.colores.primario + ', ' + event.colores.secundario + ');padding:8px 24px;border-radius:30px;font-size:1.3rem;font-weight:800;margin:10px 0 16px;box-shadow:0 4px 20px ' + event.colores.primario + '66;animation:pulseScale 2s ease-in-out infinite;">' +
            '-$' + event.descuento + ' USD DESCUENTO' +
          '</div>' +

          '<p style="color:rgba(255,255,255,0.8);font-size:0.9rem;line-height:1.6;margin:0 0 20px;">' + escapeHTML(event.descripcionLarga) + '</p>' +

          '<!-- Hora de Santa Clara -->' +
          '<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:8px 16px;margin-bottom:16px;display:inline-block;">' +
            '<span style="color:rgba(255,255,255,0.4);font-size:0.7rem;">\uD83D\uDCCD Santa Clara, Cuba </span>' +
            '<span id="havana-clock" style="color:' + event.colores.secundario + ';font-weight:700;font-size:0.85rem;font-variant-numeric:tabular-nums;">' + getHavanaTimeString() + '</span>' +
          '</div>' +

          '<!-- Código promocional -->' +
          '<div style="background:rgba(255,255,255,0.08);border:2px dashed rgba(255,255,255,0.2);border-radius:16px;padding:20px;margin-bottom:20px;">' +
            '<p style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;">Tu codigo de descuento</p>' +
            '<div style="display:flex;align-items:center;justify-content:center;gap:12px;">' +
              '<span id="promo-code-display" style="font-size:1.5rem;font-weight:800;letter-spacing:3px;font-family:monospace;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.3);">' + promoCode + '</span>' +
              '<button id="copy-promo-btn" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);color:white;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:600;transition:all 0.3s;font-family:-apple-system,BlinkMacSystemFont,sans-serif;" aria-label="Copiar codigo">\uD83D\uDCCB Copiar</button>' +
            '</div>' +
          '</div>' +

          '<!-- Cuenta regresiva -->' +
          '<div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;margin-bottom:24px;">' +
            '<p style="color:rgba(255,255,255,0.5);font-size:0.7rem;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Tiempo restante para reclamar</p>' +
            '<div style="display:flex;justify-content:center;gap:8px;">' +
              '<div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;min-width:60px;">' +
                '<div id="cd-hours" style="font-size:1.6rem;font-weight:800;color:' + event.colores.secundario + ';font-variant-numeric:tabular-nums;">00</div>' +
                '<div style="font-size:0.6rem;color:rgba(255,255,255,0.4);text-transform:uppercase;">Horas</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;font-size:1.4rem;font-weight:800;color:rgba(255,255,255,0.3);padding-bottom:14px;">:</div>' +
              '<div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;min-width:60px;">' +
                '<div id="cd-mins" style="font-size:1.6rem;font-weight:800;color:' + event.colores.secundario + ';font-variant-numeric:tabular-nums;">00</div>' +
                '<div style="font-size:0.6rem;color:rgba(255,255,255,0.4);text-transform:uppercase;">Min</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;font-size:1.4rem;font-weight:800;color:rgba(255,255,255,0.3);padding-bottom:14px;">:</div>' +
              '<div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;min-width:60px;">' +
                '<div id="cd-secs" style="font-size:1.6rem;font-weight:800;color:' + event.colores.secundario + ';font-variant-numeric:tabular-nums;">00</div>' +
                '<div style="font-size:0.6rem;color:rgba(255,255,255,0.4);text-transform:uppercase;">Seg</div>' +
              '</div>' +
            '</div>' +
            '<p style="color:rgba(255,255,255,0.3);font-size:0.65rem;margin:8px 0 0;">Duracion del evento: ' + duracionH + ' horas desde tu primera visita</p>' +
          '</div>' +

          '<!-- Botones de acción -->' +
          '<div style="display:flex;flex-direction:column;gap:10px;">' +
            '<a id="claim-whatsapp-btn" href="https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent('Hola La Casa Del Celular! Tengo el codigo de descuento ' + promoCode + '. Quiero comprar un celular.') + '" target="_blank" rel="noopener noreferrer" style="' +
              'display:flex;align-items:center;justify-content:center;gap:10px;' +
              'background:linear-gradient(135deg, #25d366, #128c7e);' +
              'color:white;padding:14px 24px;border-radius:14px;' +
              'text-decoration:none;font-size:1rem;font-weight:700;' +
              'transition:all 0.3s;box-shadow:0 4px 15px rgba(37,211,102,0.3);' +
            '"><span style="font-size:1.3rem;">\uD83D\uDCF1</span> Reclamar por WhatsApp</a>' +
            '<button id="close-event-btn" style="' +
              'background:transparent;border:1px solid rgba(255,255,255,0.2);' +
              'color:rgba(255,255,255,0.7);padding:12px 24px;border-radius:14px;' +
              'cursor:pointer;font-size:0.9rem;font-weight:600;transition:all 0.3s;' +
              'font-family:-apple-system,BlinkMacSystemFont,sans-serif;' +
            '">Lo reclamo despues</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Animación de entrada
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        var modal = overlay.querySelector('.event-modal');
        if (modal) modal.style.transform = 'scale(1) translateY(0)';
      });
    });

    // Event listeners
    var closeBtn = overlay.querySelector('#event-modal-close');
    var closeEventBtn = overlay.querySelector('#close-event-btn');
    var copyBtn = overlay.querySelector('#copy-promo-btn');

    if (closeBtn) closeBtn.addEventListener('click', function() { closeEventModal(overlay); });
    if (closeEventBtn) closeEventBtn.addEventListener('click', function() { closeEventModal(overlay); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeEventModal(overlay); });

    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(promoCode).then(function() {
            copyBtn.textContent = '\u2705 Copiado!';
            copyBtn.style.background = 'rgba(37,211,102,0.3)';
            setTimeout(function() {
              copyBtn.textContent = '\uD83D\uDCCB Copiar';
              copyBtn.style.background = 'rgba(255,255,255,0.15)';
            }, 2000);
          }).catch(function() { fallbackCopy(promoCode, copyBtn); });
        } else {
          fallbackCopy(promoCode, copyBtn);
        }
      });
    }

    function escHandler(e) {
      if (e.key === 'Escape') {
        closeEventModal(overlay);
        document.removeEventListener('keydown', escHandler);
      }
    }
    document.addEventListener('keydown', escHandler);
  }

  function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      btn.textContent = '\u2705 Copiado!';
      btn.style.background = 'rgba(37,211,102,0.3)';
      setTimeout(function() {
        btn.textContent = '\uD83D\uDCCB Copiar';
        btn.style.background = 'rgba(255,255,255,0.15)';
      }, 2000);
    } catch(e) {}
    document.body.removeChild(ta);
  }

  function closeEventModal(overlay) {
    overlay.style.opacity = '0';
    setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 400);
  }

  // =============================================
  // 7. CUENTA REGRESIVA (24h por usuario)
  // =============================================

  function startCountdownTimer() {
    _countdownInterval = setInterval(function() {
      // Actualizar modal si está abierto
      updateModalCountdown();

      // Actualizar banner
      updateBannerCountdown();

      // Actualizar reloj de La Habana
      var clockEl = document.getElementById('havana-clock');
      if (clockEl) {
        clockEl.textContent = getHavanaTimeString();
      }

      // Verificar si algún evento expiró
      var allExpired = true;
      for (var i = 0; i < _activeEvents.length; i++) {
        var remaining = getUserEventRemainingMs(_activeEvents[i]);
        if (remaining > 0) {
          allExpired = false;
        }
      }

      if (allExpired && _activeEvents.length > 0) {
        clearInterval(_countdownInterval);
        if (_celebrationInterval) clearInterval(_celebrationInterval);
        removeEventUI();
      }
    }, 1000);
  }

  function updateModalCountdown() {
    if (_activeEvents.length === 0) return;
    var ev = _activeEvents[0];
    var remaining = getUserEventRemainingMs(ev);

    if (remaining <= 0) return;

    var hours = Math.floor(remaining / 3600000);
    var minutes = Math.floor((remaining % 3600000) / 60000);
    var seconds = Math.floor((remaining % 60000) / 1000);

    var hoursEl = document.getElementById('cd-hours');
    var minsEl = document.getElementById('cd-mins');
    var secsEl = document.getElementById('cd-secs');

    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');
  }

  function updateBannerCountdown() {
    if (_activeEvents.length === 0) return;
    var ev = _activeEvents[0];
    var remaining = getUserEventRemainingMs(ev);
    var banner = document.getElementById('event-banner');

    if (!banner || remaining <= 0) return;

    var hours = Math.floor(remaining / 3600000);
    var mins = Math.floor((remaining % 3600000) / 60000);

    banner.innerHTML = ev.emoji + ' ' + escapeHTML(ev.nombre) + ' \u2014 Quedan ' + hours + 'h ' + mins + 'm \u2014 ' + escapeHTML(ev.descripcion);
  }

  function removeEventUI() {
    // Remover banner
    var banner = document.getElementById('event-banner');
    if (banner) banner.remove();

    // Remover gift box
    var giftBox = document.getElementById('gift-box');
    if (giftBox) giftBox.remove();

    // Remover partículas
    var particles = document.getElementById('event-particles');
    if (particles) particles.remove();

    // Restaurar padding
    document.body.style.paddingTop = '';
    var header = document.querySelector('.header');
    if (header) header.style.top = '';

    console.log('[LCDC Events] Todos los eventos han expirado para este usuario.');
  }

  // =============================================
  // 8. CÓDIGO PROMOCIONAL
  // =============================================

  function generatePromoCode(eventId, prefix) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    var promoCode = 'LCDC-' + (prefix || 'PROMO') + '-' + code;
    _promoCodes[eventId] = promoCode;
    savePromoCodes();
    return promoCode;
  }

  function loadPromoCodes() {
    try {
      var data = localStorage.getItem('lcdc_promo_codes');
      if (data) _promoCodes = JSON.parse(data);
    } catch(e) { _promoCodes = {}; }
  }

  function savePromoCodes() {
    try {
      localStorage.setItem('lcdc_promo_codes', JSON.stringify(_promoCodes));
    } catch(e) {}
  }

  function getActivePromoCode() {
    for (var i = 0; i < _activeEvents.length; i++) {
      var ev = _activeEvents[i];
      if (_promoCodes[ev.id] && ev.generarCodigo) return _promoCodes[ev.id];
    }
    return null;
  }

  // =============================================
  // 9. ANIMACIONES DE CELEBRACIÓN
  // =============================================

  function initCelebrationAnimations() {
    var hasCelebration = _activeEvents.some(function(e) { return e.mostrarAnimaciones; });
    if (!hasCelebration) return;

    createFloatingParticles();

    _celebrationInterval = setInterval(function() { launchSubtleConfetti(); }, 15000);
    setTimeout(launchSubtleConfetti, 3000);
  }

  function createFloatingParticles() {
    var container = document.createElement('div');
    container.id = 'event-particles';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:998;overflow:hidden;';
    document.body.appendChild(container);

    for (var i = 0; i < 20; i++) {
      (function(idx) {
        var particle = document.createElement('div');
        var size = Math.random() * 6 + 2;
        var left = Math.random() * 100;
        var delay = Math.random() * 10;
        var duration = Math.random() * 15 + 10;
        var ev = _activeEvents[0];
        var colors = [ev.colores.primario, ev.colores.secundario, '#ffd700', '#ffffff'];
        var color = colors[Math.floor(Math.random() * colors.length)];

        particle.style.cssText =
          'position:absolute;left:' + left + '%;bottom:-10px;' +
          'width:' + size + 'px;height:' + size + 'px;background:' + color + ';' +
          'border-radius:50%;opacity:0;pointer-events:none;' +
          'animation:eventParticleFloat ' + duration + 's linear ' + delay + 's infinite;';

        container.appendChild(particle);
      })(i);
    }
  }

  function launchSubtleConfetti() {
    if (_activeEvents.length === 0) return;
    var ev = _activeEvents[0];
    var colors = [ev.colores.primario, ev.colores.secundario, '#ffd700', '#ff6b6b', '#ffffff', '#4caf50'];

    for (var i = 0; i < 15; i++) {
      (function(idx) {
        var particle = document.createElement('div');
        var size = Math.random() * 8 + 3;
        var startX = Math.random() * window.innerWidth;
        var color = colors[Math.floor(Math.random() * colors.length)];
        var duration = Math.random() * 3000 + 2000;
        var drift = (Math.random() - 0.5) * 200;

        particle.style.cssText =
          'position:fixed;left:' + startX + 'px;top:-10px;' +
          'width:' + size + 'px;height:' + (size * 0.6) + 'px;' +
          'background:' + color + ';pointer-events:none;z-index:999;' +
          'border-radius:' + (Math.random() > 0.5 ? '50%' : '1px') + ';' +
          'opacity:0.8;transition:all ' + duration + 'ms ease-in;';

        document.body.appendChild(particle);

        requestAnimationFrame(function() {
          particle.style.transform = 'translate(' + drift + 'px,' + (window.innerHeight + 50) + 'px) rotate(' + (Math.random() * 720) + 'deg)';
          particle.style.opacity = '0';
        });

        setTimeout(function() { if (particle.parentNode) particle.remove(); }, duration + 100);
      })(i);
    }
  }

  function launchCelebrationConfetti(event) {
    var colors = [event.colores.primario, event.colores.secundario, '#ffd700', '#ff6b6b', '#ffffff', '#4caf50', '#e040fb'];

    for (var i = 0; i < 60; i++) {
      (function(idx) {
        var particle = document.createElement('div');
        var size = Math.random() * 14 + 4;
        var startX = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
        var startY = window.innerHeight / 2;
        var color = colors[Math.floor(Math.random() * colors.length)];
        var angle = Math.random() * Math.PI * 2;
        var distance = Math.random() * 400 + 100;
        var tx = Math.cos(angle) * distance;
        var ty = Math.sin(angle) * distance - 200;
        var duration = Math.random() * 1500 + 1000;

        particle.style.cssText =
          'position:fixed;left:' + startX + 'px;top:' + startY + 'px;' +
          'width:' + size + 'px;height:' + (size * 0.6) + 'px;' +
          'background:' + color + ';pointer-events:none;z-index:10001;' +
          'border-radius:' + (Math.random() > 0.5 ? '50%' : '1px') + ';' +
          'box-shadow:0 0 6px ' + color + ';' +
          'transition:all ' + duration + 'ms cubic-bezier(0.25, 0.46, 0.45, 0.94);';

        document.body.appendChild(particle);

        requestAnimationFrame(function() {
          particle.style.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + (Math.random() * 1080) + 'deg)';
          particle.style.opacity = '0';
        });

        setTimeout(function() { if (particle.parentNode) particle.remove(); }, duration + 100);
      })(i);
    }
  }

  // =============================================
  // UTILIDADES
  // =============================================

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window._lcdcGetPromoCode = getActivePromoCode;

  // =============================================
  // INICIALIZACIÓN
  // =============================================

  function init() {
    if (window.storeConfig && window.storeConfig.features && window.storeConfig.features.events === false) {
      return;
    }
    loadEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
