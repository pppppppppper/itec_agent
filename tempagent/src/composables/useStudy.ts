/**
 * 学习空间的全部状态与动作 —— 原来的 React App.tsx 状态逻辑，改成 Vue 组合式函数。
 *
 * 对应规划 §9 的排期：
 *   H1 ✅ 契约层 / fixtures / 数字人外壳 / 知识地图 / 三栏布局
 *   H2 ⏳ 节点详情深化与前置跳转
 *   H3 ⏳ 333 六步认知加工链（start333 就是它的入口）
 *   H4 ⏳ 真链路联调 + 移动端细化
 *   H5 ⏳ fallback 演练 + 彩排
 */
import { computed, reactive, ref, watch } from 'vue';
import { askQuestion, explainNode, generateMap, makeCard333, type StudyContext } from '../agent/modes';
import { isMock, warmUp } from '../agent/client';
import type { Card333Payload, MapNode, NodePayload, NodeStatus } from '../contract/types';
import {
  computeProgress,
  lastStudiedNode,
  loadState,
  saveState,
  unmetPrerequisites,
  type ChatMessage,
  type PersistedState,
} from '../state/store';
import { COPY } from '../copy';

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);

/**
 * 初始快照只在模块加载时读一次：既避免每个 ref 都去 parse localStorage，
 * 也让「刷新后欢迎回来」这句话能基于**刷新前**的状态判断。
 */
const INITIAL_STATE = loadState();

/** 地图生成后自动选中：优先「学习中」的节点，否则挑前置已掌握的第一个未学节点。 */
function pickRecommendedNode(state: PersistedState): MapNode | null {
  const map = state.map;
  if (!map) return null;
  const learning = map.nodes.find((n) => (state.nodeStatus[n.id] ?? n.status) === 'learning');
  if (learning) return learning;
  return (
    map.nodes.find(
      (n) =>
        (state.nodeStatus[n.id] ?? n.status) === 'unlearned' &&
        n.prerequisites.every((p) => state.nodeStatus[p] === 'mastered'),
    ) ??
    map.nodes[0] ??
    null
  );
}

export function useStudy() {
  const state = ref<PersistedState>(INITIAL_STATE);
  const activeId = ref<string | null>(INITIAL_STATE.lastNodeId);
  const detail = ref<NodePayload | null>(null);
  const card = ref<Card333Payload | null>(null);
  /** 333 六步向导是否正占据中栏。 */
  const cardActive = ref(false);
  const busy = reactive({ map: false, node: false, qa: false });
  const warmupStarted = ref(false);

  watch(state, (next) => saveState(next), { deep: true });

  const activeNode = computed(
    () => state.value.map?.nodes.find((n) => n.id === activeId.value) ?? null,
  );
  const progress = computed(() => computeProgress(state.value));
  const completedCount = computed(() => progress.value.mastered);

  const append = (message: ChatMessage) => {
    state.value.chatHistory.push(message);
  };

  const pushPending = (text: string, avatarState: ChatMessage['state']): string => {
    const id = uid();
    state.value.chatHistory.push({
      id,
      role: 'avatar',
      text,
      ts: Date.now(),
      state: avatarState,
      pending: true,
    });
    return id;
  };

  const settlePending = (id: string, patch: Partial<ChatMessage>) => {
    const target = state.value.chatHistory.find((m) => m.id === id);
    if (target) Object.assign(target, { pending: false }, patch);
  };

  const failPending = (id: string, error: unknown) => {
    settlePending(id, {
      text: `${COPY.degraded}（${error instanceof Error ? error.message : '未知错误'}）`,
      state: 'idle',
      degraded: true,
    });
  };

  /** 预热：§7.1 首条消息要拉起 Agent 运行环境，演示前必须先热身。 */
  const warm = () => {
    if (isMock || warmupStarted.value) return;
    warmupStarted.value = true;
    void warmUp();
  };

  /** 刷新回来时的「欢迎回来，你上次学到 X」（§6.4）。只在本地没有对话记录时补一句。 */
  const greetOnReturn = () => {
    if (INITIAL_STATE.chatHistory.length > 0) return;
    const last = lastStudiedNode(INITIAL_STATE);
    if (!last) return;
    append({ id: uid(), role: 'avatar', text: COPY.resume(last.name), ts: Date.now(), state: 'encouraging' });
  };

  /* ── 生成知识地图 ── */
  const submitTopic = async (raw: string, context: StudyContext = {}) => {
    const topic = raw.trim();
    if (!topic) {
      append({ id: uid(), role: 'avatar', text: COPY.emptyTopic, ts: Date.now(), state: 'idle' });
      return;
    }

    detail.value = null;
    card.value = null;
    cardActive.value = false;
    activeId.value = null;

    state.value = {
      ...state.value,
      chatHistory: [],
      topic,
      map: null,
      nodeStatus: {},
      nodeRecords: {},
      lastNodeId: null,
    };

    append({ id: uid(), role: 'user', text: `我想学：${topic}`, ts: Date.now() });
    const pendingId = pushPending(COPY.thinkingMap, 'thinking');
    busy.map = true;

    try {
      const result = await generateMap(topic, context);
      const map = result.payload;
      const nodeStatus: Record<string, NodeStatus> = {};
      for (const node of map.nodes) nodeStatus[node.id] = node.status;

      const next: PersistedState = {
        ...state.value,
        topic: map.topic,
        map,
        nodeStatus,
        lastNodeId: null,
      };
      const recommended = pickRecommendedNode(next);
      if (recommended) {
        activeId.value = recommended.id;
        next.lastNodeId = recommended.id;
      }
      state.value = next;

      settlePending(pendingId, {
        text: map.say ?? `我把「${map.topic}」拆成了 ${map.nodes.length} 个知识点。`,
        state: 'encouraging',
        degraded: result.degraded,
      });
    } catch (error) {
      failPending(pendingId, error);
    } finally {
      busy.map = false;
    }
  };

  /* ── 选中节点：前置提醒（本地判定，不用等 Agent）+ 并发拉讲解与 333 卡 ── */
  const selectNode = async (node: MapNode) => {
    const snapshot = state.value;
    activeId.value = node.id;
    detail.value = null;
    card.value = null;
    cardActive.value = false;

    const existing = snapshot.nodeRecords[node.id];
    state.value.nodeRecords[node.id] = {
      nodeId: node.id,
      startedAt: existing?.startedAt ?? Date.now(),
    };
    if (state.value.nodeStatus[node.id] !== 'mastered') {
      state.value.nodeStatus[node.id] = 'learning';
    }
    state.value.lastNodeId = node.id;

    const unmet = unmetPrerequisites(snapshot, node.id);
    append({
      id: uid(),
      role: 'avatar',
      text:
        unmet.length > 0
          ? COPY.needPrereq(unmet.map((n) => n.name))
          : COPY.readyFor(node.name),
      ts: Date.now(),
      state: unmet.length > 0 ? 'probing' : 'encouraging',
    });

    busy.node = true;
    try {
      const [nodeResult, cardResult] = await Promise.all([
        explainNode(node, snapshot.topic ?? '机器学习'),
        makeCard333(node.name),
      ]);
      detail.value = nodeResult.payload;
      card.value = cardResult.payload;
      if (nodeResult.degraded || cardResult.degraded) {
        append({ id: uid(), role: 'avatar', text: COPY.degraded, ts: Date.now(), state: 'idle', degraded: true });
      }
    } catch (error) {
      append({
        id: uid(),
        role: 'avatar',
        text: `${COPY.degraded}（${error instanceof Error ? error.message : '未知错误'}）`,
        ts: Date.now(),
        state: 'idle',
        degraded: true,
      });
    } finally {
      busy.node = false;
    }
  };

  /* ── 知识问答（§6.5） ── */
  const ask = async (question: string) => {
    append({ id: uid(), role: 'user', text: question, ts: Date.now() });
    const pendingId = pushPending('让我想想……', 'thinking');
    busy.qa = true;
    try {
      const result = await askQuestion(question, activeNode.value?.name ?? null);
      settlePending(pendingId, {
        text: result.payload.conclusion,
        qa: result.payload,
        state: 'encouraging',
        degraded: result.degraded,
      });
    } catch (error) {
      failPending(pendingId, error);
    } finally {
      busy.qa = false;
    }
  };

  /** 关联概念 / 关联节点的点击：命中地图节点就跳过去，否则当作一次提问。 */
  const jumpTo = (key: string) => {
    const node = state.value.map?.nodes.find((n) => n.id === key || n.name === key);
    if (node) void selectNode(node);
    else void ask(`什么是「${key}」？`);
  };

  /**
   * 刷新后把当前节点的讲解与 333 卡重新拉回来。
   *
   * 为什么需要它：`detail` / `card` 是内存态，刷新即丢；而 `activeId` 存在
   * localStorage 里会恢复。不补这一步，刷新后中栏会退化成地图里的那一句话简介——
   * 讲解、损失曲线、「考试复习 / 代码示例」两个 Tab、333 的 3 个关键点全没了，
   * 而且页面上看不出「没加载」，只是内容悄悄变少（规划 §14.9 要求刷新不丢状态）。
   *
   * 与 selectNode 的区别：不发数字人消息、不重复写 nodeRecords。
   */
  const restoreActiveNode = async () => {
    const node = activeNode.value;
    if (!node || detail.value) return;

    busy.node = true;
    try {
      const [nodeResult, cardResult] = await Promise.all([
        explainNode(node, state.value.topic ?? '机器学习'),
        makeCard333(node.name),
      ]);
      detail.value = nodeResult.payload;
      card.value = cardResult.payload;
    } catch {
      // 恢复失败就停在节点的基础信息上，不阻塞页面，也不弹错误
    } finally {
      busy.node = false;
    }
  };

  /** 333 向导的起点：默认走完整六步，也可直接从自测开始（§6.2 第四层的「生成自测题」）。 */
  const cardStartPhase = ref<'activation' | 'quiz'>('activation');

  const start333 = (phase: 'activation' | 'quiz' = 'activation') => {
    if (!card.value) return;
    cardStartPhase.value = phase;
    cardActive.value = true;
    append({ id: uid(), role: 'avatar', text: COPY.startStudy, ts: Date.now(), state: 'encouraging' });
  };

  const exitCard = () => {
    cardActive.value = false;
  };

  /** 六步走完：标记已掌握，写完成时间，数字人给出下一步建议。 */
  const completeNode = (summary?: { keyPointsHit: number; quizCorrect: number }) => {
    const id = activeId.value;
    if (!id) return;
    const node = state.value.map?.nodes.find((n) => n.id === id);
    if (!node) return;

    state.value.nodeStatus[id] = 'mastered';
    state.value.nodeRecords[id] = {
      nodeId: id,
      startedAt: state.value.nodeRecords[id]?.startedAt ?? Date.now(),
      completedAt: Date.now(),
      step: 6,
    };
    cardActive.value = false;

    // 挑下一步建议。
    // 必须先看刚学完这个节点的**后继**（§6.2 的「后继知识」），而不是全图扫第一个
    // 前置已满足的节点——地图是按分组排列的，全图扫描会挑到「数学基础」里的节点，
    // 于是刚学完梯度下降却被建议回头去学它的前置，方向是反的。
    const ready = (n: MapNode) =>
      n.id !== id &&
      state.value.nodeStatus[n.id] !== 'mastered' &&
      n.prerequisites.every((p) => state.value.nodeStatus[p] === 'mastered');

    const next =
      node.successor
        .map((sid) => state.value.map?.nodes.find((n) => n.id === sid))
        .filter((n): n is MapNode => Boolean(n))
        .find(ready) ?? state.value.map?.nodes.find(ready);

    const praise =
      summary && summary.quizCorrect >= 2
        ? `「${node.name}」你已经掌握了。`
        : `「${node.name}」这一步走完了，我把它标记为已掌握。`;

    const tail = next
      ? `接下来想学它的后继「${next.name}」吗？`
      : node.successor.length === 0
        ? '这是这条路径的终点，你可以回地图上挑别的分支。'
        : '这条路径上暂时没有可继续的节点了。';

    append({ id: uid(), role: 'avatar', text: `${praise}${tail}`, ts: Date.now(), state: 'celebrating' });
  };

  /** 顶部「新建学习主题」：清空当前进度，回到落地页重新输入。 */
  const reset = () => {
    state.value = {
      ...state.value,
      topic: null,
      map: null,
      nodeStatus: {},
      nodeRecords: {},
      chatHistory: [],
      lastNodeId: null,
    };
    activeId.value = null;
    detail.value = null;
    card.value = null;
    cardActive.value = false;
  };

  return {
    state,
    activeId,
    activeNode,
    detail,
    card,
    busy,
    cardActive,
    progress,
    completedCount,
    isMock,
    warm,
    greetOnReturn,
    submitTopic,
    selectNode,
    ask,
    jumpTo,
    start333,
    cardStartPhase,
    restoreActiveNode,
    exitCard,
    completeNode,
    reset,
  };
}
