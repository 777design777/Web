/* Gallup & Locard — scripts du site (vanilla, sans dépendance).
   Le site reste entièrement lisible sans JavaScript :
   ces scripts ne font qu’ajouter du confort. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initHeaderShadow();
    initShotRatios();
    initReveal();
    initLightbox();
  });

  /* Menu mobile */
  function initNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var nav = document.querySelector("[data-nav]");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* Filet sous l’en-tête après défilement */
  function initHeaderShadow() {
    var header = document.querySelector("[data-header]");
    if (!header) return;
    var update = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* Ratio des images pour les galeries en rangées (.shots--rows) */
  function initShotRatios() {
    document.querySelectorAll(".shots--rows .shot").forEach(function (shot) {
      var img = shot.querySelector("img[width][height]");
      if (!img) return;
      var ratio = img.getAttribute("width") / img.getAttribute("height");
      if (ratio > 0) shot.style.setProperty("--ar", ratio.toFixed(3));
    });
  }

  /* Apparition douce des blocs au défilement */
  function initReveal() {
    var targets = document.querySelectorAll(
      ".page-head, .project-cards > li, .project__body, .project__gallery .shot, " +
      ".projects__more, .project-pager, .spirit__quote, .spirit__coda, .about__body"
    );
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    targets.forEach(function (el) {
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  /* Visionneuse : agrandit les visuels d’un même projet (groupe data-lightbox) */
  function initLightbox() {
    var dialog = document.querySelector("[data-lightbox-dialog]");
    if (!dialog || typeof dialog.showModal !== "function") return; // sans support : le lien ouvre l’image

    var img = dialog.querySelector("[data-lightbox-img]");
    var caption = dialog.querySelector("[data-lightbox-caption]");
    var prev = dialog.querySelector("[data-lightbox-prev]");
    var next = dialog.querySelector("[data-lightbox-next]");
    var group = [];
    var current = 0;
    var opener = null;

    function captionFor(link) {
      var holder = link.closest("figure, .shot");
      var text = holder && holder.querySelector("figcaption, .shot__caption");
      return text ? text.textContent.trim() : "";
    }

    function show(i) {
      current = (i + group.length) % group.length;
      var link = group[current];
      var thumb = link.querySelector("img");
      img.src = link.getAttribute("href");
      img.alt = thumb ? thumb.alt : "";
      caption.textContent = captionFor(link);
      var multi = group.length > 1;
      prev.hidden = !multi;
      next.hidden = !multi;
    }

    document.addEventListener("click", function (e) {
      var link = e.target.closest("a[data-lightbox]");
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      var name = link.getAttribute("data-lightbox");
      group = Array.prototype.slice.call(
        document.querySelectorAll('a[data-lightbox="' + name + '"]')
      );
      opener = link;
      show(group.indexOf(link));
      dialog.showModal();
      document.body.style.overflow = "hidden";
    });

    prev.addEventListener("click", function () { show(current - 1); });
    next.addEventListener("click", function () { show(current + 1); });
    dialog.querySelector("[data-lightbox-close]").addEventListener("click", function () {
      dialog.close();
    });

    // Clic sur le fond pour fermer
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener("keydown", function (e) {
      if (group.length < 2) return;
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });

    dialog.addEventListener("close", function () {
      document.body.style.overflow = "";
      img.removeAttribute("src");
      if (opener) opener.focus();
    });
  }
})();
