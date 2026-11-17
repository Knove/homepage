import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";

export type Post = CollectionEntry<"writing">;

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection(
    "writing",
    ({ data }) => !data.draft || import.meta.env.DEV,
  );

  return posts.sort((a, b) => {
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}

export function postPath(post: Post): string {
  return `/writing/${post.id}/`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  })
    .format(date)
    .replaceAll("/", ".");
}

export function getReadingMinutes(body = ""): number {
  const chineseCharacters = (body.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latinWords = (body.match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.round((chineseCharacters + latinWords * 2) / 400));
}
