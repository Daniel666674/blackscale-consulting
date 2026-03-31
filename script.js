
// ── Form Validation ──────────────────────────────────────────
var CALENDLY_URL = 'https://calendly.com/julian-vallejo-blackscale/30min';

var VALIDATORS = {
  required: function(val) { return val.trim().length > 0; },
  email:    function(val) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim()); },
  phone:    function(val) { return val.trim() === '' || /^[\+\d][\d\s\-\.\(\)]{5,}$/.test(val.trim()); }
};

function validateField(input) {
  var val   = input.value;
  var type  = input.dataset.validate;
  var valid = VALIDATORS[type] ? VALIDATORS[type](val) : true;

  input.classList.toggle('invalid', !valid);
  input.classList.toggle('valid',    valid && val.trim().length > 0);
  return valid;
}

function validateAll(form) {
  var fields  = form.querySelectorAll('[data-validate]');
  var allValid = true;
  var first   = null;
  fields.forEach(function(input) {
    var ok = validateField(input);
    if (!ok && !first) first = input;
    if (!ok) allValid = false;
  });
  if (first) {
    first.focus();
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return allValid;
}

// Live validation: validate on blur, clear error on input once invalid
document.querySelectorAll('[data-validate]').forEach(function(input) {
  input.addEventListener('blur', function() { validateField(this); });
  input.addEventListener('input', function() {
    if (this.classList.contains('invalid')) validateField(this);
  });
});

// ── Contact form submit ──────────────────────────────────────
var form        = document.getElementById('contactForm');
var formSuccess = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Block submit if any required field is empty/invalid
    if (!validateAll(form)) return;

    // Disable button to prevent double submit
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    var data = new FormData(form);

    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    })
    .then(function(res) {
      if (res.ok) {
        form.style.display = 'none';
        if (formSuccess) formSuccess.classList.add('show');
        // Open Calendly after successful submission
        window.open(CALENDLY_URL, '_blank');
      } else {
        if (btn) { btn.disabled = false; btn.setAttribute('data-i18n', 'btn.book_call'); btn.textContent = 'Reserva tu llamada'; }
        alert('Something went wrong. Please try again.');
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'Reserva tu llamada'; }
      alert('Network error. Please check your connection and try again.');
    });
  });
}

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
