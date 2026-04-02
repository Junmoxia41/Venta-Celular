/* ============================================
   LA CASA DEL CELULAR - Animaciones v2
   Descripción: Partículas, tilt 3D, ripple,
                scroll reveal, typing, confetti
   ============================================ */

/**
 * Inicializa el canvas de partículas en el hero.
 */
function initParticles() {
  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;
  let w, h;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.5 ? '#f4a261' : '#ffffff';
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
        this.reset();
        // Reaparecer desde un borde aleatorio
        if (Math.random() > 0.5) {
          this.x = Math.random() > 0.5 ? 0 : w;
          this.y = Math.random() * h;
        } else {
          this.x = Math.random() * w;
          this.y = Math.random() > 0.5 ? 0 : h;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function init() {
    resize();
    particles = [];
    const count = Math.min(Math.floor((w * h) / 8000), 80);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(244, 162, 97, ${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    drawLines();
    animationId = requestAnimationFrame(animate);
  }

  init();
  animate();

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animationId);
    init();
    animate();
  });
}

/**
 * Efecto tilt 3D en tarjetas de producto.
 */
function initTiltEffect() {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
    });
  });
}

/**
 * Efecto ripple en botones.
 */
function initRippleEffect() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const existingRipple = btn.querySelector('.ripple');
    if (existingRipple) existingRipple.remove();

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

/**
 * Typing effect para el subtítulo del hero.
 */
function initTypingEffect() {
  const subtitleEl = document.getElementById('hero-subtitle');
  if (!subtitleEl) return;

  const texts = [
    'Smartphones nuevos, sellados de fábrica con garantía y accesorios incluidos.',
    'Samsung, Xiaomi y Tecno al mejor precio. Entrega gratuita en Santa Clara.',
    'Tu celular ideal, a un click de distancia. ¡Contáctanos!',
  ];

  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isPaused = false;

  function type() {
    const currentText = texts[textIndex];

    if (isPaused) {
      setTimeout(type, 100);
      return;
    }

    if (!isDeleting) {
      subtitleEl.innerHTML = currentText.substring(0, charIndex + 1) + '<span class="typing-cursor"></span>';
      charIndex++;

      if (charIndex === currentText.length) {
        isPaused = true;
        setTimeout(() => { isPaused = false; isDeleting = true; type(); }, 3000);
        return;
      }
    } else {
      subtitleEl.innerHTML = currentText.substring(0, charIndex) + '<span class="typing-cursor"></span>';
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
      }
    }

    const speed = isDeleting ? 20 : 40;
    setTimeout(type, speed);
  }

  // Iniciar después de un breve delay
  setTimeout(type, 800);
}

/**
 * Barra de progreso de scroll.
 */
function initScrollProgress() {
  // Crear la barra
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = progress + '%';
        ticking = false;
      });
      ticking = true;
    }
  });
}

/**
 * Header shrink on scroll.
 */
function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastScroll = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scroll = window.scrollY;
        if (scroll > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        lastScroll = scroll;
        ticking = false;
      });
      ticking = true;
    }
  });
}

/**
 * Confetti burst al agregar al carrito.
 */
function launchConfetti(x, y) {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  const colors = ['#e63946', '#f4a261', '#25d366', '#0d1b2a', '#ffd699', '#c1121f'];
  const pieces = 20;

  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = (x + (Math.random() - 0.5) * 100) + 'px';
    piece.style.top = (y - 20) + 'px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (Math.random() * 8 + 4) + 'px';
    piece.style.height = (Math.random() * 8 + 4) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.animationDuration = (Math.random() * 0.8 + 0.6) + 's';
    piece.style.animationDelay = (Math.random() * 0.2) + 's';
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 2000);
}

/**
 * Smooth scroll reveal para secciones.
 */
function initScrollReveal() {
  const sections = document.querySelectorAll('.hero__features, .products__title, .footer__section');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    sections.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });

    // Añadir estilos cuando se revelan
    const style = document.createElement('style');
    style.textContent = `.scroll-revealed { opacity: 1 !important; transform: translateY(0) !important; }`;
    document.head.appendChild(style);
  }
}

/**
 * Agregar bounce al valor de cantidad en el modal.
 */
function animateQtyChange() {
  const qtyEl = document.getElementById('modal-qty-value');
  if (!qtyEl) return;
  qtyEl.classList.remove('bounce');
  void qtyEl.offsetWidth;
  qtyEl.classList.add('bounce');
}

/**
 * Agregar bounce al total del carrito.
 */
function animateTotalChange() {
  const totalEl = document.getElementById('cart-total');
  if (!totalEl) return;
  totalEl.classList.remove('bounce');
  void totalEl.offsetWidth;
  totalEl.classList.add('bounce');
}

/**
 * Inicializar todas las animaciones.
 */
function initAnimations() {
  initParticles();
  initTiltEffect();
  initRippleEffect();
  initTypingEffect();
  initScrollProgress();
  initHeaderScroll();
  initScrollReveal();
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}
