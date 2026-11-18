import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";
import { withBase } from "./site";

export type Post = CollectionEntry<"writing">;

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection(
    "writing",
    ({ data }) => !data.draft || import.meta.env.DEV,
  );

  // 按日期倒序：Studio 里新发的文章日期是当天，自然排到最前，
  // 首页首屏的「Latest writing」也会跟着换。order 只用来决定同一天内的先后。
  return posts.sort((a, b) => {
    const byDate = b.data.date.getTime() - a.data.date.getTime();
    if (byDate !== 0) return byDate;
    return a.data.order - b.data.order;
  });
}

export function postPath(post: Post): string {
  return withBase(`/writing/${post.id}/`);
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
