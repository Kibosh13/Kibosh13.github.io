import type { Metadata } from "next";
import { ArchiveFrame } from "./ArchiveFrame";
import manifest from "./archive-manifest.json";

const home = manifest["/"];

export const metadata: Metadata = {
  title: home.title,
  description: home.description,
  openGraph: {
    title: home.title,
    description: home.description,
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Хроники преображения Мира" }],
  },
  twitter: {
    card: "summary_large_image",
    title: home.title,
    description: home.description,
    images: ["/og.png"],
  },
};

export default function Home() {
  return <ArchiveFrame archivePath={home.archivePath} title={home.title} />;
}
