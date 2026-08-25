(function () {
  "use strict";

  if (window.__archiveMobileNavigationReady) return;
  window.__archiveMobileNavigationReady = true;

  function directChild(element, matcher) {
    for (var index = 0; index < element.children.length; index += 1) {
      if (matcher(element.children[index])) return element.children[index];
    }
    return null;
  }

  function init() {
    var source = document.querySelector(".elementor-element-caa7734.elementor-widget-nav-menu") ||
      document.querySelector(".elementor-widget-nav-menu");
    if (!source) return;

    var desktopMenu = source.querySelector(".elementor-nav-menu--main > ul.elementor-nav-menu");
    if (!desktopMenu) return;

    source.classList.add("archive-mobile-menu-source");
    var container = directChild(source, function (child) {
      return child.classList.contains("elementor-widget-container");
    }) || source.querySelector(".elementor-widget-container");
    if (!container) return;

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "archive-mobile-menu-trigger";
    trigger.setAttribute("aria-label", "Открыть меню");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "archive-mobile-menu-drawer");
    for (var bar = 0; bar < 3; bar += 1) {
      var line = document.createElement("span");
      line.setAttribute("aria-hidden", "true");
      trigger.appendChild(line);
    }
    container.appendChild(trigger);

    var layer = document.createElement("div");
    layer.className = "archive-mobile-menu-layer";
    layer.setAttribute("aria-hidden", "true");

    var drawer = document.createElement("aside");
    drawer.className = "archive-mobile-menu-drawer";
    drawer.id = "archive-mobile-menu-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", "Меню сайта");
    drawer.setAttribute("tabindex", "-1");

    var head = document.createElement("div");
    head.className = "archive-mobile-menu-head";
    var brand = document.createElement("a");
    brand.className = "archive-mobile-menu-brand";
    brand.href = "/";
    brand.target = "_top";
    brand.textContent = "Хроники преображения Мира";
    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "archive-mobile-menu-close";
    closeButton.setAttribute("aria-label", "Закрыть меню");
    closeButton.textContent = "×";
    head.appendChild(brand);
    head.appendChild(closeButton);

    var nav = document.createElement("nav");
    nav.className = "archive-mobile-menu-nav";
    nav.setAttribute("aria-label", "Мобильное меню");
    var menu = desktopMenu.cloneNode(true);
    menu.removeAttribute("id");
    menu.className = "archive-mobile-menu-list";
    Array.prototype.forEach.call(menu.querySelectorAll("[id]"), function (element) {
      element.removeAttribute("id");
    });
    Array.prototype.forEach.call(menu.querySelectorAll("[tabindex]"), function (element) {
      element.removeAttribute("tabindex");
    });
    Array.prototype.forEach.call(menu.querySelectorAll(".dropdown-menu-toggle,.sub-arrow"), function (element) {
      element.remove();
    });

    var currentPath = (window.location.pathname.replace(/\/+$/, "") || "") + "/";
    Array.prototype.forEach.call(menu.querySelectorAll("li.menu-item-has-children"), function (item, index) {
      var link = directChild(item, function (child) { return child.tagName === "A"; });
      var submenu = directChild(item, function (child) { return child.tagName === "UL"; });
      if (!link || !submenu) return;

      var row = document.createElement("div");
      row.className = "archive-mobile-menu-row";
      item.insertBefore(row, link);
      row.appendChild(link);
      submenu.classList.add("archive-mobile-submenu");
      submenu.id = "archive-mobile-submenu-" + index;

      var toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "archive-mobile-submenu-toggle";
      toggle.setAttribute("aria-label", "Показать подразделы: " + link.textContent.trim());
      toggle.setAttribute("aria-controls", submenu.id);
      toggle.setAttribute("aria-expanded", "false");
      var arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      toggle.appendChild(arrow);
      row.appendChild(toggle);

      var linkPath = "";
      try {
        linkPath = (new URL(link.href, window.location.href).pathname.replace(/\/+$/, "") || "") + "/";
      } catch (error) {
        linkPath = "";
      }
      var shouldOpen = item.classList.contains("current-menu-item") ||
        item.classList.contains("current_page_item") ||
        Boolean(item.querySelector(".current-menu-item,.current_page_item")) ||
        (linkPath !== "/" && currentPath.indexOf(linkPath) === 0);
      if (shouldOpen) {
        item.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
      }
      toggle.addEventListener("click", function () {
        var open = item.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
    });
    nav.appendChild(menu);

    var search = document.createElement("form");
    search.className = "archive-mobile-menu-search";
    search.action = "/search";
    search.method = "get";
    search.target = "_top";
    var searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.name = "s";
    searchInput.placeholder = "Поиск по сайту";
    searchInput.setAttribute("aria-label", "Поиск по сайту");
    var searchButton = document.createElement("button");
    searchButton.type = "submit";
    searchButton.textContent = "Найти";
    search.appendChild(searchInput);
    search.appendChild(searchButton);

    var note = document.createElement("p");
    note.className = "archive-mobile-menu-note";
    note.textContent = "Авторский сайт Ирины Ниловой";
    drawer.appendChild(head);
    drawer.appendChild(nav);
    drawer.appendChild(search);
    drawer.appendChild(note);
    layer.appendChild(drawer);
    document.body.appendChild(layer);

    var lastFocused = null;
    function setOpen(open, restoreFocus) {
      if (open && !window.matchMedia("(max-width: 921px)").matches) return;
      layer.classList.toggle("is-open", open);
      layer.setAttribute("aria-hidden", String(!open));
      trigger.setAttribute("aria-expanded", String(open));
      trigger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      document.body.classList.toggle("archive-mobile-menu-open", open);
      if (open) {
        lastFocused = document.activeElement;
        window.setTimeout(function () { closeButton.focus(); }, 40);
      } else if (restoreFocus !== false && lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    trigger.addEventListener("click", function () {
      setOpen(!layer.classList.contains("is-open"));
    });
    closeButton.addEventListener("click", function () { setOpen(false); });
    layer.addEventListener("click", function (event) {
      if (event.target === layer) setOpen(false);
    });
    Array.prototype.forEach.call(menu.querySelectorAll("a"), function (link) {
      link.addEventListener("click", function () { setOpen(false, false); });
    });
    brand.addEventListener("click", function () { setOpen(false, false); });
    document.addEventListener("keydown", function (event) {
      if (!layer.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      var focusable = drawer.querySelectorAll("a[href],button:not([disabled]),input:not([disabled])");
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 921 && layer.classList.contains("is-open")) setOpen(false, false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());
