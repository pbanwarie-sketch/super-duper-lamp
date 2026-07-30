(function () {
'use strict';
var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
var nav = document.querySelector('.site-nav');
var navLinks = [].slice.call(document.querySelectorAll('[data-nav]'));
var bar = document.querySelector('.scroll-progress i');
var ids = [];
navLinks.forEach(function (a) {
var id = a.getAttribute('data-nav');
if (ids.indexOf(id) < 0 && document.getElementById(id)) ids.push(id);
});
function measureNav() {
if (nav) {
document.documentElement.style.setProperty('--nav-h', Math.round(nav.offsetHeight) + 'px');
}
}
var queued = false;
function paintNav() {
queued = false;
var y = window.pageYOffset;
var doc = document.documentElement;
if (bar) {
var max = doc.scrollHeight - window.innerHeight;
bar.style.width = (max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0) + '%';
}
var line = y + (nav ? nav.offsetHeight : 0) + 24;
var current = null;
ids.forEach(function (id) {
var el = document.getElementById(id);
if (el && el.getBoundingClientRect().top + y <= line) current = id;
});
if (y + window.innerHeight >= doc.scrollHeight - 2 && ids.length) current = ids[ids.length - 1];
navLinks.forEach(function (a) {
var on = a.getAttribute('data-nav') === current;
a.classList.toggle('is-active', on);
if (on) a.setAttribute('aria-current', 'true');
else a.removeAttribute('aria-current');
});
}
function onScroll() {
if (!queued) { queued = true; window.requestAnimationFrame(paintNav); }
}
function focusSection() {
var id = location.hash.slice(1);
if (!id) return;
var el = document.getElementById(id);
if (!el) return;
if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
}
function openIfTargeted() {
if (location.hash !== '#ai-disclosure') return;
var box = document.querySelector('#ai-disclosure details');
if (box) box.open = true;
}
measureNav();
openIfTargeted();
paintNav();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', function () { measureNav(); onScroll(); });
window.addEventListener('hashchange', function () { openIfTargeted(); focusSection(); onScroll(); });
if (location.hash) setTimeout(focusSection, 0);
var themeBtn = document.querySelector('.theme-toggle');
var mqlLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
var THEME_BG = { dark: '#05080F', light: '#FFFFFF' };
function themeNow() {
var t = document.documentElement.getAttribute('data-theme');
if (t === 'light' || t === 'dark') return t;
return mqlLight && mqlLight.matches ? 'light' : 'dark';
}
function paintTheme() {
var t = themeNow();
var metas = document.querySelectorAll('meta[name="theme-color"]');
for (var m = 0; m < metas.length; m++) metas[m].setAttribute('content', THEME_BG[t]);
if (themeBtn) {
themeBtn.setAttribute(
'aria-label',
themeBtn.getAttribute(t === 'dark' ? 'data-to-light' : 'data-to-dark')
);
}
}
if (themeBtn) {
themeBtn.addEventListener('click', function () {
var next = themeNow() === 'dark' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', next);
try { localStorage.setItem('theme', next); } catch (err) {}
paintTheme();
});
}
if (mqlLight && mqlLight.addEventListener) mqlLight.addEventListener('change', paintTheme);
paintTheme();
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
setTimeout(showAll, 4000);
}
})();
