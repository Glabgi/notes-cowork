/* Учебная копия nalog.gov.ru — только фронтенд.
   Ничего не отправляется на сервер, localStorage не используется. */
(function () {
  "use strict";

  /* ---------- Toast (общая заглушка действий) ---------- */
  var toast = document.getElementById("toast");
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.setAttribute("data-show", "true");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.setAttribute("data-show", "false");
    }, 2600);
  }

  /* ---------- Выбор региона ---------- */
  var regionBtn = document.querySelector(".region-btn");
  var regionMenu = document.getElementById("region-menu");
  if (regionBtn && regionMenu) {
    regionBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = regionMenu.getAttribute("data-open") === "true";
      regionMenu.setAttribute("data-open", String(!open));
      regionBtn.setAttribute("aria-expanded", String(!open));
    });
    regionMenu.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-region]");
      if (!b) return;
      var label = regionBtn.querySelector(".region-label");
      if (label) label.textContent = b.textContent;
      regionMenu.setAttribute("data-open", "false");
      regionBtn.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("click", function () {
      regionMenu.setAttribute("data-open", "false");
      regionBtn.setAttribute("aria-expanded", "false");
    });
  }

  /* ---------- Мобильное меню (бургер) ---------- */
  var burger = document.querySelector(".burger");
  var mobileNav = document.getElementById("mobile-nav");
  var navOverlay = document.getElementById("nav-overlay");
  function setNav(open) {
    if (!mobileNav) return;
    mobileNav.setAttribute("data-open", String(open));
    if (navOverlay) navOverlay.setAttribute("data-open", String(open));
    if (burger) burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (burger) burger.addEventListener("click", function () {
    setNav(mobileNav.getAttribute("data-open") !== "true");
  });
  if (navOverlay) navOverlay.addEventListener("click", function () { setNav(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setNav(false);
  });

  /* ---------- Поиск: валидация + заглушка ---------- */
  document.querySelectorAll("form[data-mock]").forEach(function (form) {
    var note = form.parentNode.querySelector(".form-note");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input[required], input[type=search], input[type=text]");
      if (input && !input.value.trim()) {
        if (note) note.textContent = "Введите запрос для поиска.";
        input.focus();
        input.setAttribute("aria-invalid", "true");
        return;
      }
      if (input) input.removeAttribute("aria-invalid");
      if (note) note.textContent = "";
      var what = input ? input.value.trim() : "";
      showToast(what ? "Поиск (демо): «" + what + "»" : "Форма отправлена (демо)");
    });
    form.addEventListener("input", function () {
      if (note) note.textContent = "";
    });
  });

  /* ---------- Аккордеоны ---------- */
  document.querySelectorAll(".acc-item__btn").forEach(function (btn) {
    var panel = btn.nextElementSibling;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      if (panel) panel.style.maxHeight = open ? null : panel.scrollHeight + "px";
    });
  });

  /* ---------- Слайдеры ---------- */
  document.querySelectorAll("[data-slider]").forEach(function (root) {
    var track = root.querySelector(".slider__track");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".slide"));
    var dotsWrap = root.querySelector(".slider__dots");
    var prev = root.querySelector(".slider__arrow--prev");
    var next = root.querySelector(".slider__arrow--next");
    var i = 0, timer;
    var auto = root.getAttribute("data-autoplay") === "true";

    var dots = [];
    if (dotsWrap) {
      slides.forEach(function (_, idx) {
        var d = document.createElement("button");
        d.type = "button";
        d.setAttribute("aria-label", "Слайд " + (idx + 1));
        d.addEventListener("click", function () { go(idx); });
        dotsWrap.appendChild(d);
        dots.push(d);
      });
    }

    function render() {
      track.style.transform = "translateX(" + (-i * 100) + "%)";
      dots.forEach(function (d, idx) {
        d.setAttribute("aria-current", String(idx === i));
      });
    }
    function go(n) { i = (n + slides.length) % slides.length; render(); restart(); }
    function restart() {
      if (!auto) return;
      clearInterval(timer);
      timer = setInterval(function () { go(i + 1); }, 5000);
    }

    if (prev) prev.addEventListener("click", function () { go(i - 1); });
    if (next) next.addEventListener("click", function () { go(i + 1); });
    root.addEventListener("mouseenter", function () { clearInterval(timer); });
    root.addEventListener("mouseleave", restart);
    render();
    restart();
  });

  /* ---------- Мелкие action-заглушки ---------- */
  document.querySelectorAll("[data-action]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      showToast(el.getAttribute("data-action") + " — раздел в демо-версии недоступен");
    });
  });

})();
