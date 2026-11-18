import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts, postPath } from "../lib/posts";
import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  fallbackSiteUrl,
  withBase,
} from "../lib/site";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  const origin = context.site ?? new URL(context.url.origin || fallbackSiteUrl);
  // 频道链接指向站点子路径本身，而不是域名根。
  const site = new URL(withBase("/"), origin);

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postPath(post),
    })),
    customData: "<language>zh-CN</language>",
  });
}
