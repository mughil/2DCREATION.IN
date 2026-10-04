// The canonical homepage is https://2dcreation.in/ . /index.html is a duplicate URL
// (canonical -> /), so internal links must use / (or /#fragment), never /index.html.

const SITE_HOSTS = /^(?:www\.)?2dcreation\.in$/i;
const BASE_ORIGIN = "https://2dcreation.in";

/**
 * True when `rawHref`, found in a page located in `sourceDir` (repo-relative, "" for the
 * repository root), is an internal link to the root /index.html, with or without a #fragment
 * or ?query. External domains never match.
 */
export function isHomepageIndexLink(rawHref, sourceDir = "") {
  const value = String(rawHref ?? "").trim();
  if (!value || /^(?:mailto:|tel:|data:|blob:|javascript:|#)/i.test(value)) return false;
  const cleanDir = String(sourceDir).split("\\").join("/").split("/").filter(Boolean).join("/");
  const dir = cleanDir ? `/${cleanDir}/` : "/";
  let url;
  try {
    url = new URL(value, BASE_ORIGIN + dir);
  } catch {
    return false;
  }
  if (!SITE_HOSTS.test(url.hostname)) return false;
  return url.pathname === "/index.html";
}

export const HOMEPAGE_LINK_MESSAGE = "Internal homepage links must use / instead of /index.html";
