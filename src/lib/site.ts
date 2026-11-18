export const SITE_NAME = "Knove";
export const SITE_TITLE = "Knove — 写作与作品";
export const SITE_DESCRIPTION =
  "Knove 的个人档案：关于时间与记忆的文字，以及公开的代码项目。";

export const fallbackSiteUrl = "http://localhost:4321";

/**
 * 站点现在部署在 knove.nullend.com 的域名根，`base` 为空，所以 BASE_PATH 是空字符串，
 * withBase() 退化成直通。保留这层间接是因为它让「站点搬到某个子路径」仍然只是一行配置的事：
 * 在 astro.config.mjs 里加回 base，下面所有调用会自动带上前缀。
 */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, "");

/**
 * 给站内路径拼上前缀。BASE_PATH 为空时原样返回。幂等：已经带前缀的路径不会重复拼接。
 *
 * withBase("/rss.xml")  → "/rss.xml"（子路径部署时是 "/knove/rss.xml"）
 * withBase("/")         → "/"
 */
export function withBase(path = "/"): string {
  let inner = path;
  if (BASE_PATH && (inner === BASE_PATH || inner.startsWith(`${BASE_PATH}/`))) {
    inner = inner.slice(BASE_PATH.length) || "/";
  }
  const trimmed = inner.replace(/^\/+/, "");
  if (!BASE_PATH) return `/${trimmed}`;
  return trimmed ? `${BASE_PATH}/${trimmed}` : `${BASE_PATH}/`;
}

/** 去掉 base 前缀，得到路由自身的路径。 */
export function stripBase(pathname: string): string {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length);
  }
  return pathname;
}
