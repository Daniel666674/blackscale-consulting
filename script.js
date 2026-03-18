// Mobile menu toggle
const burger = document.querySelector('.nav__burger');
const mobileMenu = document.getElementById('mobileMenu');

burger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
});

// Sticky nav shadow on scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.style.boxShadow = window.scrollY > 20
    ? '0 4px 32px rgba(0,0,0,0.5)'
    : 'none';
});

// Contact form — Formspree AJAX submission
// This sends data to Formspree which emails you and can connect to your pipeline document
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    btn.textContent = 'Sending...';
    btn.disabled = true;

    const data = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        // Hide form, show success message
        form.style.display = 'none';
        if (formSuccess) {
          formSuccess.classList.add('show');
        }
      } else {
        // Show error inline
        btn.textContent = 'Something went wrong — try again';
        btn.disabled = false;
        btn.style.background = 'var(--surface-2)';
        btn.style.borderColor = 'var(--border-light)';
        btn.style.color = 'var(--muted-light)';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 3000);
      }
    } catch (err) {
      btn.textContent = 'Network error — please try again';
      btn.disabled = false;
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 3000);
    }
  });
}

// Scroll-triggered fade-in for cards and sections
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.card, .step, .metric-card, .why__list li, .founder-card, .value-card, .process-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// Floritura parallax scroll engine
// Each ornament drifts at its own speed, giving depth and a sense of movement
(function () {
  const florituras = document.querySelectorAll('.floritura');
  if (!florituras.length) return;

  // Alternating speeds — faster ones feel closer, slower ones recede
  const speeds = [0.07, 0.13, 0.05, 0.16, 0.09, 0.11, 0.06, 0.14, 0.08, 0.12, 0.07, 0.10];
  // Subtle rotation drift per pixel of scroll (mechanical, engine-like feel)
  const drifts = [0.004, -0.003, 0.005, -0.004, 0.003, -0.005, 0.004, -0.003, 0.005, -0.004, 0.003, -0.005];

  florituras.forEach((el, i) => {
    el.dataset.speed = speeds[i % speeds.length];
    el.dataset.drift = drifts[i % drifts.length];
    el.dataset.base  = el.style.transform || '';
  });

  let ticking = false;

  function update() {
    const sy = window.scrollY;
    florituras.forEach(el => {
      const translateY = sy * parseFloat(el.dataset.speed);
      const rotateDeg  = sy * parseFloat(el.dataset.drift);
      el.style.transform = el.dataset.base + ` translateY(${translateY}px) rotate(${rotateDeg}deg)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  update(); // set initial state
})();

// Back to top button
(function () {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
