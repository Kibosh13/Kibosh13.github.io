"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

const links = [
  ["Главная", "/"],
  ["О нас", "/biography/"],
  ["Новости", "/category/news/"],
  ["Книги", "/books/"],
  ["Творчество", "/category/creation/"],
  ["Видео", "/video/"],
  ["Мероприятия", "/category/meropriyatiya/"],
  ["Блоги", "/category/blog/"],
  ["Поиск", "/search/"],
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("site-mobile-menu-open");
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("site-mobile-menu-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <Link className="site-logo" href="/">Хроники<br />преображения<br />Мира</Link>
      <nav className="site-navigation" aria-label="Главное меню">
        {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
      </nav>
      <button
        className="site-menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label="Открыть меню"
        onClick={() => setMenuOpen(true)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <div
        className={`site-mobile-menu-layer${menuOpen ? " is-open" : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <button
          className="site-mobile-menu-backdrop"
          type="button"
          aria-label="Закрыть меню"
          onClick={closeMenu}
        />
        <aside
          className="site-mobile-menu"
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-label="Меню сайта"
        >
          <div className="site-mobile-menu-head">
            <Link href="/" onClick={closeMenu}>Хроники преображения Мира</Link>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Закрыть меню"
              onClick={closeMenu}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <nav aria-label="Мобильное меню">
            {links.map(([label, href], index) => (
              <Link href={href} key={href} onClick={closeMenu}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {label}
              </Link>
            ))}
          </nav>
          <p>Авторский сайт Ирины Ниловой</p>
        </aside>
      </div>
    </header>
  );
}
