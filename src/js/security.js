/* ============================================
   LA CASA DEL CELULAR - Sistema de Seguridad v2
   Con integración Supabase
   Descripción: Anti-screenshot, anti-bot, 
                fingerprint, 4 niveles de advertencia,
                bloqueo con Supabase + localStorage
   ============================================ */

(function () {
  'use strict';

  // =============================================
  // CONFIGURACIÓN
  // =============================================
  var SUPABASE_URL = 'https://wgkqxguwmdeunpdvedgs.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_pk0DgHxJVGhie0A3t3CcAQ_E29dLa3n';
  var LOCAL_KEY = 'lcdc_sec_v2';
  var FP_KEY = 'lcdc_fp';

  // Duraciones en ms: nivel 0=no, 1=24h, 2=72h, 3=7días
  var WARNING_DURATIONS = [0, 24 * 3600000, 72 * 3600000, 7 * 24 * 3600000];
  var WARNING_LABELS = ['', '24 horas', '72 horas', '7 días', 'PERMANENTE'];

  var _supabase = null;
  var _suspectActions = [];
  var _isBlocked = false;
  var _fingerprint = null;

  // =============================================
  // UTILIDADES
  // =============================================

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h).toString(36);
  }

  function escapeHTML(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function now() { return Date.now(); }

  // =============================================
  // 1. HUELLA DIGITAL DEL DISPOSITIVO (Fingerprint)
  // =============================================

  function getOrGenerateFingerprint() {
    // Intentar cargar del cache
    try {
      var cached = localStorage.getItem(FP_KEY);
      if (cached) { _fingerprint = cached; return cached; }
    } catch (e) {}

    var fp = generateFingerprint();
    _fingerprint = fp;
    try { localStorage.setItem(FP_KEY, fp); } catch (e) {}
    return fp;
  }

  function generateFingerprint() {
    var parts = [];

    // Canvas fingerprint
    parts.push('canvas:' + getCanvasHash());

    // WebGL
    parts.push('webgl:' + getWebGLInfo());

    // Screen
    parts.push('scr:' + screen.width + 'x' + screen.height + 'x' + screen.colorDepth + 'x' + window.devicePixelRatio);

    // Navigator
    parts.push('nav:' + navigator.platform + '|' + navigator.language + '|' + (navigator.hardwareConcurrency || '') + '|' + (navigator.deviceMemory || '') + '|' + (navigator.maxTouchPoints || 0));

    // Vendor
    parts.push('vnd:' + (navigator.vendor || '') + '|' + (navigator.userAgent || ''));

    // Timezone
    parts.push('tz:' + Intl.DateTimeFormat().resolvedOptions().timeZone + '|' + new Date().getTimezoneOffset());

    // Fonts
    parts.push('fonts:' + detectFonts());

    // Audio
    parts.push('audio:' + getAudioHash());

    var raw = parts.join('|||');
    return 'FP-' + hashStr(raw) + '-' + hashStr(raw.split('').reverse().join(''));
  }

  function getCanvasHash() {
    try {
      var c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('LCDC-Security-FP', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('LCDC-Security-FP', 4, 17);
      return hashStr(c.toDataURL());
    } catch (e) { return 'na'; }
  }

  function getWebGLInfo() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return 'na';
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        return gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) + '|' + gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      }
      return 'no-ext';
    } catch (e) { return 'err'; }
  }

  function detectFonts() {
    try {
      var testFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier', 'Verdana', 'Georgia', 'Comic Sans MS', 'Impact', 'Tahoma', 'Trebuchet MS'];
      var baseFonts = ['monospace', 'sans-serif', 'serif'];
      var s = document.createElement('span');
      s.style.position = 'absolute';
      s.style.left = '-9999px';
      s.style.fontSize = '72px';
      s.textContent = 'mmmmmmmmmmlli';
      document.body.appendChild(s);
      var results = '';
      for (var i = 0; i < testFonts.length; i++) {
        s.style.fontFamily = '"' + testFonts[i] + '"';
        var w1 = s.offsetWidth;
        for (var j = 0; j < baseFonts.length; j++) {
          s.style.fontFamily = '"' + testFonts[i] + '","' + baseFonts[j] + '"';
          if (s.offsetWidth !== w1) { results += testFonts[i][0]; break; }
        }
      }
      document.body.removeChild(s);
      return hashStr(results);
    } catch (e) { return 'na'; }
  }

  function getAudioHash() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(10000, ctx.currentTime);
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-50, ctx.currentTime);
      comp.knee.setValueAtTime(40, ctx.currentTime);
      comp.ratio.setValueAtTime(12, ctx.currentTime);
      comp.attack.setValueAtTime(0, ctx.currentTime);
      comp.release.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(comp);
      comp.connect(ctx.destination);
      osc.start(0);
      var buf = ctx.createAnalyser();
      buf.fftSize = 256;
      comp.connect(buf);
      var data = new Uint8Array(buf.frequencyBinCount);
      buf.getByteFrequencyData(data);
      osc.stop(ctx.currentTime + 0.05);
      var hash = '';
      for (var i = 0; i < data.length; i++) { hash += data[i]; }
      ctx.close();
      return hashStr(hash);
    } catch (e) { return 'na'; }
  }

  // =============================================
  // 2. RECOLECTAR INFO DEL DISPOSITIVO
  // =============================================

  function collectDeviceInfo() {
    return {
      user_agent: navigator.userAgent || '',
      platform: navigator.platform || '',
      language: navigator.language || '',
      languages: (navigator.languages || []).join(','),
      screen_resolution: screen.width + 'x' + screen.height,
      color_depth: screen.colorDepth || '',
      pixel_ratio: window.devicePixelRatio || '',
      hardware_concurrency: navigator.hardwareConcurrency || '',
      device_memory: navigator.deviceMemory || '',
      vendor: navigator.vendor || '',
      max_touch_points: navigator.maxTouchPoints || 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      timezone_offset: new Date().getTimezoneOffset() || '',
      canvas_hash: getCanvasHash(),
      webgl_renderer: getWebGLInfo(),
      ip_address: '', // Se llena async
      country: '',
      city: ''
    };
  }

  // =============================================
  // 3. DETECTAR IP (async)
  // =============================================

  function getIP() {
    return new Promise(function(resolve) {
      var timeout = setTimeout(function() { resolve(null); }, 4000);
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://api.ipify.org?format=json', true);
        xhr.onload = function() {
          clearTimeout(timeout);
          try {
            var d = JSON.parse(xhr.responseText);
            resolve(d.ip || null);
          } catch (e) { resolve(null); }
        };
        xhr.onerror = function() { clearTimeout(timeout); resolve(null); };
        xhr.send();
      } catch (e) { clearTimeout(timeout); resolve(null); }
    });
  }

  function getIPGeo(ip) {
    if (!ip) return Promise.resolve(null);
    return new Promise(function(resolve) {
      var timeout = setTimeout(function() { resolve(null); }, 4000);
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://ipapi.co/' + ip + '/json/', true);
        xhr.onload = function() {
          clearTimeout(timeout);
          try {
            var d = JSON.parse(xhr.responseText);
            resolve({ country: d.country_name || '', city: d.city || '', isp: d.org || '' });
          } catch (e) { resolve(null); }
        };
        xhr.onerror = function() { clearTimeout(timeout); resolve(null); };
        xhr.send();
      } catch (e) { clearTimeout(timeout); resolve(null); }
    });
  }

  // =============================================
  // 4. SUPABASE INTEGRACIÓN
  // =============================================

  function initSupabase() {
    try {
      if (window.supabase && window.supabase.createClient) {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function supabaseCheck(fingerprint) {
    return new Promise(function(resolve) {
      if (!_supabase) { resolve(null); return; }
      try {
        _supabase.from('device_bans')
          .select('*')
          .eq('fingerprint', fingerprint)
          .single()
          .then(function(result) {
            resolve(result.data || null);
          })
          .catch(function() { resolve(null); });
      } catch (e) { resolve(null); }
    });
  }

  function supabaseUpsert(record) {
    return new Promise(function(resolve) {
      if (!_supabase) { resolve(false); return; }
      try {
        _supabase.from('device_bans')
          .upsert(record, { onConflict: 'fingerprint' })
          .then(function() { resolve(true); })
          .catch(function() { resolve(false); });
      } catch (e) { resolve(false); }
    });
  }

  // =============================================
  // 5. LOCAL STORAGE
  // =============================================

  function getLocalData() {
    try {
      var d = localStorage.getItem(LOCAL_KEY);
      return d ? JSON.parse(d) : null;
    } catch (e) { return null; }
  }

  function setLocalData(data) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function clearLocalData() {
    try { localStorage.removeItem(LOCAL_KEY); } catch (e) {}
  }

  // =============================================
  // 6. SISTEMA DE BAN / ADVERTENCIAS
  // =============================================

  function triggerBan(reason) {
    if (_isBlocked) return;

    var local = getLocalData();
    var fp = _fingerprint || getOrGenerateFingerprint();
    var newLevel;
    var blockDuration;

    if (!local || !local.fingerprint) {
      // Primera vez
      newLevel = 1;
    } else if (local.status === 'permanent') {
      // Ya está baneado permanentemente
      showPermanentBanPage(local);
      return;
    } else if (local.blocked_until && now() < local.blocked_until) {
      // Aún está bloqueado
      return;
    } else if (local.status === 'cleared') {
      // Fue desbloqueado por admin, pero reincidió
      newLevel = (local.warning_level || 1) + 1;
      if (newLevel > 4) newLevel = 4;
    } else {
      // Bloqueo previo expiró, reincide
      newLevel = (local.warning_level || 1) + 1;
      if (newLevel > 4) newLevel = 4;
    }

    if (newLevel >= 4) {
      // BAN PERMANENTE
      blockDuration = Infinity;
    } else {
      blockDuration = WARNING_DURATIONS[newLevel] || WARNING_DURATIONS[1];
    }

    var blockedAt = now();
    var blockedUntil = newLevel >= 4 ? null : (blockedAt + blockDuration);

    // Recolectar info del dispositivo
    var deviceInfo = collectDeviceInfo();

    // Guardar local
    var localData = {
      fingerprint: fp,
      warning_level: newLevel,
      status: newLevel >= 4 ? 'permanent' : 'blocked',
      blocked_at: blockedAt,
      blocked_until: blockedUntil,
      trigger_reason: reason,
      device_info: deviceInfo
    };
    setLocalData(localData);

    // Guardar en Supabase (async, no bloquea)
    saveBanToSupabase(fp, newLevel, reason, blockedAt, blockedUntil, deviceInfo);

    // Mostrar página de bloqueo
    if (newLevel >= 4) {
      showPermanentBanPage(localData);
    } else {
      showBlockPage(localData);
    }
  }

  function saveBanToSupabase(fp, level, reason, blockedAt, blockedUntil, deviceInfo) {
    if (!_supabase) return;

    getIP().then(function(ip) {
      deviceInfo.ip_address = ip || '';

      return getIPGeo(ip).then(function(geo) {
        if (geo) {
          deviceInfo.country = geo.country || '';
          deviceInfo.city = geo.city || '';
          deviceInfo.isp = geo.isp || '';
        }

        // Actualizar local con IP
        var local = getLocalData();
        if (local) {
          local.device_info = deviceInfo;
          setLocalData(local);
        }

        // Guardar en Supabase
        var record = {
          fingerprint: fp,
          user_agent: deviceInfo.user_agent,
          platform: deviceInfo.platform,
          language: deviceInfo.language,
          languages: deviceInfo.languages,
          screen_resolution: deviceInfo.screen_resolution,
          color_depth: deviceInfo.color_depth,
          pixel_ratio: deviceInfo.pixel_ratio,
          hardware_concurrency: deviceInfo.hardware_concurrency,
          device_memory: deviceInfo.device_memory,
          vendor: deviceInfo.vendor,
          max_touch_points: deviceInfo.max_touch_points,
          timezone: deviceInfo.timezone,
          timezone_offset: deviceInfo.timezone_offset,
          canvas_hash: deviceInfo.canvas_hash,
          webgl_renderer: deviceInfo.webgl_renderer,
          ip_address: deviceInfo.ip_address,
          country: deviceInfo.country,
          city: deviceInfo.city,
          isp: deviceInfo.isp,
          trigger_reason: reason,
          warning_level: level,
          status: level >= 4 ? 'permanent' : 'blocked',
          blocked_at: new Date(blockedAt).toISOString(),
          blocked_until: blockedUntil ? new Date(blockedUntil).toISOString() : null
        };

        supabaseUpsert(record);
      });
    });
  }

  // =============================================
  // 7. PÁGINAS DE BLOQUEO
  // =============================================

  function showBlockPage(data) {
    _isBlocked = true;
    var level = data.warning_level || 1;
    var remaining = (data.blocked_until || 0) - now();
    var duration = remaining > 0 ? remaining : 3600000;
    var durationLabel = WARNING_LABELS[level] || '24 horas';

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.innerHTML = '';

    var overlay = document.createElement('div');
    overlay.id = 'lcdc-block-page';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0a0a0a,#1a0a0a,#0a0a1a);z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    var hours = Math.floor(duration / 3600000);
    var mins = Math.floor((duration % 3600000) / 60000);
    var secs = Math.floor((duration % 60000) / 1000);

    overlay.innerHTML =
      '<div style="text-align:center;max-width:500px;padding:40px;">' +
        // Icono
        '<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,' + getLevelColor(level) + ',' + getLevelColorDark(level) + ');display:flex;align-items:center;justify-content:center;margin:0 auto 30px;box-shadow:0 0 60px ' + getLevelColor(level) + '40;">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '</div>' +

        // Título
        '<h1 style="font-size:1.8rem;font-weight:800;margin:0 0 10px;color:' + getLevelColor(level) + ';">Acceso Restringido</h1>' +

        // Nivel de advertencia
        '<div style="display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;margin-bottom:16px;">' +
          '<span style="color:rgba(255,255,255,0.5);font-size:0.75rem;">Advertencia </span>' +
          '<span style="color:' + getLevelColor(level) + ';font-weight:800;font-size:1.1rem;">' + level + ' de 3</span>' +
        '</div>' +

        // Descripción
        '<p style="font-size:1rem;color:#888;line-height:1.6;margin:0 0 8px;">' +
          getLevelMessage(level) +
        '</p>' +
        '<p style="font-size:0.85rem;color:#666;line-height:1.5;margin:0 0 30px;">' +
          'Si crees que esto es un error, contacta por WhatsApp para resolverlo.' +
        '</p>' +

        // Motivo
        '<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px 16px;margin-bottom:24px;text-align:left;">' +
          '<span style="color:#555;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;">Motivo detectado</span>' +
          '<p style="color:' + getLevelColor(level) + ';font-size:0.9rem;margin:6px 0 0;font-weight:600;">\uD83D\uDCF8 ' + escapeHTML(data.trigger_reason || 'Violación de seguridad') + '</p>' +
        '</div>' +

        // Info
        '<div style="background:#1a1a1a;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #2a2a2a;">' +
          '<p style="color:#555;font-size:0.8rem;margin:0 0 10px;">ID del dispositivo: <span style="color:#888;font-family:monospace;font-size:0.7rem;">' + escapeHTML((data.fingerprint || '').substring(0, 30)) + '...</span></p>' +
          '<p style="color:#555;font-size:0.8rem;margin:0 0 10px;">Fecha: <span style="color:#888;">' + new Date(data.blocked_at || now()).toLocaleString('es-CU', { timeZone: 'America/Havana' }) + '</span></p>' +
          '<p style="color:#555;font-size:0.8rem;margin:0;">Duración del bloqueo: <span style="color:' + getLevelColor(level) + ';font-weight:700;">' + durationLabel + '</span></p>' +
        '</div>' +

        // Countdown
        '<div style="background:#1a1a1a;border-radius:16px;padding:24px;margin-bottom:30px;border:1px solid #2a2a2a;">' +
          '<p style="color:#555;font-size:0.75rem;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Tiempo restante</p>' +
          '<div id="block-countdown" style="font-size:2.5rem;font-weight:800;color:#fff;font-variant-numeric:tabular-nums;">' +
            String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') +
          '</div>' +
          '<p style="color:#444;font-size:0.7rem;margin:12px 0 0;">\uD83C\uDDF2 Hora de Santa Clara, Cuba</p>' +
          '<div id="havana-time-block" style="color:#666;font-size:0.85rem;font-weight:600;margin-top:4px;">' + getHavanaTime() + '</div>' +
        '</div>' +

        // WhatsApp contacto
        '<p style="color:#444;font-size:0.8rem;line-height:1.5;">' +
          'Contacto: <a href="https://wa.me/5352678747" style="color:#25d366;text-decoration:none;font-weight:600;">+53 5352678747</a>' +
        '</p>' +
      '</div>';

    document.body.appendChild(overlay);

    // Iniciar countdown
    var countdownEl = overlay.querySelector('#block-countdown');
    var clockEl = overlay.querySelector('#havana-time-block');
    var interval = setInterval(function() {
      var local = getLocalData();
      if (!local || !local.blocked_until) { clearInterval(interval); return; }
      var rem = local.blocked_until - Date.now();
      if (rem <= 0) {
        clearInterval(interval);
        // Bloqueo expiró, verificar Supabase
        verifyAfterExpiry();
        return;
      }
      var h = Math.floor(rem / 3600000);
      var m = Math.floor((rem % 3600000) / 60000);
      var s = Math.floor((rem % 60000) / 1000);
      if (countdownEl) countdownEl.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      if (clockEl) clockEl.textContent = getHavanaTime();
    }, 1000);
  }

  function showPermanentBanPage(data) {
    _isBlocked = true;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.innerHTML = '';

    var overlay = document.createElement('div');
    overlay.id = 'lcdc-permanent-ban';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0a0000,#1a0000,#000);z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    overlay.innerHTML =
      '<div style="text-align:center;max-width:500px;padding:40px;">' +
        '<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#7f1d1d);display:flex;align-items:center;justify-content:center;margin:0 auto 30px;box-shadow:0 0 80px rgba(220,38,38,0.4);animation:pulse 2s ease-in-out infinite;">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
        '</div>' +

        '<h1 style="font-size:2rem;font-weight:900;margin:0 0 10px;color:#dc2626;">BAN PERMANENTE</h1>' +

        '<p style="font-size:1.1rem;color:#aaa;line-height:1.6;margin:0 0 20px;">' +
          'Su dispositivo ha sido baneado permanentemente.<br>' +
          'Este acceso es irrevocable.' +
        '</p>' +

        '<div style="background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">' +
          '<p style="color:#dc2626;font-size:0.9rem;margin:0;font-weight:600;">\u26A0\uFE0F Se han registrado 4 violaciones de seguridad.</p>' +
          '<p style="color:#888;font-size:0.8rem;margin:8px 0 0;">La información completa de su dispositivo ha sido almacenada. Cambiar de navegador, VPN o limpiar datos no le permitirá acceder nuevamente.</p>' +
        '</div>' +

        '<div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:30px;">' +
          '<p style="color:#555;font-size:0.75rem;margin:0;">ID: <span style="color:#777;font-family:monospace;">' + escapeHTML((data.fingerprint || '').substring(0, 30)) + '</span></p>' +
        '</div>' +

        '<p style="color:#444;font-size:0.8rem;">Contacto: <a href="https://wa.me/5352678747" style="color:#25d366;text-decoration:none;">+53 5352678747</a></p>' +
      '</div>' +

      '<style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}</style>';

    document.body.appendChild(overlay);
  }

  function showWarningTransition(data) {
    _isBlocked = false;
    var level = data.warning_level || 1;

    // Mostrar transición de advertencia
    var overlay = document.createElement('div');
    overlay.id = 'lcdc-warning-transition';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0a1a0a,#001a00,#0a0a0a);z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;opacity:0;transition:opacity 0.5s ease;';

    overlay.innerHTML =
      '<div style="text-align:center;max-width:500px;padding:40px;">' +
        '<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#15803d);display:flex;align-items:center;justify-content:center;margin:0 auto 30px;box-shadow:0 0 60px rgba(22,163,74,0.3);">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</div>' +

        '<h1 style="font-size:1.6rem;font-weight:800;margin:0 0 10px;color:#22c55e;">Acceso Permitido</h1>' +

        '<p style="font-size:0.95rem;color:#888;line-height:1.6;margin:0 0 20px;">' +
          'El administrador ha revisado su caso y permitido el acceso.<br>' +
          'Se ha determinado que fue un error involuntario.' +
        '</p>' +

        '<div style="background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:12px;padding:16px;margin-bottom:24px;">' +
          '<p style="color:#eab308;font-size:1rem;margin:0;font-weight:700;">\u26A0\uFE0F ADVERTENCIA #' + level + '</p>' +
          '<p style="color:#888;font-size:0.85rem;margin:8px 0 0;">' +
            'Tenga cuidado. Esta es su advertencia ' + level + ' de 3.<br>' +
            'Si vuelve a tener un problema de seguridad, el bloqueo sera mayor.' +
          '</p>' +
        '</div>' +

        '<div id="warning-countdown" style="color:#555;font-size:0.85rem;">Cargando pagina en <span id="warning-secs" style="color:#22c55e;font-weight:700;">5</span> segundos...</div>' +
      '</div>';

    document.body.appendChild(overlay);

    requestAnimationFrame(function() { overlay.style.opacity = '1'; });

    // Actualizar localStorage: limpiar bloqueo pero mantener advertencia
    setLocalData({
      fingerprint: data.fingerprint,
      warning_level: level,
      status: 'cleared',
      blocked_at: null,
      blocked_until: null,
      trigger_reason: data.trigger_reason,
      device_info: data.device_info || {}
    });

    // Cuenta regresiva de 5 segundos
    var secEl = overlay.querySelector('#warning-secs');
    var secsLeft = 5;
    var wInterval = setInterval(function() {
      secsLeft--;
      if (secEl) secEl.textContent = secsLeft;
      if (secsLeft <= 0) {
        clearInterval(wInterval);
        overlay.style.opacity = '0';
        setTimeout(function() {
          overlay.remove();
          // Recargar la página para cargar todo normalmente
          window.location.reload();
        }, 500);
      }
    }, 1000);
  }

  function verifyAfterExpiry() {
    var local = getLocalData();
    if (!local) { window.location.reload(); return; }

    var fp = local.fingerprint;

    // Mostrar "Verificando..." en la página de bloqueo
    var existing = document.getElementById('lcdc-block-page');
    if (existing) {
      var msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.1);color:#aaa;padding:10px 20px;border-radius:20px;font-size:0.8rem;z-index:1000000;';
      msg.textContent = 'Verificando estado con el servidor...';
      document.body.appendChild(msg);
    }

    if (_supabase && fp) {
      supabaseCheck(fp).then(function(result) {
        if (result && result.status === 'allowed') {
          // Admin permitió el acceso
          showWarningTransition({
            fingerprint: fp,
            warning_level: result.warning_level || local.warning_level || 1,
            trigger_reason: result.trigger_reason || local.trigger_reason,
            device_info: local.device_info
          });
        } else if (result && result.status === 'permanent') {
          showPermanentBanPage({
            fingerprint: fp,
            warning_level: 4,
            trigger_reason: result.trigger_reason
          });
        } else if (result && result.status === 'blocked') {
          // Aún bloqueado en Supabase - re-aplicar
          if (result.blocked_until && new Date(result.blocked_until) > new Date()) {
            setLocalData({
              fingerprint: fp,
              warning_level: result.warning_level || local.warning_level || 1,
              status: 'blocked',
              blocked_at: local.blocked_at || now(),
              blocked_until: new Date(result.blocked_until).getTime(),
              trigger_reason: result.trigger_reason || local.trigger_reason,
              device_info: local.device_info || {}
            });
            showBlockPage(getLocalData());
          } else {
            // Bloqueo expirado en Supabase pero status sigue 'blocked'
            // Admin necesita actualizar - mantener bloqueado 1h más
            setLocalData({
              fingerprint: fp,
              warning_level: result.warning_level || local.warning_level || 1,
              status: 'blocked',
              blocked_at: now(),
              blocked_until: now() + 3600000,
              trigger_reason: result.trigger_reason || local.trigger_reason,
              device_info: local.device_info || {}
            });
            showBlockPage(getLocalData());
          }
        } else {
          // No hay registro en Supabase - dejar pasar
          clearLocalData();
          window.location.reload();
        }
      });
    } else {
      // Sin Supabase - dejar pasar
      clearLocalData();
      window.location.reload();
    }
  }

  // =============================================
  // HELPERS VISUALES
  // =============================================

  function getLevelColor(level) {
    if (level >= 3) return '#dc2626';
    if (level === 2) return '#f59e0b';
    return '#3b82f6';
  }

  function getLevelColorDark(level) {
    if (level >= 3) return '#7f1d1d';
    if (level === 2) return '#92400e';
    return '#1e3a5f';
  }

  function getLevelMessage(level) {
    if (level === 1) return 'Se detecto una captura de pantalla en esta pagina. Por medidas de seguridad, el acceso ha sido bloqueado temporalmente. Comuniquese con el administrador si fue un error.';
    if (level === 2) return 'Se detecto una segunda violacion de seguridad. El bloqueo ha sido extendido. Comuniquese con el administrador para resolver esta situacion.';
    if (level === 3) return 'Se detecto una tercera violacion de seguridad. El bloqueo es de 7 dias. Si esto es un error, contacte al administrador inmediatamente. La proxima violacion sera permanente.';
    return 'Se detectaron multiples violaciones de seguridad.';
  }

  function getHavanaTime() {
    try {
      return new Date().toLocaleString('es-CU', { timeZone: 'America/Havana', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch (e) { return new Date().toLocaleTimeString(); }
  }

  // =============================================
  // 8. DETECCIÓN DE SCREENSHOTS
  // =============================================

  function initScreenshotDetection() {
    // PrintScreen
    document.addEventListener('keydown', function(e) {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerBan('screenshot (PrintScreen)');
        return false;
      }
      // Ctrl+Shift+S (Firefox)
      if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        triggerBan('screenshot (Ctrl+Shift+S)');
        return false;
      }
    }, true);

    // Keyup también (Windows)
    document.addEventListener('keyup', function(e) {
      if (e.key === 'PrintScreen') {
        triggerBan('screenshot (PrintScreen)');
      }
      // Windows + Shift + S
      if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        triggerBan('screenshot (Win+Shift+S)');
      }
      if (e.metaKey && e.key === 'PrintScreen') {
        triggerBan('screenshot (Win+PrintScreen)');
      }
    }, true);
  }

  // =============================================
  // 9. DETECCIÓN DE BOTS
  // =============================================

  function initBotDetection() {
    var ua = navigator.userAgent.toLowerCase();
    var botPatterns = ['bot', 'crawl', 'spider', 'scraper', 'headless', 'phantom', 'selenium', 'puppeteer', 'playwright'];
    var signs = [];

    for (var i = 0; i < botPatterns.length; i++) {
      if (ua.includes(botPatterns[i])) { signs.push(botPatterns[i]); break; }
    }
    if (navigator.webdriver) signs.push('webdriver');
    if (!navigator.languages || navigator.languages.length === 0) signs.push('no_languages');

    if (signs.length >= 2) {
      triggerBan('bot (' + signs.join(', ') + ')');
      return;
    }

    // Verificar movimiento de mouse después de 3s
    var hasMovement = false;
    document.addEventListener('mousemove', function() { hasMovement = true; }, { once: true });
    setTimeout(function() {
      if (!hasMovement && !('ontouchstart' in window)) {
        addSuspectAction('no_mouse');
      }
    }, 3000);
  }

  function addSuspectAction(action) {
    var t = Date.now();
    _suspectActions.push({ action: action, time: t });
    _suspectActions = _suspectActions.filter(function(a) { return t - a.time < 60000; });
    if (_suspectActions.length >= 30) {
      triggerBan('multiple_suspicious_actions');
    }
  }

  // =============================================
  // 10. ANTI-COPIA (sin ban, solo prevención)
  // =============================================

  function initAntiCopy() {
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    });
    document.addEventListener('selectstart', function(e) {
      e.preventDefault();
      return false;
    });
    document.addEventListener('copy', function(e) { e.preventDefault(); return false; });
    document.addEventListener('cut', function(e) { e.preventDefault(); return false; });
    document.addEventListener('dragstart', function(e) {
      if (e.target.tagName === 'IMG') { e.preventDefault(); return false; }
    });

    // CSS anti-selección
    var style = document.createElement('style');
    style.textContent = '*{-webkit-user-select:none!important;-moz-user-select:none!important;-ms-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;}img{-webkit-pointer-events:none!important;pointer-events:none!important;draggable:false!important;}';
    document.head.appendChild(style);

    // Anti-inspección básica
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
    }, true);
  }

  // =============================================
  // 11. INICIALIZACIÓN PRINCIPAL
  // =============================================

  async function init() {
    // Inicializar Supabase
    var supabaseOk = initSupabase();

    // Generar fingerprint
    var fp = getOrGenerateFingerprint();
    var local = getLocalData();

    // CASO 1: Ban permanente en localStorage
    if (local && local.status === 'permanent') {
      showPermanentBanPage(local);
      return;
    }

    // CASO 2: Bloqueo activo en localStorage (aún no expiró)
    if (local && local.status === 'blocked' && local.blocked_until && now() < local.blocked_until) {
      showBlockPage(local);
      return;
    }

    // CASO 3: Bloqueo expirado o status 'cleared'
    if (local && (local.status === 'cleared' || (local.blocked_until && now() >= local.blocked_until))) {
      if (local.status === 'cleared') {
        // Fue desbloqueado, solo advertencia
        setupDetection();
        return;
      }
      // Bloqueo expiró - verificar con Supabase
      if (supabaseOk && fp) {
        // Mostrar verificación mientras espera
        showVerifyOverlay();
        var result = await supabaseCheck(fp);
        document.getElementById('lcdc-verify') && document.getElementById('lcdc-verify').remove();

        if (result && result.status === 'permanent') {
          setLocalData({ fingerprint: fp, warning_level: 4, status: 'permanent', trigger_reason: result.trigger_reason });
          showPermanentBanPage({ fingerprint: fp, warning_level: 4, trigger_reason: result.trigger_reason });
          return;
        }
        if (result && result.status === 'blocked') {
          if (result.blocked_until && new Date(result.blocked_until) > new Date()) {
            setLocalData({ fingerprint: fp, warning_level: result.warning_level, status: 'blocked', blocked_at: now(), blocked_until: new Date(result.blocked_until).getTime(), trigger_reason: result.trigger_reason, device_info: local.device_info });
            showBlockPage(getLocalData());
            return;
          }
          // Bloqueo en Supabase expirado pero status sigue blocked
          showBlockPage({ fingerprint: fp, warning_level: result.warning_level || 1, status: 'blocked', blocked_at: now(), blocked_until: now() + 3600000, trigger_reason: 'Bloqueo pendiente de revision' });
          return;
        }
        if (result && result.status === 'allowed') {
          showWarningTransition({ fingerprint: fp, warning_level: result.warning_level || local.warning_level || 1, trigger_reason: result.trigger_reason || local.trigger_reason, device_info: local.device_info });
          return;
        }
        // No hay registro - dejar pasar
        clearLocalData();
      } else {
        // Sin Supabase - dejar pasar
        clearLocalData();
      }
      setupDetection();
      return;
    }

    // CASO 4: Sin registro local - verificar Supabase por si es ban permanente
    if (supabaseOk && fp) {
      try {
        var checkResult = await supabaseCheck(fp);
        if (checkResult && checkResult.status === 'permanent') {
          setLocalData({ fingerprint: fp, warning_level: 4, status: 'permanent', trigger_reason: checkResult.trigger_reason });
          showPermanentBanPage({ fingerprint: fp, warning_level: 4, trigger_reason: checkResult.trigger_reason });
          return;
        }
        if (checkResult && checkResult.status === 'blocked' && checkResult.blocked_until && new Date(checkResult.blocked_until) > new Date()) {
          setLocalData({ fingerprint: fp, warning_level: checkResult.warning_level, status: 'blocked', blocked_at: now(), blocked_until: new Date(checkResult.blocked_until).getTime(), trigger_reason: checkResult.trigger_reason });
          showBlockPage(getLocalData());
          return;
        }
      } catch (e) {
        // Error de Supabase - continuar normalmente
      }
    }

    // CASO 5: Usuario limpio - configurar detección
    setupDetection();
  }

  function showVerifyOverlay() {
    var ov = document.createElement('div');
    ov.id = 'lcdc-verify';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0a0a;z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
    ov.innerHTML =
      '<div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.1);border-top-color:#22c55e;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>' +
      '<p style="color:#666;font-size:0.85rem;">Verificando dispositivo...</p>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(ov);
  }

  function setupDetection() {
    _isBlocked = false;
    initScreenshotDetection();
    initBotDetection();
    initAntiCopy();
  }

  // =============================================
  // ARRANCAR
  // =============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
