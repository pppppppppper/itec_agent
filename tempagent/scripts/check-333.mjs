/**
 * 333 六步链路自检 —— `npm run check:333`
 *
 * mock 模式下没有模型，「学生答得对不对」是本地判定的（见 src/agent/modes.ts 的
 * coverage / tokenize）。这段逻辑决定了评委在演示时看到的数字人反应是否可信，
 * 所以单独拉出来用规划 §6.3.5 的真实数据跑一遍。
 *
 * 拿到 Agent ID 之后这个脚本仍然有用：它校验的是**契约字段是否齐备**，
 * 真链路下换的是数据来源，不是交互流程。
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

const dir = await mkdtemp(join(tmpdir(), 'zhitu-333-'));
try {
  const bundle = await build({
    entryPoints: ['src/agent/modes.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    logLevel: 'warning',
    // Node 里没有 import.meta.env，补一个空对象 → VITE_AGENT_ID 为 undefined → isMock = true
    define: { 'import.meta.env': '{}' },
  });
  const file = join(dir, 'modes.mjs');
  await writeFile(file, bundle.outputFiles[0].text, 'utf8');
  const { probeAnswer } = await import(pathToFileURL(file).href);

  // ── 用的就是规划 §6.3.5 里那张梯度下降卡的数据 ──
  const KEY_POINTS = [
    '梯度表示函数上升最快的方向，因此参数沿反方向更新',
    '学习率决定每次更新的步长，过大导致震荡，过小导致收敛缓慢',
    '梯度下降是迭代方法，通过多次小幅调整逐步逼近最优解',
  ];
  const Q2 = {
    question: '如果学习率设置得非常大，梯度下降会发生什么？',
    answer: '参数更新步长过大，可能在最小值附近来回震荡，甚至发散，无法收敛。',
  };

  console.log('\n第四步 · 复述判定');

  const goodRecall = await probeAnswer({
    concept: '梯度下降',
    stage: 'recall',
    keyPoints: KEY_POINTS,
    answer:
      '梯度指向函数上升最快的方向，所以我们沿反方向更新参数。学习率决定每次走的步长，太大会震荡。反复迭代就能逐步逼近最优解。',
  });
  check('覆盖全部 3 个关键点 → correct', goodRecall.payload.verdict === 'correct', goodRecall.payload.verdict);
  check('且不报「还没提到」', !goodRecall.payload.gap, goodRecall.payload.gap ?? '');
  check('反馈里点名了学生答到的内容', /提到了/.test(goodRecall.payload.feedback ?? ''));

  const partialRecall = await probeAnswer({
    concept: '梯度下降',
    stage: 'recall',
    keyPoints: KEY_POINTS,
    answer: '就是调整参数让误差变小。',
  });
  check('只答到 1 个关键点 → 不是 correct', partialRecall.payload.verdict !== 'correct', partialRecall.payload.verdict);
  check('给出了「还没提到」的定位', Boolean(partialRecall.payload.gap));
  check('给出了鼓励话术（§6.3.4 情感确认）', Boolean(partialRecall.payload.encouragement));

  const emptyRecall = await probeAnswer({
    concept: '梯度下降',
    stage: 'recall',
    keyPoints: KEY_POINTS,
    answer: '完全不知道，随便写的。',
  });
  check('完全跑偏 → wrong', emptyRecall.payload.verdict === 'wrong', emptyRecall.payload.verdict);
  check('不打击学生，仍给正向引导', /别担心|猜|修正|正常/.test(emptyRecall.payload.encouragement ?? ''));

  console.log('\n第六步 · 苏格拉底式追问（§6.3.3）');

  const firstTurn = await probeAnswer({
    concept: '梯度下降',
    stage: 'quiz',
    reference: Q2.answer,
    answer: '会收敛不了。',
  });
  check('第一轮不判对错（verdict = unknown）', firstTurn.payload.verdict === 'unknown');
  check('第一轮先追问推理依据', /怎么想到|怎么想|思路/.test(firstTurn.payload.followup));

  const correctQuiz = await probeAnswer({
    concept: '梯度下降',
    stage: 'quiz',
    reference: Q2.answer,
    answer: '参数更新步长过大，可能在最小值附近来回震荡，甚至发散，无法收敛。',
    studentReasoning: '步长太大会跨过最低点，在两边来回跳，越跳越远。',
  });
  check('第二轮：答对 → correct', correctQuiz.payload.verdict === 'correct', correctQuiz.payload.verdict);

  const wrongQuiz = await probeAnswer({
    concept: '梯度下降',
    stage: 'quiz',
    reference: Q2.answer,
    answer: '会算得更快，很快就能找到最优解。',
    studentReasoning: '学习率大就是步子大，步子大当然走得快。',
  });
  check('第二轮：答错 → 不是 correct', wrongQuiz.payload.verdict !== 'correct', wrongQuiz.payload.verdict);
  check('答错时给出认知断层定位', Boolean(wrongQuiz.payload.gap));
  check('答错时仍给情感确认（§6.3.4）', Boolean(wrongQuiz.payload.encouragement));

  // §6.3.3：答案对但推理站不住，不能判成「完全掌握」
  const rightAnswerBadReasoning = await probeAnswer({
    concept: '梯度下降',
    stage: 'quiz',
    reference: Q2.answer,
    answer: '参数更新步长过大，可能在最小值附近来回震荡，甚至发散，无法收敛。',
    studentReasoning: '我随便猜的，感觉应该会出问题吧。',
  });
  check(
    '答案对但推理站不住 → 不判 correct（§6.3.3）',
    rightAnswerBadReasoning.payload.verdict !== 'correct',
    rightAnswerBadReasoning.payload.verdict,
  );
  check(
    '并明确指出「结论对但理由对不上」',
    /推理|理由/.test(rightAnswerBadReasoning.payload.feedback ?? ''),
    rightAnswerBadReasoning.payload.feedback,
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n✗ 333 自检失败 ${failures.length} 项：`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ 333 六步自检全部通过\n');
