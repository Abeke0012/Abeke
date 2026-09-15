(function () {
  'use strict';

  /* ---------- page loader ---------- */
  var loader = document.getElementById('pageLoader');
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (loader) loader.classList.add('is-hidden');
    }, 300);
  });

  /* ---------- header scroll state ---------- */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    if (window.scrollY > 40) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
  }
  onScroll();
  document.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobile nav ---------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', function () {
    var isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    navToggle.classList.toggle('is-active', isOpen);
  });
  mainNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- scroll reveal ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- menu tabs ---------- */
  var tabBtns = document.querySelectorAll('.tab-btn');
  var panels = document.querySelectorAll('.menu-panel');
  var indicator = document.querySelector('.tab-indicator');

  function moveIndicator(btn) {
    if (!indicator) return;
    indicator.style.width = btn.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
  }

  function revealPanelCards(panel) {
    panel.querySelectorAll('[data-reveal]').forEach(function (el) {
      el.classList.remove('is-visible');
      void el.offsetWidth;
      requestAnimationFrame(function () { el.classList.add('is-visible'); });
    });
  }

  function activateTab(tab) {
    tabBtns.forEach(function (b) {
      var active = b.dataset.tab === tab;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) moveIndicator(b);
    });
    panels.forEach(function (p) {
      var active = p.dataset.panel === tab;
      p.classList.toggle('is-active', active);
      p.hidden = !active;
      if (active) revealPanelCards(p);
    });
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { activateTab(btn.dataset.tab); });
  });

  window.addEventListener('load', function () {
    var activeBtn = document.querySelector('.tab-btn.is-active');
    if (activeBtn) moveIndicator(activeBtn);
  });
  window.addEventListener('resize', function () {
    var activeBtn = document.querySelector('.tab-btn.is-active');
    if (activeBtn) moveIndicator(activeBtn);
  });

  /* ---------- booking form (demo, no backend) ---------- */
  var form = document.getElementById('bookingForm');
  var note = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        note.textContent = 'Пожалуйста, заполните имя, телефон и дату.';
        note.classList.add('is-error');
        form.reportValidity();
        return;
      }
      var name = form.elements['name'].value.trim();
      note.classList.remove('is-error');
      note.textContent = 'Спасибо, ' + name + '! Ваш топчан почти забронирован — мы свяжемся с вами для подтверждения.';
      form.reset();
    });
  }

  /* ---------- footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
