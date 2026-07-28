/* Rotating headline + reveal-on-scroll. Progressive enhancement only: with
   JavaScript off the page keeps its server-rendered first phrase and every
   section stays visible. */
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── rotating headline ───────────────────────────────────────────────────
  var typed = document.getElementById('typed');
  var counter = document.getElementById('role-counter');
  if (typed) {
    var roles = JSON.parse(typed.getAttribute('data-roles'));
    var i = 0, phase = 'hold', chars = roles[0].length, timer = null;

    function paint() {
      typed.textContent = roles[i].slice(0, chars);
      if (counter) counter.textContent = (i + 1) + ' / ' + roles.length;
    }

    function tick() {
      var full = roles[i], wait = 165;
      if (phase === 'type') {
        if (chars >= full.length) { phase = 'hold'; wait = 5200; }
        else chars++;
      } else if (phase === 'hold') {
        phase = 'erase'; wait = 120;
      } else if (chars <= 0) {
        i = (i + 1) % roles.length; phase = 'type'; wait = 700;
      } else {
        chars--; wait = 85;
      }
      paint();
      timer = setTimeout(tick, wait);
    }

    function jump(dir) {
      clearTimeout(timer);
      i = (i + dir + roles.length) % roles.length;
      chars = roles[i].length;
      phase = 'hold';
      paint();
      if (!reduced) timer = setTimeout(tick, 6000);
    }

    var prev = document.getElementById('role-prev');
    var next = document.getElementById('role-next');
    if (prev) prev.addEventListener('click', function () { jump(-1); });
    if (next) next.addEventListener('click', function () { jump(1); });
    if (!reduced) timer = setTimeout(tick, 1200);
  }

  // ── reveal on scroll ────────────────────────────────────────────────────
  var els = [].slice.call(document.querySelectorAll('[data-reveal]'));
  function showAll() { els.forEach(function (el) { el.classList.add('is-visible'); }); }
  if (reduced || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
    // Failsafe: nothing stays hidden for longer than four seconds, whatever
    // the observer thinks.
    setTimeout(showAll, 4000);
  }
})();
