/**
 * 学习状态追踪 —— §6.4。
 *
 * 本地优先：全部落在 localStorage，key 与文档 §6.4 一一对应。
 * 匿名同步（跨设备续学）在 §11.2「有时间再做」里，这里只把 deviceId 先发出来，
 * 后面要接 KV 时不用再改数据结构。
 */
import type { MapPayload, NodeStatus, ProbePayload, QaPayload } from '../contract/types';

const STORAGE_KEY = 'zhitu-partner/v1';
const DEVICE_KEY = 'zhitu-partner/deviceId';

/** 数字人的四种状态 —— §2.3「根据状态切换表情（思考、鼓励、追问、庆祝）」。 */
export type AvatarState = 'idle' | 'thinking' | 'encouraging' | 'probing' | 'celebrating';

export interface ChatMessage {
  id: string;
  role: 'user' | 'avatar';
  text: string;
  ts: number;
  /** 数字人说话时的表情。 */
  state?: AvatarState;
  /** 正在「打字」中 —— 渲染成三个跳动的点，对应 §2.3 的状态提示。 */
  pending?: boolean;
  /** 失败兜底提示（§2.3「我暂时没连上网络，先看看示例地图吧」）。 */
  degraded?: boolean;
  /** 知识问答的结构化回答（§6.5），用于渲染结论/例子/配图/关联概念。 */
  qa?: QaPayload;
}

/**
 * 333 六步向导的进度快照。
 *
 * §6.4 要求把「333 六步走到第几步」存下来「用于刷新后续学」，§14.9 也要求
 * 「刷新后状态不丢失」。只存一个步骤号是不够的——第 5 步的关键点自评是从
 * 第 4 步的复述判定推出来的，第 6 步要带着已答的题继续，所以整个向导状态
 * 一起存，回来才能真的接着学而不是重头再来。
 */
export interface StudyWizardSnapshot {
  phase: string;
  /** 第几步（1–6）—— §6.4 点名的那个字段。 */
  step: number;
  activation: string;
  recallText: string;
  recallResult: ProbePayload | null;
  marks: Array<'hit' | 'miss' | null>;
  quizIndex: number;
  verdicts: Array<ProbePayload | null>;
  skipped: number;
  /**
   * 向导启动时刻。刷新后续学要沿用它——否则「用时」会从刷新那一刻重新算，
   * 而 §8.1 的「单节点学习时长」正是拿这个值统计的。
   */
  startedAt: number;
}

export interface NodeRecord {
  nodeId: string;
  startedAt: number;
  completedAt?: number;
  /** 333 六步走到第几步（1–6），用于刷新后续学。 */
  step?: number;
  /** 未走完的 333 向导状态；走完或没开始时为 undefined。 */
  wizard?: StudyWizardSnapshot;
}

/** 与 §6.4 列出的 key 完全对应。 */
export interface PersistedState {
  version: 1;
  deviceId: string;
  topic: string | null;
  map: MapPayload | null;
  nodeStatus: Record<string, NodeStatus>;
  nodeRecords: Record<string, NodeRecord>;
  chatHistory: ChatMessage[];
  lastNodeId: string | null;
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'anonymous';
  }
}

export function createInitialState(): PersistedState {
  return {
    version: 1,
    deviceId: getDeviceId(),
    topic: null,
    map: null,
    nodeStatus: {},
    nodeRecords: {},
    chatHistory: [],
    lastNodeId: null,
  };
}

/** 读盘。任何异常都退回初始状态 —— 宁可丢进度，也不能白屏（交付标准）。 */
export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1) return createInitialState();
    return { ...createInitialState(), ...parsed, deviceId: getDeviceId() };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 隐私模式 / 配额满：静默降级为「不记忆」，不影响本次使用 */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** 顶部进度条「3/15 节点已掌握」（§6.4）。 */
export function computeProgress(state: PersistedState): { mastered: number; total: number } {
  const total = state.map?.nodes.length ?? 0;
  const mastered = state.map
    ? state.map.nodes.filter((n) => state.nodeStatus[n.id] === 'mastered').length
    : 0;
  return { mastered, total };
}

/** 刷新后的「欢迎回来」——§6.4：你上次学到 X，要继续吗？ */
export function lastStudiedNode(state: PersistedState) {
  if (!state.map || !state.lastNodeId) return null;
  return state.map.nodes.find((n) => n.id === state.lastNodeId) ?? null;
}

/** 前置知识检查（§6.2 第三层）：返回尚未掌握的前置节点。 */
export function unmetPrerequisites(state: PersistedState, nodeId: string) {
  if (!state.map) return [];
  const node = state.map.nodes.find((n) => n.id === nodeId);
  if (!node) return [];
  return node.prerequisites
    .map((id) => state.map!.nodes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .filter((n) => state.nodeStatus[n.id] !== 'mastered');
}
