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
  /** 'recall' = 第四步复述；'quiz' = 第六步答题。 */
  stage: 'recall' | 'quiz';
}

export function probeAnswer(args: ProbeArgs, signal?: AbortSignal) {
  return runMode(
    'probe',
    [
      `概念：${args.concept}`,
      `环节：${args.stage === 'recall' ? '复述' : '自测'}`,
      args.reference ? `标准答案：${args.reference}` : '',
      `学生输入：${args.answer}`,
    ]
      .filter(Boolean)
      .join('\n'),
    (): PayloadOf<'probe'> =>
      args.stage === 'recall'
        ? {
            mode: 'probe',
            feedback: '你抓住了核心意思。如果再把「沿着梯度的反方向」这一步补上，就更完整了。',
            followup: '你是怎么想到这个答案的？',
            verdict: 'partial',
            encouragement: '能用自己的话讲出来，本身就说明你已经加工过一遍了。',
          }
        : {
            mode: 'probe',
            followup: '先别急着看答案——你是怎么想到这个答案的？',
            verdict: 'unknown',
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
