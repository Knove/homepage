# Knove

一个安静、摄影感的中文个人主页。视觉以真实雨夜车窗照片为锚点，配合暖黑纸面、宋体标题与克制的编辑式排版；首页同时容纳文章、公开项目与作者信息，文章页回到窄栏长文阅读。

> 仓库中的三篇文章是示例内容，发布前请替换为真实正文。项目区使用 Knove 的公开 GitHub 仓库，可在 `src/lib/projects.ts` 中增删。

## Stack

- Astro 7：静态构建、Markdown 内容集合
- 原生 CSS：编辑器式排版、响应式布局、轻量入场与悬停
- 无客户端框架、无后端、无数据库、无外部运行时字体
- 首页照片经过裁切与调色，提供 AVIF / WebP / JPEG 多尺寸版本
- 站内写作页（`/studio/`）是唯一的客户端脚本，发布走 GitHub Contents API

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

- 列表按日期倒序，所以 Studio 里新发的文章自然排在最前；同一天的文章再按 `order` 从小到大。
- `draft: true` 只会在开发环境显示。
- 首页会自动读取文章标题、摘要、日期与阅读时长。

## 在浏览器里写

`/studio/` 是站内的写作页。它复用文章页的样式（`.article-intro`、`.article-deck`、`.prose`），所以敲字时看到的排版就是发布后读者看到的排版。

- 直接在页面上改标题、摘要和正文，输入 700ms 后自动存进 localStorage，刷新不丢。
- 点「发布」→ 输发布密码 → 前端用 Contents API 提交到 `src/content/writing/<slug>.md`，剩下的交给托管平台重新构建。
- 「打开」列出仓库里已有的文章；也可以用 `/studio/?slug=after-the-rain` 直接进。
- 编辑已有文章读的是 `.md` 原文，不是渲染后的 HTML —— frontmatter 不会在往返中丢失。

客户端依赖（`marked`、`turndown`）只在 studio 页面加载，公开页面仍然没有 JavaScript。

### 发布密码

发布密码保护的是仓库写权限的 PAT。明文 PAT 不会进仓库，也不会出现在前端代码里：

```bash
npm run key
```

依次输入 GitHub PAT 和密码，脚本用 PBKDF2-SHA256（310k 次）从密码派生密钥，AES-GCM 加密 PAT，写出 `public/publish-key.json`（只有 salt、iv 和密文）。浏览器输对密码才解得开，密码错时 GCM 认证直接失败。

- PAT 用 fine-grained token，只勾 `Knove/homepage` 这一个仓库、只给 **Contents: Read and write**，有效期设一年。
- **密码至少 16 位随机字符。** 这个 JSON 会随站点公开，任何人都能离线穷举，短密码等于没有密码。
- 换 PAT 时重跑一次 `npm run key` 再提交。

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

## 地址与 SITE_URL

站点部署在 `knove.nullend.com` 的域名根，所以 `astro.config.mjs` **不设 `base`**。站内绝对路径仍然经过 `src/lib/site.ts` 的 `withBase()`，此时它原样返回 —— 保留这层间接是为了让「搬到某个子路径」仍然只是一行配置的事：

```js
// astro.config.mjs —— 想改成 nullend.com/knove 就加回这一行，其余不用动
base: "/knove",
```

域名单独写在 `astro.config.mjs` 的 `site`，用于 canonical、Open Graph 与 RSS 里的绝对链接，默认 `https://knove.nullend.com`。换域名时改这一处；设 `SITE_URL` 环境变量可以临时覆盖。

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
  lib/                     文章、项目与站点信息（withBase 在 site.ts）
  pages/                   首页、文章、RSS、404、写作页
  scripts/studio.ts        写作页的客户端脚本
  styles/                  全局、首页、文章页、写作页样式
public/images/             响应式首页照片与社交分享图
public/publish-key.json    加密后的发布凭据（npm run key 生成）
scripts/make-key.mjs       生成上面那个文件
```

仓库里**没有 deploy 脚本，也没有 GitHub Actions** —— 构建交给托管平台，推上去它自己会跑。

## Deployment

推 GitHub `main` 即上线。托管平台（EdgeOne）监听仓库，自己 `npm ci` → `npm run build`（含 `astro check`）→ 发布。

写文章和改代码走的是**同一条流水线**：Studio 发布本身就是一次 commit，所以不需要给内容单独做一条路径。

**一次性配置**

1. 在腾讯云 EdgeOne 新建站点，**连接 Git 仓库** `Knove/homepage`，分支 `main`。
2. 构建配置：安装 `npm ci`，构建 `npm run build`，输出目录 `dist`。Node 版本 `22`。
3. 绑自定义域名 `knove.nullend.com`，DNS 加一条 CNAME 指向平台给的地址。证书自动签发。
4. 确认 404 走的是站点自己的 `404.html`（构建产物里有），而不是平台默认页。

**缓存**：带 hash 的 `_astro/` 和 `images/` 由平台默认策略处理，HTML 不缓存 —— 所以**发布后不需要手动刷新 CDN**。

产物 1.6MB，每次全量构建，不做增量优化 —— 那是这个体量下最划算的选择。

## 为什么不用自己的服务器

三条需求（站内所见即所得写、密码确认后直接发布、推代码即更新）没有一条需要常驻后端。托管平台省掉的是**持续性**维护：系统补丁、证书续期、nginx 配置、SSH key 轮换、机器本身。代价只是内容必须进 git —— 而这恰好是需求 3 想要的。

## Credits

首页摄影：Sahil Rathod，[A rainy night](https://commons.wikimedia.org/wiki/File:A_rainy_night.jpg)，CC BY-SA 4.0。本站版本经过横向翻转、裁切与调色。详见 `THIRD_PARTY_NOTICES.md`。
