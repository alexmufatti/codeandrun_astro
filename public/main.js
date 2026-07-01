/**
 * Code And Run — main.js
 */

(function () {
  'use strict';

  // ── Dark Mode ──────────────────────────────────────────────
  var html    = document.documentElement;
  var toggle  = document.querySelector('.js-dark-toggle');
  var icon    = toggle && toggle.querySelector('.car-dark-toggle__icon');

  function isDark() {
    return html.classList.contains('car-dark');
  }

  function setDark(dark) {
    html.classList.toggle('car-dark', dark);
    if (icon) icon.textContent = dark ? '☀️' : '🌙';
    try { localStorage.setItem('car_state', JSON.stringify({ dark: dark })); } catch (e) {}
  }

  // Init icon on load
  if (icon) icon.textContent = isDark() ? '☀️' : '🌙';

  if (toggle) {
    toggle.addEventListener('click', function () {
      setDark(!isDark());
    });
  }

  // ── Hamburger Menu ─────────────────────────────────────────
  var burger = document.querySelector('.js-hamburger');
  var drawer = document.querySelector('.js-drawer');

  if (burger && drawer) {
    // Rimuovi hidden e controlla con la classe
    drawer.removeAttribute('hidden');
    drawer.style.maxHeight = '0';
    drawer.style.overflow  = 'hidden';
    drawer.style.transition = 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)';

    burger.addEventListener('click', function () {
      var open = burger.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open);
      if (open) {
        drawer.classList.add('is-open');
        drawer.style.maxHeight = drawer.scrollHeight + 'px';
      } else {
        drawer.classList.remove('is-open');
        drawer.style.maxHeight = '0';
      }
    });

    // Chiudi drawer al click su un link
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        drawer.classList.remove('is-open');
        drawer.style.maxHeight = '0';
      });
    });
  }

  // ── Strava Block Toggle ────────────────────────────────────
  document.querySelectorAll('.js-strava-toggle').forEach(function (btn) {
    var stats  = btn.closest('.car-strava').querySelector('.js-strava-stats');
    var parent = btn.closest('.car-strava');
    if (!stats) return;

    btn.addEventListener('click', function () {
      var open = parent.classList.toggle('is-open');
      if (open) {
        stats.removeAttribute('hidden');
      } else {
        stats.setAttribute('hidden', '');
      }
    });
  });

})();
