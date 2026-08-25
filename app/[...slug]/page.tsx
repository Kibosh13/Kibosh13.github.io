import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveFrame } from "../ArchiveFrame";
import manifest from "../archive-manifest.json";
import { PostView } from "@/components/site/PostView";
import { getPublishedPostBySlug } from "@/db/cms";

type ArchiveRecord = {
  archivePath: string;
  title: string;
  description: string;
  kind: string;
  source: string;
};

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

const records = manifest as Record<string, ArchiveRecord>;
export const dynamic = "force-dynamic";

function routeFor(slug: string[]) {
  return `/${slug.join("/")}/`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublishedPostBySlug(slug.join("/"));
  if (post) {
    const title = post.seoTitle || post.title;
    const description = post.seoDescription || post.excerpt;
    const images = post.featuredImage ? [{ url: post.featuredImage, alt: post.featuredImageAlt || post.title }] : [];
    return {
      title,
      description,
      openGraph: { title, description, images },
      twitter: { title, description, images },
    };
  }
  const record = records[routeFor(slug)];
  if (!record) {
    return { title: "Страница не найдена — Хроники преображения Мира" };
  }
  return {
    title: record.title,
    description: record.description,
    openGraph: {
      title: record.title,
      description: record.description,
      images: [],
    },
    twitter: {
      title: record.title,
      description: record.description,
      images: [],
    },
  };
}

export default async function ArchiveRoute({ params }: PageProps) {
  const { slug } = await params;
  const post = getPublishedPostBySlug(slug.join("/"));
  if (post) return <PostView post={post} />;
  const record = records[routeFor(slug)];
  if (!record) notFound();
  return <ArchiveFrame archivePath={record.archivePath} title={record.title} />;
}
