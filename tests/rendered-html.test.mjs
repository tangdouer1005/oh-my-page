import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished start page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>起始页<\/title>/);
  assert.match(html, /Google/);
  assert.match(html, /常用网站/);
  assert.match(html, /工作/);
  assert.match(html, /日常/);
  assert.match(html, /GitHub/);
  assert.match(html, /alphaXiv/);
  assert.match(html, /LINUX DO/);
  assert.match(html, /抖音/);
  assert.match(html, /小红书/);
  assert.match(html, />X</);
  assert.match(html, /编辑/);
  assert.match(html, /黑夜/);
  assert.match(html, /Apple/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("includes local configuration and start-page interactions", async () => {
  const [page, layout, staticHtml, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /localStorage\.setItem/);
  assert.match(page, /google.*baidu.*bing/s);
  assert.match(page, /draggable=\{editing\}/);
  assert.match(page, /COLLAPSE_KEY/);
  assert.match(page, /THEME_KEY/);
  assert.match(page, /STYLE_KEY/);
  assert.match(page, /prefers-color-scheme: dark/);
  assert.match(page, /ALPHAXIV_MIGRATION_KEY/);
  assert.match(page, /POPULAR_SITES_MIGRATION_KEY/);
  assert.match(page, /X_SITE_MIGRATION_KEY/);
  assert.match(page, /category: CategoryKey/);
  assert.match(page, /aria-expanded=\{!isCollapsed\}/);
  assert.match(page, /exportConfig/);
  assert.match(page, /importConfig/);
  assert.match(page, /openInNewTab/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /dataset\.theme/);
  assert.match(layout, /dataset\.style/);
  assert.match(staticHtml, /dataset\.theme/);
  assert.match(staticHtml, /dataset\.style/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
