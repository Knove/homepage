#!/usr/bin/env node
/**
 * 生成 public/publish-key.json。
 *
 * 把 GitHub PAT 用「发布密码」派生的密钥加密后写进这个文件，进仓库、随站点一起发布。
 * 明文 PAT 不会出现在仓库里，也不会出现在前端代码里；浏览器只有在输对密码时
 * 才解得开（AES-GCM 认证失败就等于密码错）。
 *
 *   npm run key
 *
 * PAT 建议用 fine-grained token，只勾 Knove/homepage 这一个仓库、只给
 * Contents: Read and write，有效期一年。换 PAT 时重跑一次本脚本即可。
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "publish-key.json");

const REPO = process.env.KNOVE_REPO || "Knove/homepage";
const BRANCH = process.env.KNOVE_BRANCH || "main";
const DIR = process.env.KNOVE_DIR || "src/content/writing";

const ITERATIONS = 310_000;
const MIN_PASSWORD_LENGTH = 16;

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error("需要交互式终端；也可以用 KNOVE_PAT / KNOVE_PASSWORD 环境变量传入。"));
      return;
    }

    let value = "";
    stdout.write(question);

    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
    };

    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    };

    stdin.on("data", onData);
  });
}

const encoder = new TextEncoder();

async function main() {
  const pat =
    process.env.KNOVE_PAT?.trim() ||
    (await promptHidden("GitHub PAT（输入不回显）: ")).trim();

  if (!pat) throw new Error("没拿到 PAT。");

  const password = process.env.KNOVE_PASSWORD || (await promptHidden("发布密码: "));
  const again = process.env.KNOVE_PASSWORD || (await promptHidden("再输一次: "));

  if (password !== again) throw new Error("两次密码不一致。");

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `密码至少 ${MIN_PASSWORD_LENGTH} 个字符。这个文件的密文会随站点公开，` +
        "任何人都能离线穷举，短密码等于没有密码。",
    );
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(pat),
  );

  const bundle = {
    configured: true,
    v: 1,
    repo: REPO,
    branch: BRANCH,
    dir: DIR,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS },
    salt: Buffer.from(salt).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    ct: Buffer.from(ciphertext).toString("base64"),
  };

  await writeFile(OUT, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  console.log(`\n已写入 ${path.relative(ROOT, OUT)}`);
  console.log(`目标仓库 ${REPO}@${BRANCH} → ${DIR}/`);
  console.log("提交并推送后，Studio 里就能用这个密码发布了。\n");
}

main().catch((error) => {
  console.error(`\n失败：${error.message}\n`);
  process.exit(1);
});
