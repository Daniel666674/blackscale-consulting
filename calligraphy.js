/**
 * calligraphy.js — SVG glyph renderer for Blackscale Consulting
 *
 * Replaces <em> text inside h1/h2 headings with hand-lettered calligraphic
 * SVG glyphs. Two modes:
 *   calig--dark  → white glyphs, for use on dark/burgundy backgrounds (default)
 *   calig--light → native dark-red glyphs, for use on light/cream backgrounds
 *
 * window.applyCalligraphy() is called by translations.js after each lang switch.
 */
(function () {
  var BASE = 'glyphs/';

  // Map each character to its SVG filename in glyphs/.
  // Filenames with URL-unsafe characters are encoded here.
  var GLYPHS = {
    // Uppercase (F is absent from the glyph set)
    A: 'A.svg', B: 'B.svg', C: 'C.svg', D: 'D.svg', E: 'E.svg',
    G: 'G.svg', H: 'H.svg', I: 'I.svg', J: 'J.svg', K: 'K.svg',
    L: 'L.svg', M: 'M.svg', N: 'N.svg', O: 'O.svg', P: 'P.svg',
    Q: 'Q.svg', R: 'R.svg', S: 'S.svg', T: 'T.svg', U: 'U.svg',
    V: 'V.svg', W: 'W.svg', X: 'X.svg', Y: 'Y.svg', Z: 'Z.svg',

    // Lowercase
    a: 'am.svg', b: 'bm.svg', c: 'cm.svg', d: 'dm.svg', e: 'em.svg',
    f: 'fm.svg', g: 'gm.svg', h: 'hm.svg', i: 'im.svg', j: 'jm.svg',
    k: 'km.svg', l: 'lm.svg', m: 'mm.svg', n: 'nm.svg', o: 'om.svg',
    p: 'pm.svg', q: 'qm.svg', r: 'rm.svg', s: 'sm.svg', t: 'tm.svg',
    u: 'um.svg', v: 'vm.svg', w: 'wm.svg', x: 'xm.svg', y: 'ym.svg',
    z: 'zm.svg',

    // Digits
    '0': '0.svg', '1': '1.svg', '2': '2.svg', '3': '3.svg', '4': '4.svg',
    '5': '5.svg', '6': '6.svg', '7': '7.svg', '8': '8.svg', '9': '9.svg',

    // Punctuation & symbols (URL-encoded where necessary)
    '!': 'Admiracion.svg',
    '?': 'Pregunta.svg',
    '/': 'Slash.svg',
    '|': 'Vertical.svg',
    '#': '%23.svg',
    '%': '%25.svg',
    '+': '+.svg',
    '-': '-.svg',
    '=': '=.svg',
    '}': '%7D.svg'
  };

  // Build a span of glyph <img> elements for the given text string.
  function renderGlyphs(text, mode) {
    var wrap = document.createElement('span');
    wrap.className = 'calig calig--' + mode;
    wrap.setAttribute('aria-label', text);

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (ch === ' ' || ch === '\u00a0') {
        // Word space
        var sp = document.createElement('span');
        sp.className = 'calig__space';
        sp.setAttribute('aria-hidden', 'true');
        wrap.appendChild(sp);

      } else if (GLYPHS[ch]) {
        // Known glyph
        var img = document.createElement('img');
        img.src = BASE + GLYPHS[ch];
        img.alt = '';
        img.className = 'calig__glyph';
        img.loading = 'eager';
        img.setAttribute('aria-hidden', 'true');
        wrap.appendChild(img);

      } else {
        // Unmapped character (period, comma, accents…) — render in italic serif
        var fb = document.createElement('span');
        fb.className = 'calig__fallback';
        fb.setAttribute('aria-hidden', 'true');
        fb.textContent = ch;
        wrap.appendChild(fb);
      }
    }

    return wrap;
  }

  // Apply calligraphic rendering to every h1 em and h2 em on the page.
  function applyCalligraphy() {
    document.querySelectorAll('h1 em, h2 em').forEach(function (el) {
      var text = el.textContent;
      if (!text.trim()) return;

      // Determine color mode from nearest section/header ancestor class.
      // Sections with class .calig-light use dark-red glyphs (light bg).
      // Everything else defaults to white glyphs (dark bg).
      var ancestor = el.closest('section, header, div');
      var mode = (ancestor && ancestor.classList.contains('calig-light'))
        ? 'light'
        : 'dark';

      el.innerHTML = '';
      el.appendChild(renderGlyphs(text, mode));
    });
  }

  // Expose so translations.js can re-call after each language switch.
  window.applyCalligraphy = applyCalligraphy;

  // Initial run — translations.js already ran synchronously before this
  // DOMContentLoaded fires, so headings already contain the correct language.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCalligraphy);
  } else {
    applyCalligraphy();
  }
}());
