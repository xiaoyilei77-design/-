/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
  FEISHU_BASE_TOKEN: string;
  FEISHU_TABLE_ID: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const submissionWindows = new Map<string, { count: number; expiresAt: number }>();
let tenantTokenCache: { token: string; expiresAt: number } | null = null;
const GITHUB_PAGES_ORIGIN = "https://xiaoyilei77-design.github.io";

const corsHeaders = (origin: string | null) => origin === GITHUB_PAGES_ORIGIN ? {
  "Access-Control-Allow-Origin": GITHUB_PAGES_ORIGIN,
  "Vary": "Origin",
} : {};

const jsonResponse = (body: Record<string, unknown>, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...corsHeaders(origin),
  },
});

async function getTenantToken(env: Env, signal: AbortSignal): Promise<string> {
  if (tenantTokenCache && tenantTokenCache.expiresAt > Date.now()) return tenantTokenCache.token;
  if (!env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET) throw new Error("Missing Feishu credentials");

  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
    signal,
  });
  const result = await response.json() as { code?: number; tenant_access_token?: string; expire?: number };
  if (!response.ok || result.code !== 0 || !result.tenant_access_token) throw new Error("Feishu authentication failed");

  tenantTokenCache = {
    token: result.tenant_access_token,
    expiresAt: Date.now() + Math.max(60, (result.expire ?? 7200) - 300) * 1000,
  };
  return tenantTokenCache.token;
}

async function handlePreorder(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const isAllowedOrigin = !origin || origin === requestOrigin || origin === GITHUB_PAGES_ORIGIN;

  if (!isAllowedOrigin) return jsonResponse({ message: "请求来源无效。" }, 403);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const respond = (body: Record<string, unknown>, status = 200) => jsonResponse(body, status, origin);

  if (request.method !== "POST") return respond({ message: "仅支持提交登记信息。" }, 405);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return respond({ message: "提交格式不正确。" }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) return respond({ message: "提交内容过长。" }, 413);

  const clientId = request.headers.get("cf-connecting-ip") ?? "unknown";
  const now = Date.now();
  const currentWindow = submissionWindows.get(clientId);
  if (currentWindow && currentWindow.expiresAt > now && currentWindow.count >= 5) {
    return respond({ message: "提交过于频繁，请十分钟后再试。" }, 429);
  }
  submissionWindows.set(clientId, currentWindow && currentWindow.expiresAt > now
    ? { ...currentWindow, count: currentWindow.count + 1 }
    : { count: 1, expiresAt: now + 10 * 60 * 1000 });
  if (submissionWindows.size > 1000) submissionWindows.clear();

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4096) {
      return respond({ message: "提交内容过长。" }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return respond({ message: "提交内容无法解析。" }, 400);
  }

  if (!body || typeof body !== "object") return respond({ message: "请完整填写登记信息。" }, 400);
  const value = body as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const phone = typeof value.phone === "string" ? value.phone.replace(/\s+/g, "") : "";
  const address = typeof value.address === "string" ? value.address.trim() : "";
  const company = typeof value.company === "string" ? value.company.trim() : "";

  if (company) return respond({ message: "登记已提交。" });
  if (value.consent !== true) return respond({ message: "请先同意信息用途说明。" }, 400);
  if (name.length < 2 || name.length > 30) return respond({ message: "姓名需为 2 至 30 个字符。" }, 400);
  if (!/^1[3-9]\d{9}$/.test(phone)) return respond({ message: "请填写有效的 11 位中国大陆手机号。" }, 400);
  if (address.length < 5 || address.length > 200) return respond({ message: "地址需为 5 至 200 个字符。" }, 400);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const tenantToken = await getTenantToken(env, controller.signal);
    if (!env.FEISHU_BASE_TOKEN || !env.FEISHU_TABLE_ID) throw new Error("Missing Feishu table configuration");
    const endpoint = `https://open.feishu.cn/open-apis/bitable/v1/apps/${encodeURIComponent(env.FEISHU_BASE_TOKEN)}/tables/${encodeURIComponent(env.FEISHU_TABLE_ID)}/records`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tenantToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ fields: { "姓名": name, "手机号（11位）": phone, "地址": address } }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const result = await upstream.json() as { code?: number };
    if (!upstream.ok || result.code !== 0) throw new Error("Feishu write failed");
  } catch {
    return respond({ message: "暂时无法完成登记，请稍后再试。" }, 502);
  }

  return respond({ message: "登记成功，信息已写入飞书多维表格。" });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/preorder") return handlePreorder(request, env);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
