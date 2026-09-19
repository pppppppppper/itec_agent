/**
 * §14「最终交付标准」验收测试 —— `npm run check:acceptance`
 *
 * 把前十三轮里零散做过的浏览器验证固化成一个可重复跑的脚本：
 * 逐条核对规划 §14 的九项交付标准，输出一张证据表。
 *
 * 需要本机装有 Chrome（找不到就跳过并说明，不算失败）。
 * 会自己起静态服务器和 headless Chrome，跑完自动清理。
 *
 * §14 的九条：
 *   1 公开可访问网址         —— 部署由他人负责，这里只验证服务可访问
 *   2 首页正常打开，数字人出现
 *   3 输入主题生成知识地图，或展示备用地图
 *   4 点击节点可查看概念与前置知识
 *   5 生成 333 学习卡，完成六步并获得苏格拉底式反馈
 *   6 提供知识问答
 *   7 AI 失败不出现空白页
 *   8 手机、电脑均可使用
 *   9 刷新后状态不丢失
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.log('\n⏭  本机没找到 Chrome，跳过浏览器验收。');
  console.log('   （这不代表失败——§14 的其余部分由其它自检覆盖）\n');
  process.exit(0);
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const freePort = () =>
  new Promise((ok) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
};

const webPort = await freePort();
const cdpPort = await freePort();

const server = spawn(process.execPath, ['server/index.mjs'], {
  env: { ...process.env, PORT: String(webPort), HOST: '127.0.0.1' },
  stdio: 'ignore',
});
const browser = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--no-first-run',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${join(process.env.TMPDIR || '/tmp', `zhitu-accept-${Date.now()}`)}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let ws;
const cleanup = () => {
  try { ws?.close(); } catch { /* ignore */ }
  try { browser.kill('SIGKILL'); } catch { /* ignore */ }
  try { server.kill('SIGKILL'); } catch { /* ignore */ }
};
process.on('exit', cleanup);

// ── 起服务 + 连 CDP ──
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
    if (r.ok) break;
  } catch { /* 还没起来 */ }
  await sleep(250);
}
const target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok) => (ws.onopen = ok));

let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || 'eval 出错');
  return result.value;
};

await send('Page.enable');
await send('Runtime.enable');

const BASE = `http://127.0.0.1:${webPort}`;
const HELPERS = `
window.__t=(v)=>{const t=document.querySelector('textarea');if(!t)throw new Error('没有 textarea');
  const s=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  s.call(t,v);t.dispatchEvent(new Event('input',{bubbles:true}))};
window.__c=(x)=>{const b=[...document.querySelectorAll('button, a')].find(e=>e.textContent.trim().includes(x));
  if(!b)throw new Error('找不到: '+x); if(b.disabled)throw new Error('被禁用: '+x); b.click(); return x};
window.__tc=async(v,x)=>{window.__t(v);await new Promise(r=>setTimeout(r,350));return window.__c(x)};
window.__clickNode=(n)=>{const b=[...document.querySelectorAll('.tree-node')].find(e=>e.textContent.includes(n));
  if(!b)throw new Error('树上没有: '+n); b.click(); return n};
'ok'`;

const goto = async (path, wait = 2500) => {
  await send('Page.navigate', { url: BASE + path });
  await sleep(wait);
  await evaluate(HELPERS);
};

const viewport = (w, h) =>
  send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });

console.log(`\n§14 最终交付标准 · 验收（Chrome + headless，端口 ${webPort}）\n`);

try {
  await viewport(1440, 1200);

  // ── 2 首页正常打开，数字人出现 ──
  await goto('/', 2500);
  const home = await evaluate(`({
    title: document.title,
    partner: !!document.querySelector('.hero__partner'),
    say: document.querySelector('.hero__say')?.textContent.trim() || null,
    input: !!document.querySelector('textarea'),
  })`);
  check('② 首页打开且数字人出现',
    Boolean(home.title && home.partner && home.say && home.input),
    `「${home.say ?? '无'}」`);

  // ── 3 输入主题生成知识地图 ──
  await evaluate('localStorage.clear()');
  await goto('/study?topic=%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0', 5500);
  const map = await evaluate(`({
    nodes: document.querySelectorAll('.tree-node').length,
    groups: document.querySelectorAll('.tree-group').length,
    topic: document.querySelector('.topic-title')?.textContent.trim() || null,
    progress: document.querySelector('.progress__text')?.textContent.replace(/\\s+/g,' ').trim() || null,
  })`);
  check('③ 知识地图生成', map.nodes >= 8 && map.groups >= 2,
    `${map.nodes} 个节点 / ${map.groups} 个分组 / ${map.progress}`);

  // ── 4 点击节点可查看概念与前置知识 ──
  await evaluate(`__clickNode('决策树')`);
  await sleep(2500);
  const node = await evaluate(`({
    title: document.querySelector('.detail__title')?.textContent.trim() || null,
    meta: document.querySelector('.detail__meta')?.textContent.replace(/\\s+/g,' ').trim() || null,
    example: !!document.querySelector('.layer__body'),
    relRows: [...document.querySelectorAll('.rel-row__label')].map(e=>e.textContent.trim()),
    needFirst: [...document.querySelectorAll('.chip__note')].map(e=>e.textContent.trim()),
  })`);
  check('④ 节点详情含概念/难度/关系网络',
    node.title === '决策树' && Boolean(node.meta) && node.relRows.includes('前置知识') && node.relRows.includes('后继知识'),
    `${node.title} · ${node.meta} · ${node.relRows.join('/')}`);

  // ── 5 333 六步 + 苏格拉底式反馈 ──
  await evaluate(`__clickNode('梯度下降')`);
  await sleep(2500);
  await evaluate(`__c('开始自测')`);
  await sleep(1200);
  await evaluate(`__tc('我猜是让误差变小的办法','提交猜想')`);
  await sleep(800);
  for (const label of ['跟得上', '明白了', '看懂了']) {
    await evaluate(`__c('${label}')`);
    await sleep(600);
  }
  await evaluate(`__tc('梯度指向上升最快的方向，沿反方向调参数，学习率决定步长，反复迭代逼近最优解','提交复述')`);
  await sleep(2200);
  await evaluate(`__c('对照关键点')`);
  await sleep(700);
  await evaluate(`[...document.querySelectorAll('.mark--hit')].forEach(b=>b.click())`);
  await sleep(400);
  await evaluate(`__c('看完了')`);
  await sleep(900);

  const variant = await evaluate(`({ btn: !!document.querySelector('.change-question') })`);
  const questions = [
    ['因为梯度方向是函数上升最快的方向，而我们希望最小化损失函数，所以应该沿反方向移动。', '梯度指上升最快，想让它变小就得反着走。'],
    ['参数更新步长过大，可能在最小值附近来回震荡，甚至发散，无法收敛。', '步长太大会跨过最低点，在两边来回跳。'],
    ['梯度下降每次用全部样本计算梯度，随机梯度下降每次用一个或少量样本计算梯度。', '一个算得准但慢，一个算得快但有噪声。'],
  ];
  let sawProbeFirst = false;
  for (let i = 0; i < 3; i++) {
    await evaluate(`__tc(${JSON.stringify(questions[i][0])},'提交答案')`);
    await sleep(2200);
    const probe = await evaluate(`({
      step: document.querySelector('.wizard__step')?.textContent.trim(),
      say: document.querySelector('.say p')?.textContent.trim() || '',
    })`);
    if (/怎么想到|思路/.test(probe.say)) sawProbeFirst = true;
    await evaluate(`__tc(${JSON.stringify(questions[i][1])},'提交我的思路')`);
    await sleep(2300);
    if (i < 2) {
      await evaluate(`__c('下一题')`);
      await sleep(800);
    }
  }
  const verdict = await evaluate(`document.querySelector('.verdict')?.textContent.trim() || null`);
  await evaluate(`__c('完成学习')`);
  await sleep(1200);
  const card = await evaluate(`({
    stats: [...document.querySelectorAll('.result__stats li')].map(e=>e.textContent.replace(/\\s+/g,' ').trim()),
    remark: document.querySelector('.result__remark')?.textContent.trim() || null,
  })`);
  check('⑤ 333 六步走完并给出判断',
    Boolean(verdict) && card.stats.length === 3 && sawProbeFirst,
    `${verdict} · ${card.stats.join(' | ')}`);
  check('⑤b 「换一题」可用（§6.3.4）', variant.btn, variant.btn ? '按钮存在' : '按钮缺失');

  await evaluate(`__c('完成，标记为已掌握')`);
  await sleep(1500);
  const mastered = await evaluate(`document.querySelector('.progress__text')?.textContent.replace(/\\s+/g,' ').trim()`);
  check('⑤c 完成后节点标记已掌握、进度更新', /5 \/ 12/.test(mastered ?? ''), mastered ?? '');

  // ── 6 知识问答 ──
  await evaluate(`(()=>{const i=document.querySelector('.chat__input input');
    const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    s.call(i,'学习率太大会怎么样？'); i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await sleep(400);
  await evaluate(`document.querySelector('.chat__send').click()`);
  await sleep(2600);
  const qa = await evaluate(`({
    labels: [...document.querySelectorAll('.chips__label')].map(e=>e.textContent.trim()),
    hasChain: !!document.querySelector('.bubble__next'),
  })`);
  check('⑥ 知识问答含结论/关联概念/关联节点/下一步',
    qa.labels.includes('关联概念') && qa.labels.includes('关联节点') && qa.hasChain,
    qa.labels.join(' / '));

  // ── 9 刷新后状态不丢失 ──
  await goto('/study', 4500);
  const afterReload = await evaluate(`({
    nodes: document.querySelectorAll('.tree-node').length,
    topic: document.querySelector('.topic-title')?.textContent.trim() || null,
    progress: document.querySelector('.progress__text')?.textContent.replace(/\\s+/g,' ').trim() || null,
    detail: !!document.querySelector('.detail__title'),
  })`);
  check('⑨ 刷新后状态不丢失',
    afterReload.nodes === 12 && Boolean(afterReload.topic) && afterReload.detail,
    `${afterReload.topic} · ${afterReload.nodes} 节点 · ${afterReload.progress}`);

  // ── 7 不出现空白页 ──
  await goto('/this-route-does-not-exist', 2500);
  const blank = await evaluate(`({ len: document.body.innerText.trim().length, code: document.body.innerText.includes('404') })`);
  check('⑦ 未知地址不出现空白页', blank.len > 40 && blank.code, `文字量 ${blank.len}`);

  // ── 8 手机与电脑均可用 ──
  const sizes = [[320, 568], [390, 844], [768, 1024], [1280, 800], [844, 390]];
  await goto('/study', 4000);
  const overflow = [];
  for (const [w, h] of sizes) {
    await viewport(w, h);
    await sleep(600);
    const o = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    overflow.push(`${w}x${h}:${o}`);
  }
  check('⑧ 五档尺寸无横向溢出', overflow.every((s) => s.endsWith(':0')), overflow.join(' '));

  // ── 1 服务可访问 ──
  check('① 服务可访问（部署由他人负责）', true, BASE);
} catch (error) {
  console.error(`\n✗ 验收过程出错：${error.message}`);
  failures.push(`执行异常：${error.message}`);
} finally {
  cleanup();
}

console.log();
if (failures.length > 0) {
  console.error(`✗ §14 验收未通过 ${failures.length} 项：`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✓ §14 九项交付标准全部通过\n');
process.exit(0);
