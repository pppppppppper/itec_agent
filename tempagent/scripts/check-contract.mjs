/**
 * 契约自检 —— `npm run check:contract`
 *
 * fixtures 在模块加载时就会过一遍真 Agent 用的那套 Schema（见 src/fixtures/index.ts），
 * 所以这个脚本能跑通，就说明「静态兜底数据」和「Agent 真实输出」在结构上是同一套。
 *
 * 建议每次改完 contract/ 或 fixtures/ 就跑一次 —— 演示前 30 秒的自检。
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

const dir = await mkdtemp(join(tmpdir(), 'zhitu-contract-'));
try {
  const bundle = await build({
    entryPoints: ['src/fixtures/index.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    logLevel: 'warning',
  });

  const file = join(dir, 'fixtures.mjs');
  await writeFile(file, bundle.outputFiles[0].text, 'utf8');
  const { FIXTURE_MAP, FIXTURE_CARD_GRADIENT_DESCENT, FIXTURE_NODE_GRADIENT_DESCENT, FIXTURE_QA } =
    await import(pathToFileURL(file).href);

  console.log('\n知识地图 fixture');
  check('节点数 12（设计稿「已学习 4/12」）', FIXTURE_MAP.nodes.length === 12, `实际 ${FIXTURE_MAP.nodes.length}`);
  check('分组 4 个', FIXTURE_MAP.categories.length === 4, FIXTURE_MAP.categories.join('/'));

  const mastered = FIXTURE_MAP.nodes.filter((n) => n.status === 'mastered').length;
  check('已掌握 4 个（对齐设计稿进度条）', mastered === 4, `实际 ${mastered}`);

  const gd = FIXTURE_MAP.nodes.find((n) => n.id === 'gradient_descent');
  check('梯度下降存在且为「学习中」（对齐设计稿高亮）', gd?.status === 'learning');

  const ids = new Set(FIXTURE_MAP.nodes.map((n) => n.id));
  const dangling = FIXTURE_MAP.nodes.flatMap((n) =>
    [...n.prerequisites, ...n.related, ...n.successor].filter((r) => !ids.has(r)),
  );
  check('没有悬空的关系引用', dangling.length === 0, dangling.join('、'));

  const badCategory = FIXTURE_MAP.nodes.filter((n) => !FIXTURE_MAP.categories.includes(n.category));
  check('每个节点的 category 都在 categories 里', badCategory.length === 0, badCategory.map((n) => n.id).join('、'));

  const estimatedTotal = FIXTURE_MAP.nodes.reduce((sum, n) => sum + n.estimated_time, 0);
  console.log(`    （全部学完预计 ${estimatedTotal} 分钟）`);

  console.log('\n333 学习卡 fixture');
  const card = FIXTURE_CARD_GRADIENT_DESCENT;
  check('关键点 3 个', card.key_points.length === 3);
  check('自测题 3 道', card.questions.length === 3);
  const types = new Set(card.questions.map((q) => q.type));
  check('题型覆盖 causal / conditional / comparative', types.size === 3, [...types].join('、'));
  // §6.3.4 自主性：「换一题」靠 variants 实现本地切换。
  // fixture 里没有变体的话按钮根本不会出现，等于这个功能没法验证。
  check(
    '每道题都有「换一题」的等价变体（§6.3.4）',
    card.questions.every((q) => (q.variants?.length ?? 0) > 0),
    card.questions.map((q) => q.variants?.length ?? 0).join('/'),
  );
  check(
    '变体与原题的问法不同（不是随便复制一遍）',
    card.questions.every((q) => q.variants.every((v) => v.question !== q.question)),
  );
  check(
    '变体也带答案与解释（换了题照样能判、能讲）',
    card.questions.every((q) => q.variants.every((v) => v.answer && v.explanation)),
  );

  /**
   * §7.3 禁止的是「答案就是一段定义」的题，比如「梯度下降是什么？」。
   * 不能简单 grep「是什么」——「A 和 B 的主要区别是什么？」是合法的对比题。
   * 所以只有**不带对比/因果/条件语境**的「是什么」才算违规。
   */
  const CONTEXTUAL = /区别|不同|对比|为什么|如果|会怎样|如何|怎么|哪些|什么时候/;
  const isDefinitionQuestion = (q) => /是什么|的定义/.test(q) && !CONTEXTUAL.test(q);
  const offenders = card.questions.filter((q) => isDefinitionQuestion(q.question));
  check(
    '没有「是什么」型定义题（§7.3）',
    offenders.length === 0,
    offenders.map((q) => q.question).join('、'),
  );

  // ── 契约字段覆盖度：契约里定义的每个字段，UI 至少要被引用到 ──
  //    这一条就是靠它发现「难度/学习时间没渲染」「关联节点没渲染」的。
  console.log('\n契约字段覆盖度');
  {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const types = readFileSync('src/contract/types.ts', 'utf8');

    const collect = (dir, acc = '') =>
      readdirSync(dir, { withFileTypes: true }).reduce((a, e) => {
        const full = join(dir, e.name);
        if (e.isDirectory()) return collect(full, a);
        if (/\.(vue|ts)$/.test(e.name)) return a + readFileSync(full, 'utf8');
        return a;
      }, acc);
    const ui = collect('src/components') + collect('src/composables') + readFileSync('src/copy.ts', 'utf8');

    // 这些字段不需要 UI 直接引用：mode/say 是信封，kind 是类型判别式
    const IGNORE = new Set(['mode', 'say', 'kind']);
    const gaps = [];
    let iface = null;
    for (const line of types.split('\n')) {
      const m = line.match(/^export interface (\w+)/);
      if (m) { iface = m[1]; continue; }
      if (iface && line.startsWith('}')) { iface = null; continue; }
      const f = iface && line.match(/^\s{2}(\w+)\??:/);
      if (f && !IGNORE.has(f[1]) && !new RegExp(`\\b${f[1]}\\b`).test(ui)) {
        gaps.push(`${iface}.${f[1]}`);
      }
    }
    check('契约里定义的字段 UI 都有渲染', gaps.length === 0, gaps.join('、'));
  }

  console.log('\n节点讲解 fixture');
  check('带损失曲线（设计稿中栏配图）', FIXTURE_NODE_GRADIENT_DESCENT.visual?.kind === 'loss_curve');
  check('有考试复习 Tab 内容', Boolean(FIXTURE_NODE_GRADIENT_DESCENT.exam_focus));
  check('有代码示例 Tab 内容', Boolean(FIXTURE_NODE_GRADIENT_DESCENT.code_example));

  console.log('\n知识问答 fixture');
  check('预置 2 条问答（设计稿右栏）', FIXTURE_QA.length === 2);
  check('「学习率太大」那条带震荡配图', FIXTURE_QA[0].visual?.oscillating === true);
  // §6.5 回答结构里的「关联节点」。这个字段曾经在契约里有、UI 却没渲染，
  // fixture 里也没有，于是谁都没发现——加断言把它钉住。
  check('覆盖「关联节点」（§6.5）', FIXTURE_QA.every((q) => (q.related_nodes?.length ?? 0) > 0));
  check('覆盖「关联概念」', FIXTURE_QA.every((q) => (q.related_concepts?.length ?? 0) > 0));
  check('每条问答都有「推荐下一步」', FIXTURE_QA.every((q) => Boolean(q.next_step)));
  check('每条问答都有「反问」', FIXTURE_QA.every((q) => Boolean(q.counter_question)));
} finally {
  await rm(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n✗ 契约自检失败 ${failures.length} 项：`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ 契约自检全部通过\n');
