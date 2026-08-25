import Link from "next/link";

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
  return (
    <header className="site-header">
      <Link className="site-logo" href="/">Хроники<br />преображения<br />Мира</Link>
      <nav className="site-navigation" aria-label="Главное меню">
        {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
      </nav>
    </header>
  );
}
