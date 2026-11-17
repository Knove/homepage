import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts, postPath } from "../lib/posts";
import { SITE_DESCRIPTION, SITE_TITLE, fallbackSiteUrl } from "../lib/site";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  const site = context.site ?? new URL(context.url.origin || fallbackSiteUrl);

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
