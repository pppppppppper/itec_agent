/**
 * Agent 回复 → 契约对象。
 *
 * §7.2 的三层保障在这里的第 1、2 层：
 *   ① 抽取（剥掉 markdown 围栏、取第一个 { 到最后一个 }）
 *   ② 校验（zod 结构校验 + 地图的自动修复）
 *   ③ 重试 —— 由 parse.ts 产出「错误说明」，调用方把它拼回消息发一次（见 buildRepairMessage）
 *   ④ 静态兜底 —— 由 src/agent/modes.ts 负责
 */
import {
  SCHEMA_BY_MODE,
  lintMap,
  mapPayloadSchema,
} from './schema';
import type { AgentMode, AgentPayload } from './types';

export type ParseOk<T> = { ok: true; value: T; warnings: string[] };
export type ParseFail = { ok: false; error: string; raw: string };
export type ParseResult<T> = ParseOk<T> | ParseFail;

export type PayloadOf<M extends AgentMode> = Extract<AgentPayload, { mode: M }>;

/** 剥掉 ```json 围栏，再取第一个 { 到最后一个 } —— 只做机械容错，不做语义猜测。 */
export function extractJsonObject(text: string): string | null {
  const withoutFence = text
    .replace(/^\s*```(?:json|JSON)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return withoutFence.slice(start, end + 1);
}

/** 两处最廉价的容错：对象/数组尾逗号。失败就放弃，不做更激进的改写。 */
function tryParseLoose(json: string): unknown | undefined {
  try {
    return JSON.parse(json);
  } catch {
    /* 继续尝试修复 */
  }
  try {
    return JSON.parse(json.replace(/,(\s*[}\]])/g, '$1'));
  } catch {
    return undefined;
  }
}

export function parseAgentPayload<M extends AgentMode>(
  mode: M,
  text: string,
): ParseResult<PayloadOf<M>> {
  const raw = extractJsonObject(text);
  if (!raw) {
    return { ok: false, error: '回复里没有找到 JSON 对象（需要以 { 开头、} 结尾）', raw: text };
  }

  const decoded = tryParseLoose(raw);
  if (decoded === undefined) {
    return { ok: false, error: 'JSON 语法错误，无法解析（注意不要输出注释、尾逗号或未转义的换行）', raw };
  }

  const result = validatePayload(mode, decoded);
  return result.ok ? result : { ...result, raw };
}

/**
 * 校验一个**已经解析好的对象**。fixtures 走这条路径，
 * 所以「兜底静态数据」和「Agent 真实输出」永远受同一份 Schema 约束，不可能漂移。
 */
export function validatePayload<M extends AgentMode>(
  mode: M,
  decoded: unknown,
): ParseResult<PayloadOf<M>> {
  const parsed = SCHEMA_BY_MODE[mode].safeParse(decoded);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error), raw: JSON.stringify(decoded) };
  }

  const warnings: string[] = [];
  if (mode === 'map') {
    const map = mapPayloadSchema.parse(parsed.data);
    const { dropped, repaired } = lintMap(map);
    if (dropped.length) warnings.push(`已忽略悬空引用：${dropped.join('、')}`);
    if (repaired.length) warnings.push(`已丢弃无效关系：${repaired.join('、')}`);
    return { ok: true, value: map as PayloadOf<M>, warnings };
  }

  return { ok: true, value: parsed.data as PayloadOf<M>, warnings };
}

function formatZodError(error: import('zod').ZodError): string {
  return error.issues
    .slice(0, 6)
    .map((issue) => `${issue.path.join('.') || '(根)'}: ${issue.message}`)
    .join('；');
}

/**
 * §7.2 的「携带错误信息重试」—— 把校验错误拼成一条给 Agent 的修正指令。
 * 注意措辞：只要它改格式，不要它改内容。
 */
export function buildRepairMessage(mode: AgentMode, body: string, error: string): string {
  return [
    `上一次输出不符合 ${mode} 模式的 JSON Schema，校验错误如下：`,
    error,
    '请只修正 JSON 结构（字段名、类型、必填项、数组长度），不要改变知识点内容，不要添加任何解释文字，直接输出修正后的纯 JSON。',
    '',
    '原始请求：',
    body,
  ].join('\n');
}
