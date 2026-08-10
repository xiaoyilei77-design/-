import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
  FEISHU_APP_ID: "test-app-id",
  FEISHU_APP_SECRET: "test-app-secret",
  FEISHU_BASE_TOKEN: "test-base-token",
  FEISHU_TABLE_ID: "test-table-id",
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders the Chinese product page with registration deferred to the experience invite", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/", {
    headers: { accept: "text/html" },
  }), env, ctx);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /方言语音控制开关/);
  assert.match(html, /体验邀请/);
  assert.match(html, /点击登记/);
  assert.doesNotMatch(html, /name="name"/);
  assert.doesNotMatch(html, /name="phone"/);
  assert.doesNotMatch(html, /name="address"/);
  assert.doesNotMatch(html, /信息去向|安全写入|飞书/);
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.doesNotMatch(html, /V01/i);
});

test("opens the Chinese registration form from the experience invite modal", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /onClick=\{openRegistration\}/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /抢先体验登记/);
  assert.match(source, /name="name"/);
  assert.match(source, /name="phone"/);
  assert.match(source, /name="address"/);
  assert.match(source, /name="consent"/);
  assert.match(source, /提交体验意向/);
  assert.match(source, /xiaoyilei77-design\.github\.io/);
  assert.match(source, /fangyan-voice-switch\.xiaoyilei77\.chatgpt\.site\/api\/preorder/);
  assert.doesNotMatch(source, /信息去向|安全写入飞书|写入飞书多维表格/);
});

test("rejects malformed and cross-origin preorder submissions", async () => {
  const worker = await loadWorker();
  const malformed = await worker.fetch(new Request("http://localhost/api/preorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost",
      "cf-connecting-ip": "198.51.100.21",
    },
    body: JSON.stringify({ name: "张", phone: "123", address: "短", consent: true }),
  }), env, ctx);
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { message: "姓名需为 2 至 30 个字符。" });

  const crossOrigin = await worker.fetch(new Request("http://localhost/api/preorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://example.com",
      "cf-connecting-ip": "198.51.100.22",
    },
    body: JSON.stringify({
      name: "测试用户",
      phone: "13800138000",
      address: "广东省汕头市测试地址",
      consent: true,
    }),
  }), env, ctx);
  assert.equal(crossOrigin.status, 403);
  assert.deepEqual(await crossOrigin.json(), { message: "请求来源无效。" });

  const githubOrigin = await worker.fetch(new Request("http://localhost/api/preorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://xiaoyilei77-design.github.io",
      "cf-connecting-ip": "198.51.100.25",
    },
    body: JSON.stringify({ name: "张", phone: "123", address: "短", consent: true }),
  }), env, ctx);
  assert.equal(githubOrigin.status, 400);
  assert.equal(githubOrigin.headers.get("access-control-allow-origin"), "https://xiaoyilei77-design.github.io");
  assert.deepEqual(await githubOrigin.json(), { message: "姓名需为 2 至 30 个字符。" });

  const oversized = await worker.fetch(new Request("http://localhost/api/preorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost",
      "cf-connecting-ip": "198.51.100.24",
    },
    body: JSON.stringify({
      name: "测试用户",
      phone: "13800138000",
      address: "广".repeat(5000),
      consent: true,
    }),
  }), env, ctx);
  assert.equal(oversized.status, 413);
  assert.deepEqual(await oversized.json(), { message: "提交内容过长。" });
});

test("silently absorbs honeypot submissions without contacting Feishu", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/api/preorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost",
      "cf-connecting-ip": "198.51.100.23",
    },
    body: JSON.stringify({
      name: "自动脚本",
      phone: "13800138000",
      address: "广东省汕头市测试地址",
      company: "spam-bot",
      consent: true,
    }),
  }), env, ctx);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { message: "登记已提交。" });
});

test("answers GitHub Pages CORS preflight and preserves CORS on successful submissions", async () => {
  const worker = await loadWorker();
  const origin = "https://xiaoyilei77-design.github.io";
  const preflight = await worker.fetch(new Request("http://localhost/api/preorder", {
    method: "OPTIONS",
    headers: {
      "Origin": origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  }), env, ctx);

  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.equal(preflight.headers.get("access-control-allow-methods"), "POST, OPTIONS");
  assert.equal(preflight.headers.get("access-control-allow-headers"), "Content-Type");
  assert.equal(preflight.headers.get("vary"), "Origin");

  const submission = await worker.fetch(new Request("http://localhost/api/preorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": origin,
      "cf-connecting-ip": "198.51.100.26",
    },
    body: JSON.stringify({
      name: "自动脚本",
      phone: "13800138000",
      address: "广东省汕头市测试地址",
      company: "cors-probe",
      consent: true,
    }),
  }), env, ctx);

  assert.equal(submission.status, 200);
  assert.equal(submission.headers.get("access-control-allow-origin"), origin);
  assert.deepEqual(await submission.json(), { message: "登记已提交。" });
});
