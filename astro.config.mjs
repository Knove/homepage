import { defineConfig } from "astro/config";

// 站点部署在 knove.nullend.com，域名根就是站点根，所以不设 base。
// canonical / Open Graph / RSS 需要绝对地址，这里写死即可——
// 域名不再变化，就不用再让 CI 注入 SITE_URL。
const site = process.env.SITE_URL || "https://knove.nullend.com";

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  devToolbar: { enabled: false },
  build: {
    inlineStylesheets: "auto",
  },
});
