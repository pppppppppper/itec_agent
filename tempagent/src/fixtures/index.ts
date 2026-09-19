/**
 * 静态兜底数据 —— 取自项目规划 V5.0 与界面设计稿：
 *   map.machine-learning  ← §7.1「失败兜底」列 + 设计稿「知识地图」分组树（4 组 × 3 = 12 个节点）
 *   node.gradient-descent ← §6.2 四层信息架构 + 设计稿三个 Tab
 *   card.gradient-descent ← §6.3.5 数据结构示例
 *   qa.gradient-descent   ← §6.5 知识问答 + 设计稿右栏两条问答
 *
 * 三重身份，不是「为了开发方便」的临时产物：
 *   1. mock 模式下前端唯一的数据来源（H1–H3 完全不依赖 Agent 同学）
 *   2. 线上 AI 失败时的静态兜底（交付标准「AI 失败不出现空白页」）
 *   3. 契约的活样例 —— 校验用的就是真 Agent 那一套 Schema
 */
import { validatePayload, type PayloadOf } from '../contract/parse';
import mapMachineLearning from './map.machine-learning.json';
import nodeGradientDescent from './node.gradient-descent.json';
import cardGradientDescent from './card.gradient-descent.json';
import qaGradientDescent from './qa.gradient-descent.json';

function must<M extends 'map' | 'node' | 'card333' | 'qa'>(
  mode: M,
  raw: unknown,
  name: string,
): PayloadOf<M> {
  const result = validatePayload(mode, raw);
  if (!result.ok) {
    // fixture 违反契约属于开发期错误，直接炸掉，别让它悄悄进到演示里。
    throw new Error(`fixture ${name} 不符合契约：${result.error}`);
  }
  return result.value;
}

export const FIXTURE_MAP = must('map', mapMachineLearning, 'map.machine-learning');
export const FIXTURE_NODE_GRADIENT_DESCENT = must('node', nodeGradientDescent, 'node.gradient-descent');
export const FIXTURE_CARD_GRADIENT_DESCENT = must('card333', cardGradientDescent, 'card.gradient-descent');

export const FIXTURE_QA: PayloadOf<'qa'>[] = (qaGradientDescent as unknown[]).map((raw, i) =>
  must('qa', raw, `qa.gradient-descent[${i}]`),
);
