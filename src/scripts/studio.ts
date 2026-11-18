import { marked } from "marked";
import TurndownService from "turndown";
import { withBase } from "../lib/site";

/**
 * Studio：在站点内部写作。
 *
 * 编辑区复用文章页的 CSS（.article-intro / .article-deck / .prose），
 * 所以敲字时看到的排版就是发布后读者看到的排版。
 *
 * 发布是一次 GitHub Contents API 提交：明文 PAT 用发布密码派生的密钥加密后
 * 存放在 public/publish-key.json，只有输对密码才解得开。
 */

const DEFAULT_REPO = "Knove/homepage";
const DEFAULT_BRANCH = "main";
const DEFAULT_DIR = "src/content/writing";
const DEFAULT_ORDER = 999;
const DRAFT_PREFIX = "knove:draft:";

interface PublishKey {
  configured?: boolean;
  repo?: string;
  branch?: string;
  dir?: string;
  kdf?: { name: string; hash: string; iterations: number };
  salt?: string;
  iv?: string;
  ct?: string;
}

interface Draft {
  slug: string;
  title: string;
  description: string;
  date: string;
  order: number;
  body: string;
  savedAt: number;
}

const titleEl = document.getElementById("field-title");
const deckEl = document.getElementById("field-deck");
const bodyEl = document.getElementById("field-body");
const dateEl = document.getElementById("field-date") as HTMLInputElement | null;
const slugEl = document.getElementById("field-slug") as HTMLInputElement | null;
const readEl = document.getElementById("field-read");
const modeEl = document.getElementById("studio-mode");
const saveStateEl = document.getElementById("studio-save-state");

const publishDialog = document.getElementById("publish-dialog") as HTMLDialogElement | null;
const publishPassword = document.getElementById("publish-password") as HTMLInputElement | null;
const publishStatus = document.getElementById("publish-status");
const publishTarget = document.getElementById("publish-target");

const openDialog = document.getElementById("open-dialog") as HTMLDialogElement | null;
const openStatus = document.getElementById("open-status");
const openList = document.getElementById("open-list");

const editorReady =
  titleEl && deckEl && bodyEl && dateEl && slugEl && readEl && modeEl && saveStateEl;

let publishKey: PublishKey | null = null;
let currentOrder = DEFAULT_ORDER;
let saveTimer: number | undefined;
let dirty = false;

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

/* ---------- 工具 ---------- */

function todayISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readingMinutes(text: string): number {
  const chinese = (text.match(/[㐀-鿿]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z0-9]+/g) ?? []).length;
  return Math.max(1, Math.round((chinese + latin * 2) / 400));
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64Utf8(text: string): string {
  return toBase64(new TextEncoder().encode(text));
}

function setSaveState(text: string) {
  if (saveStateEl) saveStateEl.textContent = text;
}

/* ---------- 草稿 ---------- */

function draftKey(slug: string): string {
  return `${DRAFT_PREFIX}${slug}`;
}

function readDraft(slug: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function currentDraft(): Draft {
  return {
    slug: slugEl?.value.trim() || todayISO(),
    title: titleEl?.innerText.trim() ?? "",
    description: deckEl?.innerText.trim() ?? "",
    date: dateEl?.value || todayISO(),
    order: currentOrder,
    body: bodyEl?.innerHTML ?? "",
    savedAt: Date.now(),
  };
}

function persist() {
  if (!editorReady || dirty === false) return;
  try {
    localStorage.setItem(draftKey(currentDraft().slug), JSON.stringify(currentDraft()));
    setSaveState(`已保存 ${new Date().toLocaleTimeString("zh-CN", { hour12: false }).slice(0, 5)}`);
  } catch {
    setSaveState("草稿存不下（localStorage 已满）");
  }
}

function scheduleSave() {
  dirty = true;
  setSaveState("未保存");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persist, 700);
}

function fill(draft: Draft) {
  if (!editorReady) return;
  titleEl!.textContent = draft.title;
  deckEl!.textContent = draft.description;
  bodyEl!.innerHTML = draft.body;
  dateEl!.value = draft.date || todayISO();
  slugEl!.value = draft.slug;
  currentOrder = draft.order ?? DEFAULT_ORDER;
  refreshRead();
}

/* ---------- 视图 ---------- */

function refreshRead() {
  if (!readEl || !bodyEl) return;
  readEl.textContent = `${readingMinutes(bodyEl.innerText)} 分钟阅读`;
}

function currentSlug(): string {
  return (slugEl?.value ?? "").trim() || todayISO();
}

/* ---------- Markdown ---------- */

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) continue;
    const key = pair[1];
    let value = pair[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value) as string;
      } catch {
        value = value.slice(1, -1);
      }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/''/g, "'");
    }
    data[key] = value;
  }

  return { data, body: raw.slice(match[0].length) };
}

function buildMarkdown(): string {
  const draft = currentDraft();
  const body = turndown.turndown(draft.body).trim();
  const front = [
    "---",
    `title: ${JSON.stringify(draft.title)}`,
    `description: ${JSON.stringify(draft.description)}`,
    `date: ${draft.date}`,
    `order: ${draft.order}`,
    "draft: false",
    "---",
  ].join("\n");
  return `${front}\n\n${body}\n`;
}

/* ---------- 发布密钥 ---------- */

async function getPublishKey(): Promise<PublishKey> {
  if (publishKey) return publishKey;
  const response = await fetch(withBase("/publish-key.json"), { cache: "no-store" });
  publishKey = response.ok ? ((await response.json()) as PublishKey) : { configured: false };
  return publishKey;
}

async function decryptPat(key: PublishKey, password: string): Promise<string | null> {
  if (!key.salt || !key.iv || !key.ct || !key.kdf) return null;

  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(key.salt),
      iterations: key.kdf.iterations,
      hash: key.kdf.hash,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(key.iv) },
      aesKey,
      fromBase64(key.ct),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/* ---------- GitHub ---------- */

function repoOf(key: PublishKey | null) {
  return {
    repo: key?.repo || DEFAULT_REPO,
    branch: key?.branch || DEFAULT_BRANCH,
    dir: key?.dir || DEFAULT_DIR,
  };
}

async function loadExisting(slug: string): Promise<void> {
  const { repo, branch, dir } = repoOf(await getPublishKey());
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${dir}/${slug}.md`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    setSaveState(`没找到 ${slug}.md（${response.status}）`);
    return;
  }

  const { data, body } = parseFrontmatter(await response.text());
  currentOrder = Number(data.order) || DEFAULT_ORDER;

  fill({
    slug,
    title: data.title ?? "",
    description: data.description ?? "",
    date: (data.date ?? todayISO()).slice(0, 10),
    order: currentOrder,
    body: marked.parse(body, { async: false }) as string,
    savedAt: Date.now(),
  });

  dirty = false;
  setSaveState("已载入仓库版本");
  if (modeEl) modeEl.textContent = "编辑中";
}

async function submit(slug: string, markdown: string, pat: string): Promise<string> {
  const { repo, branch, dir } = repoOf(await getPublishKey());
  const api = `https://api.github.com/repos/${repo}/contents/${dir}/${slug}.md`;
  const headers = {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  const existing = await fetch(`${api}?ref=${branch}`, { headers });
  let sha: string | undefined;
  if (existing.ok) {
    sha = ((await existing.json()) as { sha: string }).sha;
  } else if (existing.status !== 404) {
    throw new Error(`读取失败 ${existing.status}`);
  }

  const response = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: sha ? `content: 更新 ${slug}` : `content: 新增 ${slug}`,
      content: base64Utf8(markdown),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(`${response.status} ${detail.message ?? ""}`.trim());
  }

  return `${repo}/blob/${branch}/${dir}/${slug}.md`;
}

/* ---------- 事件 ---------- */

function bindEditor() {
  if (!editorReady) return;

  for (const el of [titleEl!, deckEl!, bodyEl!, slugEl!, dateEl!]) {
    el.addEventListener("input", () => {
      scheduleSave();
      if (el === bodyEl) refreshRead();
    });
  }

  // 单行字段：粘贴时只取纯文本，避免带进外部样式。
  for (const el of [titleEl!, deckEl!]) {
    el.addEventListener("paste", (event) => {
      const clipboard = (event as ClipboardEvent).clipboardData;
      if (!clipboard) return;
      event.preventDefault();
      document.execCommand("insertText", false, clipboard.getData("text/plain").replace(/\s+/g, " "));
    });
  }

  // 正文：粘贴纯文本并按空行切段，外部富文本的样式一律丢掉。
  bodyEl!.addEventListener("paste", (event) => {
    const clipboard = (event as ClipboardEvent).clipboardData;
    if (!clipboard) return;
    event.preventDefault();
    const html = clipboard
      .getData("text/plain")
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
      .join("");
    document.execCommand("insertHTML", false, html);
    scheduleSave();
    refreshRead();
  });

  // 回车产生 <p>，让编辑区和文章页的段落间距一致。
  try {
    document.execCommand("defaultParagraphSeparator", false, "p");
  } catch {
    /* 老浏览器忽略即可，turndown 仍会把 div 转成段落 */
  }
}

function bindBar() {
  document.getElementById("btn-publish")?.addEventListener("click", () => {
    if (!publishDialog || !publishTarget) return;
    publishTarget.textContent = `将写入 src/content/writing/${currentSlug()}.md`;
    if (publishStatus) publishStatus.textContent = "";
    if (publishPassword) publishPassword.value = "";
    if (!publishDialog.open) publishDialog.showModal();
    publishPassword?.focus();
  });

  document.getElementById("btn-open")?.addEventListener("click", () => {
    void openListDialog();
  });
}

async function openListDialog() {
  if (!openDialog) return;
  if (!openDialog.open) openDialog.showModal();
  if (!openList || !openStatus) return;

  openList.replaceChildren();
  openStatus.textContent = "正在读取列表…";

  try {
    const { repo, branch, dir } = repoOf(await getPublishKey());
    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents/${dir}?ref=${branch}`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!response.ok) throw new Error(String(response.status));

    const entries = (await response.json()) as { name: string }[];
    const slugs = entries
      .filter((entry) => entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, ""))
      .sort();

    openStatus.textContent = slugs.length ? "选一篇继续。" : "仓库里还没有文章。";

    for (const slug of slugs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "studio-list-item";
      button.textContent = slug;
      button.addEventListener("click", () => {
        window.location.search = `?slug=${encodeURIComponent(slug)}`;
      });
      openList.append(button);
    }
  } catch (error) {
    openStatus.textContent = `读取失败：${(error as Error).message}`;
  }
}

function bindPublish() {
  if (!publishDialog || !publishPassword) return;

  const confirmButton = document.getElementById("publish-confirm") as HTMLButtonElement | null;
  document
    .getElementById("publish-cancel")
    ?.addEventListener("click", () => publishDialog.close());

  confirmButton?.addEventListener("click", () => {
    void runPublish(publishPassword.value, confirmButton);
  });

  publishPassword.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    confirmButton?.click();
  });

  document.getElementById("open-close")?.addEventListener("click", () => {
    openDialog?.close();
  });
}

async function runPublish(password: string, button: HTMLButtonElement | null) {
  if (!publishStatus || !editorReady) return;

  const fail = (message: string) => {
    publishStatus.textContent = message;
    setSaveState("发布失败");
  };

  const slug = currentSlug();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    fail("地址只能用小写字母、数字和连字符");
    return;
  }
  if (!titleEl!.innerText.trim()) {
    fail("先写个标题");
    return;
  }

  if (button) button.disabled = true;
  publishStatus.textContent = "";
  setSaveState("正在发布…");

  try {
    const key = await getPublishKey();
    if (!key.configured) throw new Error("还没配置发布密钥（在本地跑一次 npm run key）");

    const pat = await decryptPat(key, password);
    if (!pat) throw new Error("密码不对");

    await submit(slug, buildMarkdown(), pat);

    localStorage.removeItem(draftKey(slug));
    dirty = false;
    setSaveState(
      `已发布 ${new Date().toLocaleTimeString("zh-CN", { hour12: false }).slice(0, 5)} · 约一分钟上线`,
    );
    if (modeEl) modeEl.textContent = "已发布";
    publishDialog?.close();
  } catch (error) {
    fail((error as Error).message);
  } finally {
    if (button) button.disabled = false;
  }
}

/* ---------- 启动 ---------- */

async function start() {
  if (!editorReady) return;

  bindEditor();
  bindBar();
  bindPublish();
  dateEl!.value = todayISO();
  refreshRead();

  const params = new URLSearchParams(window.location.search);
  const requested = params.get("slug");

  if (requested) {
    slugEl!.value = requested;
    const draft = readDraft(requested);
    if (draft) {
      fill(draft);
      setSaveState("已恢复本地草稿");
      if (modeEl) modeEl.textContent = "编辑中";
    } else {
      await loadExisting(requested);
    }
    return;
  }

  const draft = readDraft(todayISO());
  if (draft && draft.title) {
    fill(draft);
    setSaveState("已恢复本地草稿");
  } else {
    slugEl!.value = todayISO();
    setSaveState("未保存");
    titleEl!.focus();
  }
}

void start();
