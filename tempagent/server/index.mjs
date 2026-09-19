/**
 * 智图伙伴 · 生产服务器
 * ======================
 * 一个进程干两件事，故意不引 Nginx：
 *
 *   1. 托管 dist/ 静态文件（含 SPA fallback —— router 用的是 createWebHistory，
 *      直接访问 /study 必须回落到 index.html，否则刷新就 404）
 *   2. 把 /openhex-proxy/*  反向代理到 OpenHex 平台，并在这里注入真实 API Key
 *
 * 为什么必须有第 2 件事：`mysta_…` 等于账号的全部权限，绝不能进浏览器。
 * 所以前端拿一个明显是假的占位符 key（见 src/agent/client.ts），
 * 由这个进程把 Authorization 头替换掉。对应官方文档「浏览器里的正确做法」。
 *
 * 启动：OPENHEX_API_KEY=mysta_... PORT=8080 node server/index.mjs
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const UPSTREAM = (process.env.OPENHEX_API_BASE || 'https://api.openhex.tech').replace(/\/+$/, '');
const API_KEY = process.env.OPENHEX_API_KEY || '';
const PROXY_PREFIX = '/openhex-proxy';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** 复制上游响应头。fetch 已经解压过，content-encoding / content-length 必须丢掉，否则浏览器解不出来。 */
const HOP_BY_HOP = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  const candidate = normalize(join(DIST, pathname));
  // 目录穿越防护：解析后的路径必须仍在 dist 内
  const inDist = candidate === DIST || candidate.startsWith(DIST + sep);

  if (inDist) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return sendFile(res, candidate, info.size, pathname);
    } catch {
      /* 落到 SPA fallback */
    }
  }

  // SPA fallback：/study 这类前端路由要回落到 index.html
  try {
    const index = join(DIST, 'index.html');
    const info = await stat(index);
    return sendFile(res, index, info.size, '/index.html');
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('dist/index.html 不存在，先跑 npm run build');
  }
}

function sendFile(res, filePath, size, pathname) {
  const ext = extname(filePath).toLowerCase();
  // 带 hash 的构建产物可以长期缓存；index.html 绝对不能缓存，否则发新版用户看不到
  const immutable = pathname.startsWith('/assets/') && /\.[0-9a-zA-Z_-]{8,}\./.test(pathname);
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'content-length': size,
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  createReadStream(filePath).pipe(res);
}

async function proxy(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const target = UPSTREAM + url.pathname.slice(PROXY_PREFIX.length) + url.search;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.authorization; // 前端带的是占位符，必须替换而不是透传
  delete headers.connection;
  delete headers['content-length']; // 长度可能因改头而变，交给 fetch 重算
  if (API_KEY) headers.authorization = `Bearer ${API_KEY}`;

  const controller = new AbortController();
  // 客户端断开（关页面 / 切路由）时，把上游请求也掐掉，别让 Agent 空转烧额度
  res.on('close', () => controller.abort());

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req),
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ detail: `代理无法连接 OpenHex：${error?.message ?? error}` }));
    return;
  }

  const outHeaders = {};
  for (const [k, v] of upstream.headers) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    outHeaders[k] = v;
  }
  // SSE 必须立刻把响应头刷出去，不能等第一个 chunk
  res.writeHead(upstream.status, outHeaders);
  res.flushHeaders?.();

  if (!upstream.body) return res.end();
  try {
    for await (const chunk of upstream.body) {
      if (!res.write(chunk)) {
        // 背压：等 drain 再继续，避免大响应把内存顶爆
        await new Promise((done) => res.once('drain', done));
      }
    }
  } catch {
    /* 上游中断或客户端断开，正常收尾 */
  }
  res.end();
}

const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === PROXY_PREFIX || pathname.startsWith(PROXY_PREFIX + '/')) {
    return proxy(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }
  return serveStatic(req, res);
});

// Agent 首条消息要拉起运行环境，可能十几秒；别让默认超时掐断长连接
server.requestTimeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 75_000;

server.listen(PORT, HOST, () => {
  console.log(`[zhitu] 监听 http://${HOST}:${PORT}`);
  console.log(`[zhitu] 静态目录 ${DIST}`);
  console.log(`[zhitu] 代理 ${PROXY_PREFIX}/* → ${UPSTREAM}  (API Key: ${API_KEY ? '已注入' : '⚠ 未配置'})`);
});
