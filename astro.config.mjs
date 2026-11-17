import { defineConfig } from "astro/config";

const site = process.env.SITE_URL;

export default defineConfig({
  ...(site ? { site } : {}),
  output: "static",
  trailingSlash: "always",
  devToolbar: { enabled: false },
  build: {
    inlineStylesheets: "auto",
  },
});
