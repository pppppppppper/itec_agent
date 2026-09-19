/**
 * 智图伙伴 · 前后端契约（唯一交界面）
 * =====================================
 *
 * ⚠️ 先澄清一件事，因为它决定了这份文件的性质：
 *
 *   OpenHex 平台**只约定传输层**（SSE 记录信封、内置卡片、工具调用），
 *   **不约定业务数据结构**。平台没有"知识地图"这个概念，也没有"333 学习卡"。
 *   平台给一根管子，管子里装什么，完全由本文件和 Agent 的 system prompt 约定。
 *
 *   所以这份文件不是"平台规范"，而是**你和做 Agent 的同学之间的私有约定**。
 *   你必须主动把它交给对方，让他照着写 prompt —— 他不会自己知道这些字段名。
 *
 * 逐条对应项目规划 V5.0 + 界面设计稿：
 *
 *   MapPayload      ← §6.1.1 数据模型 + 设计稿「知识地图」分组树
 *   NodePayload     ← §6.2 四层信息架构 + 设计稿三个 Tab
 *   Card333Payload  ← §6.3.5 数据结构示例
 *   ProbePayload    ← §6.3.3 苏格拉底式追问
 *
 * ## 三条硬约定
 *
 * 1. **Agent 的回复必须是纯 JSON**，不要「好的，这是你的地图：」这类前言，
 *    也不要 markdown 代码围栏。前端只做一次「抽取第一个 { 到最后一个 }」的
 *    容错，不做自然语言解析。
 * 2. **所有面向用户的话术都放在字段里**（`say` / `activation_prompt` /
 *    `recall_prompt` …）。Agent 不直接对用户说话，前端负责渲染。
 * 3. **mode 由前端在消息里显式指定**，见 `MODE_PREFIX`。平台文档只说
 *    「system prompt 中的 mode 字段切换」，没定义前端怎么触发，所以由我们约定死。
 */

/** 节点掌握状态 —— §6.1.3 状态色块 / 设计稿底部图例。 */
export type NodeStatus = 'unlearned' | 'learning' | 'mastered' | 'review';

/** 难度分层 —— §6.1.2 规定 1=基础概念 2=核心方法 3=进阶应用。 */
export type Difficulty = 1 | 2 | 3;

/** 关系类型 —— §6.1.1 relations[].type。 */
export type RelationType = 'prerequisite' | 'successor' | 'related';

export interface MapNode {
  id: string;
  name: string;
  /**
   * 所属分组 —— 设计稿「知识地图」的折叠分组：
   * 数学基础 / 基础概念 / 经典算法 / 实践应用。
   * §6.1.1 的原始模型里没有这一层，是设计稿引入的，所以这里显式补上。
   */
  category: string;
  description: string;
  difficulty: Difficulty;
  /** 预计学习分钟数。 */
  estimated_time: number;
  prerequisites: string[];
  related: string[];
  successor: string[];
  status: NodeStatus;
}

export interface MapRelation {
  from: string;
  to: string;
  type: RelationType;
}

/** 四种模式共有的信封字段。 */
interface Envelope {
  /**
   * 数字人这一轮要说的话。前端负责渲染成气泡。
   * 可选：缺省时前端用内置话术兜底（见 src/ui/copy.ts），保证 Agent 漏字段也不黑屏。
   */
  say?: string;
}

/** ── 模式 1：地图生成（§6.1） ───────────────────────────────── */
export interface MapPayload extends Envelope {
  mode: 'map';
  /** 用户输入的主题，回显用。 */
  topic: string;
  /**
   * 分组展示顺序。缺省时按 nodes 里 category 第一次出现的顺序推导，
   * 所以 Agent 可以只填 nodes[].category 而不填这里。
   */
  categories?: string[];
  /** §6.1.2：限定 8–15 个节点。 */
  nodes: MapNode[];
  /**
   * 关系层。分组树不画这些线，但「前置知识检查」（§6.2 第三层）依赖
   * prerequisites —— 所以这个字段仍然必须给。
   */
  relations: MapRelation[];
}

/** 损失曲线图 —— 设计稿中间栏那张「损失 vs 参数」的图。 */
export interface LossCurveVisual {
  kind: 'loss_curve';
  /** 下降路径上的采样点，前端按数据范围自动缩放绘制。 */
  steps: Array<{ param: number; loss: number }>;
  /** 山谷（最优点）。 */
  optimum: { param: number; loss: number };
  xLabel?: string;
  yLabel?: string;
  /** true 时画成来回震荡不收敛的轨迹（对应「学习率过大」）。 */
  oscillating?: boolean;
}

export type NodeVisual = LossCurveVisual;

/** ── 模式 2：节点讲解（§6.2 + 设计稿三 Tab） ─────────────────── */
export interface NodePayload extends Envelope {
  mode: 'node';
  id: string;
  name: string;

  /** Tab 1 · 通俗理解 —— 第一层「知识定位」+ 第二层「理解内容」 */
  definition: string;
  explanation: string;
  /** 第二层 · 一个具体例子 */
  example: string;
  /** 第二层 · 一个常见误区 */
  misconception: string;
  /** 可选配图。目前只实现了 loss_curve。 */
  visual?: NodeVisual;

  /** Tab 2 · 考试复习（§11.2「多种解释模式」）。缺省时前端显示「待生成」。 */
  exam_focus?: string;
  /** Tab 3 · 代码示例（同上）。 */
  code_example?: string;

  difficulty: Difficulty;
  estimated_time: number;
  /** 第三层 · 关系网络 */
  prerequisites: string[];
  related: string[];
  successor: string[];
}

/** ── 模式 3：333 学习卡（§6.3） ─────────────────────────────── */
export type QuestionType = 'causal' | 'conditional' | 'comparative';

export interface QuizQuestion {
  question: string;
  answer: string;
  explanation: string;
  /** §7.3：必须是因果/条件/对比三种，禁止「是什么」定义题。 */
  type: QuestionType;
}

export interface Card333Payload extends Envelope {
  mode: 'card333';
  concept: string;
  /** 第一步 · 激活先验 */
  activation_prompt: string;
  /** 第二步 · 核心解释（分两段，段间停顿确认） */
  explanation_part1: string;
  explanation_part2: string;
  /** 第三步 · 具体例子 */
  example: string;
  /** 第四步 · 用自己的话复述 */
  recall_prompt: string;
  /** 第五步 · 对照关键点（固定 3 个 —— 「333」的第二个 3） */
  key_points: string[];
  /** 第六步 · 检索型自测（固定 3 题，覆盖三种题型 —— 「333」的第三个 3） */
  questions: QuizQuestion[];
}

/** ── 模式 4：苏格拉底式追问（§6.3.3） ──────────────────────── */
export type Verdict = 'correct' | 'partial' | 'wrong' | 'unknown';

export interface ProbePayload extends Envelope {
  mode: 'probe';
  /** 对学生复述/作答的针对性反馈（§6.3.2 第四步的那种）。 */
  feedback?: string;
  /** 追问话术，默认「你是怎么想到这个答案的？」 */
  followup: string;
  /** 追问后的判断。第一轮（只拿到推理依据）时通常为 'unknown'。 */
  verdict: Verdict;
  /** 认知断层定位 —— §6.3.3「若答案对但推理有误，指出问题」。 */
  gap?: string;
  /** 情感确认 + 进步可视化（§6.3.4 的三层递进反馈）。 */
  encouragement?: string;
  /** 这条追问关联的概念，用于 AI 面板里的「关联概念」标签。 */
  related_concepts?: string[];
}

/**
 * ── 模式 5：知识问答（§6.5） ──────────────────────────────────
 * §11.2 里属于「有时间再做」，但设计稿的右栏就是它，所以契约先定下来，
 * 前端骨架可以照它搭，Agent 侧可以晚一点接。
 * 回答结构完全按 §6.5：直接结论 → 原因解释 → 简单例子 → 关联节点 → 推荐下一步 → 反问。
 */
export interface QaPayload extends Envelope {
  mode: 'qa';
  /** 用户问的问题，回显用。 */
  question: string;
  /** 直接结论 */
  conclusion: string;
  /** 原因解释 */
  reason: string;
  /** 简单例子 */
  example?: string;
  /** 关联节点（用节点 name，前端负责匹配 id 做跳转） */
  related_nodes?: string[];
  /** 关联概念标签（设计稿右栏「关联概念: 学习率」） */
  related_concepts?: string[];
  /** 配图 */
  visual?: NodeVisual;
  /** 推荐下一步 */
  next_step?: string;
  /** 反问或自测题 */
  counter_question?: string;
}

export type AgentPayload = MapPayload | NodePayload | Card333Payload | ProbePayload | QaPayload;
export type AgentMode = AgentPayload['mode'];

/**
 * mode 传递约定 —— 前端把这一段作为消息前缀发出，Agent 侧 system prompt 按它分流。
 * 放在正文里而不是 metadata：`SendRequest.metadata` 是否真能被 Agent 读到，
 * 我方尚未验证，不拿演示赌一个未验证的通道。
 */
export const MODE_PREFIX = '[[mode:';

export function encodeMessage(mode: AgentMode, body: string): string {
  return `${MODE_PREFIX}${mode}]] ${body}`;
}

/** 从 nodes 推导分组顺序（Agent 不填 categories 时的兜底）。 */
export function deriveCategories(map: Pick<MapPayload, 'nodes' | 'categories'>): string[] {
  if (map.categories?.length) return map.categories;
  return [...new Set(map.nodes.map((n) => n.category))];
}
