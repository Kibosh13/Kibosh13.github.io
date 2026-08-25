import sanitizeHtmlLibrary from "sanitize-html";

export type CmsRole = "admin" | "editor";
export type PostStatus = "draft" | "published" | "archived";

export type CmsUser = {
  id: number;
  email: string;
  displayName: string;
  role: CmsRole;
};

export type ExternalLink = {
  label: string;
  url: string;
};

const transliteration: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
  ч: "ch", ш: "sh", щ: "shh", ъ: "", ы: "y", ь: "", э: "e", ю: "ju",
  я: "ja",
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split("")
    .map((character) => transliteration[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export function sanitizePostHtml(value: string) {
  return sanitizeHtmlLibrary(value, {
    allowedTags: [
      "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
      "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption",
      "hr", "table", "thead", "tbody", "tr", "th", "td", "sup", "sub",
      "pre", "code", "div", "span",
    ],
    allowedAttributes: {
      "*": ["class", "id"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          rel: "noopener noreferrer",
        },
      }),
      img: (_tagName, attributes) => ({
        tagName: "img",
        attribs: {
          ...attributes,
          loading: attributes.loading || "lazy",
        },
      }),
    },
  });
}

export function stripHtml(value: string) {
  return sanitizeHtmlLibrary(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function parseExternalLinks(value: string): ExternalLink[] {
  const links: ExternalLink[] = [];
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("|");
    const label = separator >= 0 ? trimmed.slice(0, separator).trim() : trimmed;
    const rawUrl = separator >= 0 ? trimmed.slice(separator + 1).trim() : trimmed;
    try {
      const url = new URL(rawUrl);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      links.push({ label: label || url.hostname, url: url.toString() });
    } catch {
      continue;
    }
  }
  return links.slice(0, 30);
}

export function stringifyExternalLinks(value: string | null | undefined) {
  if (!value) return "";
  try {
    const links = JSON.parse(value) as ExternalLink[];
    return links.map((link) => `${link.label} | ${link.url}`).join("\n");
  } catch {
    return "";
  }
}

export function parseStoredLinks(value: string | null | undefined) {
  if (!value) return [] as ExternalLink[];
  try {
    const links = JSON.parse(value) as ExternalLink[];
    return Array.isArray(links) ? links : [];
  } catch {
    return [] as ExternalLink[];
  }
}

export function formatRussianDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
