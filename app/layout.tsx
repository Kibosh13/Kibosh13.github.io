import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3001"),
  title: "Хроники преображения Мира — Авторский сайт Ирины Ниловой",
  description: "Восстановленный авторский сайт Ирины Ниловой с полным архивом материалов.",
  openGraph: {
    title: "Хроники преображения Мира",
    description: "Авторский сайт Ирины Ниловой с полным архивом материалов.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Хроники преображения Мира" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Хроники преображения Мира",
    description: "Авторский сайт Ирины Ниловой с полным архивом материалов.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/archive/hosts/xn----ctbjbaararyeivphq.xn--p1ai/wp-content/uploads/2022/01/cropped-1121-32x32.png",
    apple:
      "/archive/hosts/xn----ctbjbaararyeivphq.xn--p1ai/wp-content/uploads/2022/01/cropped-1121-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
