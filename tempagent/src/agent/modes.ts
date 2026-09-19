/**
 * 四种模式的调用层 —— §7.1 架构总览的前端一半。
 *
 * 每个模式都走同一条流水线（§7.2 的输出契约与质量保障）：
 *   发消息 → 抽取 JSON → Schema 校验 → 失败则带错误重试（≤2 次）→ 仍失败切静态兜底
 * 返回的 `degraded` 标记让 UI 能显示「我暂时没连上网络，先看看示例地图吧」，
 * 而不是假装一切正常。
 */
import { getClient, isMock } from './client';
import { buildRepairMessage, parseAgentPayload, type PayloadOf } from '../contract/parse';
import { encodeMessage, type AgentMode, type MapNode } from '../contract/types';
import {
  FIXTURE_CARD_GRADIENT_DESCENT,
  FIXTURE_MAP,
  FIXTURE_NODE_GRADIENT_DESCENT,
  FIXTURE_QA,
} from '../fixtures';

/** §7.2：解析或校验失败时最多重试 2 次。 */
const MAX_RETRIES = 2;

export interface ModeResult<T> {
  payload: T;
  /** true = 走了静态兜底，UI 应提示「先看看示例」。 */
  degraded: boolean;
  /** 校验过程中自动修复的问题，仅用于开发期排查。 */
  warnings: string[];
}

type FallbackFor<M extends AgentMode> = (body: string) => PayloadOf<M>;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });
}

async function runMode<M extends AgentMode>(
  mode: M,
  body: string,
  fallback: FallbackFor<M>,
  signal?: AbortSignal,
): Promise<ModeResult<PayloadOf<M>>> {
  if (isMock) return mockRun(mode, body, fallback, signal);

  const client = getClient();
  const warnings: string[] = [];
  let lastError = '';
  let conversationId: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const message =
      attempt === 0 ? encodeMessage(mode, body) : buildRepairMessage(mode, body, lastError);

    const turn = await client.sendMessage(message, { signal, conversationId, idleTimeoutMs: 180_000 });
    conversationId = turn.conversationId;

    const parsed = parseAgentPayload(mode, turn.text);
    if (parsed.ok) return { payload: parsed.value, degraded: false, warnings: [...warnings, ...parsed.warnings] };

    lastError = parsed.error;
    warnings.push(`第 ${attempt + 1} 次输出校验失败：${parsed.error}`);
  }

  return { payload: fallback(body), degraded: true, warnings };
}

/** mock 模式：假装一点网络延迟，让「数字人思考中」的过渡态在开发期就能被看到。 */
async function mockRun<M extends AgentMode>(
  mode: M,
  body: string,
  fallback: FallbackFor<M>,
  signal?: AbortSignal,
): Promise<ModeResult<PayloadOf<M>>> {
  const latency = mode === 'map' ? 1600 : 900;
  await sleep(latency, signal);
  return { payload: fallback(body), degraded: false, warnings: [] };
}

/** ── 模式 1：地图生成（§6.1） ───────────────────────────────── */

/** 落地页收集到的学习者背景，一并送给 Agent 用于调整难度与措辞。 */
export interface StudyContext {
  role?: string;
  level?: string;
}

export function generateMap(topic: string, context: StudyContext = {}, signal?: AbortSignal) {
  const body = [
    `主题：${topic}`,
    context.role ? `学习者身份：${context.role}` : '',
    context.level ? `当前基础：${context.level}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return runMode(
    'map',
    body,
    (): PayloadOf<'map'> => {
      const requested = topic.trim() || '机器学习';
      // mock 只有「机器学习」这一张真地图（也就是线上兜底用的那张）。
      // 输入别的主题时如实回显主题，不假装生成了一张新地图。
      return { ...FIXTURE_MAP, topic: requested };
    },
    signal,
  );
}

/** ── 模式 2：节点讲解（§6.2） ───────────────────────────────── */
export function explainNode(node: MapNode, topic: string, signal?: AbortSignal) {
  return runMode(
    'node',
    `主题：${topic}\n节点：${node.id}（${node.name}）`,
    (): PayloadOf<'node'> => {
      if (node.id === FIXTURE_NODE_GRADIENT_DESCENT.id) return FIXTURE_NODE_GRADIENT_DESCENT;
      // 非梯度下降节点：用地图里的字段拼一份最小可用的讲解，不编造内容。
      return {
        mode: 'node',
        id: node.id,
        name: node.name,
        say: `这个节点叫「${node.name}」，我先给你一个初步的定位。`,
        definition: node.description,
        difficulty: node.difficulty,
        estimated_time: node.estimated_time,
        explanation: node.description,
        example: '（示例内容需要连接 Agent 后生成）',
        misconception: '（常见误区需要连接 Agent 后生成）',
        prerequisites: node.prerequisites,
        related: node.related,
        successor: node.successor,
      };
    },
    signal,
  );
}

/** ── 模式 3：333 学习卡（§6.3） ─────────────────────────────── */
export function makeCard333(concept: string, signal?: AbortSignal) {
  return runMode(
    'card333',
    `概念：${concept}`,
    (): PayloadOf<'card333'> => ({ ...FIXTURE_CARD_GRADIENT_DESCENT, concept }),
    signal,
  );
}

/** ── 模式 4：苏格拉底式追问（§6.3.3） ──────────────────────── */
export interface ProbeArgs {
  concept: string;
  /** 学生这一步的输入（复述或作答）。 */
  answer: string;
  /** 标准答案，仅用于判断，不会回显给学生。 */
  reference?: string;
  /** 第五步的 3 个关键点，用于判断复述「提到了哪几个、漏了哪个」。 */
  keyPoints?: string[];
  /** 'recall' = 第四步复述；'quiz' = 第六步答题。 */
  stage: 'recall' | 'quiz';
  /** quiz 专用：本次提交的是「你是怎么想到的」那段推理，而不是答案本身。 */
  reasoning?: boolean;
}

/**
 * 把文本切成可比较的最小单元：中文取二字组，英文/数字取单词。
 * 只用于 mock 模式在没有模型的情况下给出一个像样的判断。
 */
function tokenize(text: string): Set<string> {
  const compact = text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
  const tokens = new Set<string>();
  for (const word of text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []) tokens.add(word);
  for (let i = 0; i < compact.length - 1; i += 1) tokens.add(compact.slice(i, i + 2));
  if (compact.length === 1) tokens.add(compact);
  return tokens;
}

/** 参考答案里的单元有多大比例出现在学生答案里（0–1）。 */
function coverage(answer: string, reference: string): number {
  const ref = tokenize(reference);
  if (ref.size === 0) return 0;
  const ans = tokenize(answer);
  let hit = 0;
  for (const token of ref) if (ans.has(token)) hit += 1;
  return hit / ref.size;
}

function readField(body: string, label: string): string {
  const match = body.match(new RegExp(`${label}：([\\s\\S]*?)(?=\\n[^\\n]*：|$)`));
  return match ? match[1].trim() : '';
}

export function probeAnswer(args: ProbeArgs, signal?: AbortSignal) {
  const keyPoints = args.keyPoints ?? [];
  const body = [
    `概念：${args.concept}`,
    `环节：${args.stage === 'recall' ? '复述' : '自测'}`,
    args.reference ? `标准答案：${args.reference}` : '',
    keyPoints.length ? `关键点：${keyPoints.join(' | ')}` : '',
    `学生输入：${args.answer}`,
  ]
    .filter(Boolean)
    .join('\n');

  return runMode(
    'probe',
    body,
    (): PayloadOf<'probe'> => {
      // ── 第六步：学生刚提交答案，先追问推理依据，不判对错（§6.3.3） ──
      if (args.stage === 'quiz' && !args.reasoning) {
        return {
          mode: 'probe',
          followup: '先别急着看答案——你是怎么想到这个答案的？说说你的思路就行。',
          verdict: 'unknown',
        };
      }

      // ── 第四步：复述。对照关键点看提到了哪几个、漏了哪个 ──
      if (args.stage === 'recall') {
        const covered = keyPoints.filter((point) => coverage(args.answer, point) >= 0.34);
        const missed = keyPoints.filter((point) => !covered.includes(point));
        const hit = covered.length;

        const feedback =
          hit === 0
            ? '我还没在你的复述里找到关键要点。别担心——再看一眼上面的解释，然后试着把「它想让什么变小、靠什么调整」这两件事说出来。'
            : `你提到了「${covered[0].slice(0, 18)}…」，这是核心。` +
              (missed.length
                ? `如果再把「${missed[0].slice(0, 18)}…」这一点补上，就更完整了。`
                : '三个关键点你都覆盖到了，很完整。');

        return {
          mode: 'probe',
          feedback,
          followup: '你是怎么想到这个答案的？',
          verdict: hit >= 2 ? 'correct' : hit === 1 ? 'partial' : 'wrong',
          gap: missed.length ? `还没覆盖：${missed.map((p) => p.slice(0, 20)).join('；')}` : undefined,
          encouragement:
            hit === 0
              ? '愿意先猜、再修正，这本身就是最有效的学习方式。'
              : '能用自己的话讲出来，说明你已经真加工过一遍了——这比再读三遍管用。',
        };
      }

      // ── 第六步第二轮：拿到推理依据后再给判断和认知断层定位 ──
      const reference = args.reference ?? readField(body, '标准答案');
      const ratio = reference ? coverage(args.answer, reference) : 0;
      const verdict = ratio >= 0.45 ? 'correct' : ratio >= 0.2 ? 'partial' : 'wrong';

      const summary: Record<typeof verdict, string> = {
        correct: '方向对了，关键的那一步你也说到了。',
        partial: '你抓到了一部分，但有一条关键的推理链条断了。',
        wrong: '结论偏了，不过你的思路里有可用的部分——我们顺着它捋一下。',
      };

      return {
        mode: 'probe',
        verdict,
        feedback: summary[verdict],
        followup: '换个说法，你会怎么向同学解释这一步为什么成立？',
        gap:
          verdict === 'correct'
            ? undefined
            : `检查一下你是否漏掉了：${reference.slice(0, 40)}${reference.length > 40 ? '…' : ''}`,
        encouragement:
          verdict === 'correct' ? '这题你掌握住了，下一题会稍微难一点。' : '答错在这里很正常，这个点正是最容易混的地方。',
      };
    },
    signal,
  );
}


/** ── 模式 5：知识问答（§6.5，设计稿右栏） ───────────────────── */
export function askQuestion(question: string, nodeContext: string | null, signal?: AbortSignal) {
  return runMode(
    'qa',
    [`当前节点：${nodeContext ?? '（未选中）'}`, `问题：${question}`].join('\n'),
    (body): PayloadOf<'qa'> => {
      const asked = body.replace(/^[\s\S]*问题：/, '').trim();
      const hit = FIXTURE_QA.find((q) => q.question === asked);
      if (hit) return hit;
      // mock 只有设计稿里那两条真问答，其余如实说明，不编造答案。
      return {
        mode: 'qa',
        question: asked,
        conclusion: '这条问题需要连接 Agent 才能回答。',
        reason:
          '当前是本地 mock 模式：本地只预置了设计稿里的两条问答（「学习率太大会怎么样？」和「给我一个具体例子」），其余问题由 Agent 实时回答。',
        next_step: '配置 VITE_AGENT_ID 后即会走真实 Agent。',
      };
    },
    signal,
  );
}
