# Knove

一个安静、摄影感的中文个人主页。视觉以真实雨夜车窗照片为锚点，配合暖黑纸面、宋体标题与克制的编辑式排版；首页同时容纳文章、公开项目与作者信息，文章页回到窄栏长文阅读。

> 仓库中的三篇文章是示例内容，发布前请替换为真实正文。项目区使用 Knove 的公开 GitHub 仓库，可在 `src/lib/projects.ts` 中增删。

## Stack

- Astro 7：静态构建、Markdown 内容集合
- 原生 CSS：编辑器式排版、响应式布局、轻量入场与悬停
- 无客户端框架、无后端、无数据库、无外部运行时字体
- 首页照片经过裁切与调色，提供 AVIF / WebP / JPEG 多尺寸版本

## Local development

```bash
npm install
npm run dev
```

检查与构建：

```bash
npm run check
npm run build
npm run preview
```

## Writing

文章放在 `src/content/writing/`。文件名会成为 slug，例如 `after-the-rain.md` 对应 `/writing/after-the-rain/`。

```md
---
title: "文章标题"
description: "首页列表与 SEO 使用的一句话摘要。"
date: 2026-10-18
order: 1
draft: false
---

正文使用 Markdown。
```

- `order` 越小越靠前；相同时按日期倒序。
- `draft: true` 只会在开发环境显示。
- 首页会自动读取文章标题、摘要、日期与阅读时长。

## Projects

首页的 Selected work 数据在 `src/lib/projects.ts`。每一项包含展示名称、年份、简介、技术栈和外部链接：

```ts
{
  name: "knDB",
  year: "2019",
  description: "为轻量 Node.js 应用准备的本地数据持久化工具。",
  stack: "Node.js / npm",
  href: "https://github.com/Knove/knDB",
}
```

修改数组即可更新首页项目区与项目数量。

## Site URL

正式部署时设置 `SITE_URL`，用于 canonical URL、Open Graph 与 RSS 中的绝对链接：

```bash
SITE_URL=https://your-domain.com npm run build
```

未设置时本地构建仍可正常工作，RSS 会使用当前请求地址。

## Design notes

- **真实照片优先。** 首屏使用一张真实雨夜玻璃摄影，保留真实水珠、失焦灯光与颗粒，不再用程序化 bokeh 或 CSS 水珠模拟。
- **暖黑纸面。** 背景不是纯黑，而是带一点棕色偏移的深色纸面；文字使用偏暖的象牙色。
- **单一视觉锚点。** 首页只保留一张摄影、一个主陈述、三篇文章与三个公开项目，避免效果叠加。
- **排版承担主要表现力。** 宋体标题、系统衬线小字、等宽标签形成三层节奏；不依赖发光、玻璃拟态或渐变大字。
- **真实信息优先。** 首页项目、GitHub / RSS 外链、文章数量与最近更新时间都来自实际数据，不使用虚构履历或伪出版设定。
- **克制动效。** 照片极慢呼吸、首屏文字短距离淡入，没有滚动劫持或鼠标跟随。
- **完整降级。** 无 JavaScript 时内容全部可读；支持 `prefers-reduced-motion`、键盘焦点、跳转链接与语义化结构。
- **大屏独立比例。** 从 1920px 开始根字号随视口增加，4K 下不会退化为过小的桌面截图。

## Project layout

```text
src/
  components/
    HomePage.astro         首页结构、文章索引与项目区
    PixelWordmark.astro    点阵 Knove 字标
    SiteHeader.astro       共享页头
    SiteFooter.astro       共享页脚与照片署名
  content/writing/         Markdown 文章
  layouts/                 Base / Article 布局
  lib/                     文章、项目与站点信息
  pages/                   首页、文章、RSS、404
  styles/                  全局、首页、文章页样式
public/images/             响应式首页照片与社交分享图
```

## Deployment

`npm run build` 输出纯静态文件到 `dist/`，可部署到任意静态托管服务。无需 Node 运行时。建议启用 HTTPS、长缓存静态资源，并在平台配置自定义域名后设置 `SITE_URL`。

## Credits

首页摄影：Sahil Rathod，[A rainy night](https://commons.wikimedia.org/wiki/File:A_rainy_night.jpg)，CC BY-SA 4.0。本站版本经过横向翻转、裁切与调色。详见 `THIRD_PARTY_NOTICES.md`。
