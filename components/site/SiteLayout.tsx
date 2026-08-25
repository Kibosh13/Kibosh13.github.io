import { SiteHeader } from "./SiteHeader";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-page">
      <SiteHeader />
      <main className="site-content">{children}</main>
      <footer className="site-footer">© {new Date().getFullYear()} «Хроники преображения Мира»</footer>
    </div>
  );
}
