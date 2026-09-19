/**
 * 兜底链路自检 —— `npm run check:fallback`
 *
 * 验证规划 §7.2「输出契约与质量保障」和 §14.7「AI 失败不出现空白页」。
 *
 * 为什么需要单独一个脚本：mock 模式下 `runMode` 直接走 fixture，永远不会失败，
 * 所以「失败重试 → 切静态兜底」这条链路此前**一次都没被真正跑过**。
 * 而它是交付标准里明确写着的：任何情况下不出现空白页。
 *
 * 做法：把 modes.ts 按真实模式（有 VITE_AGENT_ID，即 isMock = false）打包，
 * 用 client.ts 已有的 __setClientForTest 钩子塞一个假客户端进去，
 * 让它返回各种坏数据，然后断言重试次数、错误回传内容、以及兜底结果。
 */
import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ✓ ${label}`);
  else failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
};

const dir = await mkdtemp(join(tmpdir(), 'zhitu-fallback-'));
try {
  const bundle = await build({
    // 入口用 stdin 拼一个 shim：modes 的导出 + client 的测试钩子都要拿到。
    // 直接以 modes.ts 为入口的话，esbuild 只暴露入口自己的导出，钩子拿不到。
    stdin: {
      contents: [
        "export * from './src/agent/modes.ts';",
        "export { __setClientForTest } from './src/agent/client.ts';",
      ].join('\n'),
      resolveDir: process.cwd(),
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    logLevel: 'warning',
    // 关键：给出 VITE_AGENT_ID，让 isMock = false，才会走真实的「发请求 → 校验 → 重试」路径
    define: { 'import.meta.env': JSON.stringify({ VITE_AGENT_ID: 'fake-agent-for-test' }) },
  });
  const file = join(dir, 'modes.mjs');
  await writeFile(file, bundle.outputFiles[0].text, 'utf8');
  const modes = await import(pathToFileURL(file).href);
  const { __setClientForTest } = modes;

  /** 造一个记录调用的假客户端 */
  function fakeClient(replies) {
    const calls = [];
    return {
      calls,
      client: {
        sendMessage: async (message) => {
          calls.push(message);
          const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
          if (reply instanceof Error) throw reply;
          return { conversationId: 'c1', text: reply };
        },
      },
    };
  }

  const GOOD_MAP = JSON.stringify({
    mode: 'map',
    topic: '机器学习',
    nodes: Array.from({ length: 8 }, (_, i) => ({
      id: `n${i}`,
      name: `节点${i}`,
      category: i < 4 ? 'A' : 'B',
      description: '描述',
      difficulty: 1,
      estimated_time: 5,
      prerequisites: i === 0 ? [] : [`n${i - 1}`],
      related: [],
      successor: [],
      status: 'unlearned',
    })),
    relations: [],
  });

  console.log('\n§7.2 全坏 → 重试 2 次后切静态兜底');
  {
    const { calls, client } = fakeClient(['完全不是 JSON', '还是不是 JSON', '{也不是}']);
    __setClientForTest(client);
    const r = await modes.generateMap('机器学习');
    check('返回 degraded = true', r.degraded === true, String(r.degraded));
    check('总共调用 3 次（首次 + 重试 2 次）', calls.length === 3, `实际 ${calls.length}`);
    check('兜底内容是可用的地图（§14.7 不白屏）', r.payload?.nodes?.length >= 8, `${r.payload?.nodes?.length} 个节点`);
    check('兜底地图来自 fixtures（12 个节点）', r.payload.nodes.length === 12, `${r.payload.nodes.length}`);
    check('重试时把错误信息带回去了（§7.2）', /校验错误|Schema/.test(calls[1] ?? ''), (calls[1] ?? '').slice(0, 60));
    check('重试消息里要求「只改结构不要改内容」', /不要改变知识点内容/.test(calls[1] ?? ''));
    check('记录了失败原因供排查', r.warnings.length > 0, `${r.warnings.length} 条`);
  }

  console.log('\n第 2 次就修好 → 用真结果，不该兜底');
  {
    const { calls, client } = fakeClient(['坏的', GOOD_MAP]);
    __setClientForTest(client);
    const r = await modes.generateMap('机器学习');
    check('degraded = false', r.degraded === false);
    check('调用 2 次', calls.length === 2, `实际 ${calls.length}`);
    check('用的是模型返回的内容，不是 fixture', r.payload.nodes.length === 8, `${r.payload.nodes.length}`);
  }

  console.log('\nJSON 合法但结构不对 → 也要重试而不是直接崩');
  {
    const { calls, client } = fakeClient([JSON.stringify({ mode: 'map', topic: 'x', nodes: [], relations: [] }), GOOD_MAP]);
    __setClientForTest(client);
    const r = await modes.generateMap('机器学习');
    check('识别出结构错误并重试', calls.length === 2, `实际 ${calls.length}`);
    check('重试后成功', r.degraded === false && r.payload.nodes.length === 8);
  }

  console.log('\n网络直接抛错 → 由调用方接住，不产生空白页');
  {
    const { client } = fakeClient([new Error('ECONNREFUSED')]);
    __setClientForTest(client);
    let threw = false;
    try {
      await modes.generateMap('机器学习');
    } catch {
      threw = true;
    }
    // runMode 不吞网络异常，由 useStudy 的 try/catch 兜底成 degraded 气泡
    check('网络异常向上抛出（交给 UI 兜底）', threw);
  }

  console.log('\nmarkdown 围栏 + 前后废话 → 应该能抽出来，不必重试');
  {
    const { calls, client } = fakeClient(['好的，这是你的地图：\n```json\n' + GOOD_MAP + '\n```\n希望有帮助！']);
    __setClientForTest(client);
    const r = await modes.generateMap('机器学习');
    check('一次就成功', calls.length === 1, `实际 ${calls.length}`);
    check('degraded = false', r.degraded === false);
  }

  __setClientForTest(null);
} finally {
  await rm(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n✗ 兜底自检失败 ${failures.length} 项：`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ 兜底自检全部通过\n');
