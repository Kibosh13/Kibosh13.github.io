import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Управление сайтом — Хроники преображения Мира",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="cms-admin-root">{children}</div>;
}
