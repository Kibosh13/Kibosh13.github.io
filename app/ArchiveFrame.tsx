"use client";

import type { SyntheticEvent } from "react";

type ArchiveFrameProps = {
  archivePath: string;
  title: string;
};

const transparentPixel =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7";

function liveInternetUrl(documentTitle: string) {
  const display = window.screen;
  return (
    `https://counter.yadro.ru/hit?t14.7;r${escape(document.referrer)}` +
    `;s${display.width}*${display.height}*${display.colorDepth || display.pixelDepth}` +
    `;u${escape(window.location.href)}` +
    `;h${escape(documentTitle.substring(0, 150))};${Math.random()}`
  );
}

function addLiveInternetCounter(event: SyntheticEvent<HTMLIFrameElement>) {
  const frameDocument = event.currentTarget.contentDocument;
  if (!frameDocument || frameDocument.getElementById("licntFEAA")) return;

  const counterHost = frameDocument.querySelector<HTMLElement>(
    ".ekit-template-content-footer .elementor-element-30e2c47f .elementor-widget-container",
  );
  if (!counterHost) return;

  const link = frameDocument.createElement("a");
  link.className = "archive-liveinternet-counter";
  link.href = "https://www.liveinternet.ru/click";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", "Статистика LiveInternet");

  const image = frameDocument.createElement("img");
  image.id = "licntFEAA";
  image.width = 88;
  image.height = 31;
  image.style.border = "0";
  image.title =
    "LiveInternet: показано число просмотров за 24 часа, посетителей за 24 часа и за сегодня";
  image.alt = "";
  image.src = transparentPixel;

  link.append(image);
  counterHost.append(link);
  image.src = liveInternetUrl(frameDocument.title);
}

export function ArchiveFrame({ archivePath, title }: ArchiveFrameProps) {
  return (
    <main className="archive-shell">
      <iframe className="archive-frame" src={archivePath} title={title} onLoad={addLiveInternetCounter} />
    </main>
  );
}
