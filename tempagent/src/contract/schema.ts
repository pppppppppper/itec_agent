/**
 * 契约的运行时校验 —— §7.2「JSON Schema 校验」的前端实现。
 *
 * 分层：本文件只做**结构**校验（字段在不在、类型对不对、规模对不对）。
 * 跨节点的一致性（prerequisites 指向不存在的节点）是**可修复**问题，
 * 放在 lintMap() 里，由 parse.ts 先尝试自动修，修不好才算失败 —— 不轻易浪费一次重试。
 */
import { z } from 'zod';

export const nodeStatusSchema = z.enum(['unlearned', 'learning', 'mastered', 'review']);
export const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const relationTypeSchema = z.enum(['prerequisite', 'successor', 'related']);
export const questionTypeSchema = z.enum(['causal', 'conditional', 'comparative']);

const str = (max = 600) => z.string().min(1).max(max);

export const mapNodeSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/i, 'id 必须是字母/数字/下划线'),
  name: str(80),
  /** 设计稿的分组层级：数学基础 / 基础概念 / 经典算法 / 实践应用。 */
  category: str(40),
  description: str(300),
  difficulty: difficultySchema,
  estimated_time: z.number().int().min(1).max(120),
  prerequisites: z.array(z.string()).max(8),
  related: z.array(z.string()).max(8),
  successor: z.array(z.string()).max(8),
  status: nodeStatusSchema,
});

export const mapRelationSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: relationTypeSchema,
});

/** §6.1.2 规模约束：节点总数 8–15 个，防止生成失控导致前端渲染超时。 */
export const mapPayloadSchema = z.object({
  mode: z.literal('map'),
  say: z.string().max(300).optional(),
  topic: str(80),
  categories: z.array(str(40)).max(8).optional(),
  nodes: z.array(mapNodeSchema).min(8).max(15),
  relations: z.array(mapRelationSchema).max(60),
});

/** 损失曲线图 —— 设计稿「损失 vs 参数」。 */
export const lossCurveVisualSchema = z.object({
  kind: z.literal('loss_curve'),
  steps: z.array(z.object({ param: z.number(), loss: z.number() })).min(2).max(40),
  optimum: z.object({ param: z.number(), loss: z.number() }),
  xLabel: z.string().max(20).optional(),
  yLabel: z.string().max(20).optional(),
  oscillating: z.boolean().optional(),
});

export const nodePayloadSchema = z.object({
  mode: z.literal('node'),
  say: z.string().max(300).optional(),
  id: str(64),
  name: str(80),
  definition: str(200),
  explanation: str(400),
  example: str(600),
  misconception: str(300),
  visual: lossCurveVisualSchema.optional(),
  /** 设计稿 Tab 2 / Tab 3。缺省时前端显示「待生成」，不报错。 */
  exam_focus: z.string().max(1200).optional(),
  code_example: z.string().max(2000).optional(),
  difficulty: difficultySchema,
  estimated_time: z.number().int().min(1).max(120),
  prerequisites: z.array(z.string()).max(8),
  related: z.array(z.string()).max(8),
  successor: z.array(z.string()).max(8),
});

/** §6.3.5：key_points 固定 3 个；questions 固定 3 题且覆盖三种题型。 */
export const card333PayloadSchema = z
  .object({
    mode: z.literal('card333'),
    say: z.string().max(300).optional(),
    concept: str(80),
    activation_prompt: str(300),
    explanation_part1: str(400),
    explanation_part2: str(400),
    example: str(800),
    recall_prompt: str(300),
    key_points: z.array(str(200)).length(3),
    questions: z.array(
      z.object({
        question: str(300),
        answer: str(600),
        explanation: str(800),
        type: questionTypeSchema,
        // 「换一题」的等价变体：可选，最多 3 个，避免生成端无限膨胀
        variants: z
          .array(
            z.object({
              question: str(300),
              answer: str(600),
              explanation: str(800),
            }),
          )
          .max(3)
          .optional(),
      }),
    ).length(3),
  })
  .refine((c) => new Set(c.questions.map((q) => q.type)).size === 3, {
    message: '§7.3：三道自测题必须分别覆盖 causal / conditional / comparative 三种题型',
    path: ['questions'],
  });

export const probePayloadSchema = z.object({
  mode: z.literal('probe'),
  say: z.string().max(300).optional(),
  feedback: z.string().max(600).optional(),
  followup: str(300),
  verdict: z.enum(['correct', 'partial', 'wrong', 'unknown']),
  gap: z.string().max(400).optional(),
  encouragement: z.string().max(300).optional(),
  /** AI 面板里的「关联概念」标签（设计稿右下）。 */
  related_concepts: z.array(str(40)).max(6).optional(),
});

/** ── 模式 5：知识问答（§6.5） ────────────────────────────────── */
export const qaPayloadSchema = z.object({
  mode: z.literal('qa'),
  say: z.string().max(300).optional(),
  question: str(300),
  conclusion: str(400),
  reason: str(1200),
  example: z.string().max(1200).optional(),
  related_nodes: z.array(str(40)).max(8).optional(),
  related_concepts: z.array(str(40)).max(8).optional(),
  visual: lossCurveVisualSchema.optional(),
  next_step: z.string().max(300).optional(),
  counter_question: z.string().max(300).optional(),
});

/**
 * 用 z.union 而不是 z.discriminatedUnion：card333 带 .refine（三种题型必须齐全），
 * refine 之后是 ZodEffects，无法作为 discriminatedUnion 的分支。
 * 实际分发由 SCHEMA_BY_MODE 按 mode 精确选择，这里只是"任意一种"的兜底类型。
 */
export const agentPayloadSchema = z.union([
  mapPayloadSchema,
  nodePayloadSchema,
  card333PayloadSchema,
  probePayloadSchema,
  qaPayloadSchema,
]);

export const SCHEMA_BY_MODE = {
  map: mapPayloadSchema,
  node: nodePayloadSchema,
  card333: card333PayloadSchema,
  probe: probePayloadSchema,
  qa: qaPayloadSchema,
} as const;

/**
 * §6.1.2 的自我验证规则在前端的兜底：
 * 返回可自动修复的问题清单（悬空的 prerequisites 引用、不一致的 relations）。
 * 这些不该触发重试 —— 直接修掉比让模型重生成一次更便宜、也更稳。
 */
export function lintMap(map: z.infer<typeof mapPayloadSchema>): {
  dropped: string[];
  repaired: string[];
} {
  const ids = new Set(map.nodes.map((n) => n.id));
  const dropped: string[] = [];
  const repaired: string[] = [];

  for (const node of map.nodes) {
    for (const field of ['prerequisites', 'related', 'successor'] as const) {
      const before = node[field].length;
      node[field] = node[field].filter((ref) => ref !== node.id && ids.has(ref));
      if (node[field].length !== before) dropped.push(`${node.id}.${field}`);
      node[field] = [...new Set(node[field])];
    }
  }

  // relations[] 必须以节点内联关系为准重建：画线时永远指向存在的节点，不会画出悬空边。
  // 方向约定：prerequisite/successor 按因果方向；related 无向，取 id 字典序保证唯一。
  const rebuilt = new Map<string, z.infer<typeof mapRelationSchema>>();
  for (const node of map.nodes) {
    for (const to of node.successor) rebuilt.set(`${node.id}->${to}`, { from: node.id, to, type: 'successor' });
    for (const to of node.prerequisites)
      rebuilt.set(`${to}->${node.id}`, { from: to, to: node.id, type: 'prerequisite' });
    for (const to of node.related) {
      const [a, b] = node.id < to ? [node.id, to] : [to, node.id];
      const key = `${a}~${b}`;
      if (rebuilt.has(key) || rebuilt.has(`${a}->${b}`) || rebuilt.has(`${b}->${a}`)) continue;
      rebuilt.set(key, { from: a, to: b, type: 'related' });
    }
  }
  // relations[] 里指向有效节点、且内联关系没覆盖到的边，保留（容忍模型多给信息）。
  for (const rel of map.relations) {
    const forward = `${rel.from}->${rel.to}`;
    const [a, b] = rel.from < rel.to ? [rel.from, rel.to] : [rel.to, rel.from];
    const undirected = `${a}~${b}`;
    if (rebuilt.has(forward) || rebuilt.has(undirected)) continue;
    if (!ids.has(rel.from) || !ids.has(rel.to)) {
      repaired.push(forward);
      continue;
    }
    rebuilt.set(rel.type === 'related' ? undirected : forward, rel);
  }

  if (repaired.length > 0 || map.relations.length !== rebuilt.size) {
    map.relations = [...rebuilt.values()];
  }
  return { dropped, repaired };
}
