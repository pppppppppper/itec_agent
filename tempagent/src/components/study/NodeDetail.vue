<script setup lang="ts">
/**
 * 节点详情（中栏）—— §6.2 四层信息架构 + 设计稿的三个 Tab 与 333 学习法卡片。
 *
 * H1 交付范围：三个 Tab 的骨架 + 通俗理解（含损失曲线）+ 333 卡片的「3 个关键点」
 * 与入口按钮。六步认知加工链的完整交互属于 H3。
 */
import { computed, ref, watch } from 'vue';
import AppIcon from '../AppIcon.vue';
import LossCurve from './LossCurve.vue';
import type { Card333Payload, MapNode, MapPayload, NodePayload, NodeStatus } from '../../contract/types';

const props = defineProps<{
  node: MapNode;
  /** 用来把 relations 里的节点 id 显示成中文名（id 是给程序看的，不该给用户看）。 */
  map: MapPayload | null;
  /** 用于给未掌握的前置标「需要先学」。 */
  statuses?: Record<string, NodeStatus>;
  /** 没走完的 333 进度在第几步；有值说明可以继续。 */
  resumeStep?: number | null;
  detail: NodePayload | null;
  card: Card333Payload | null;
  status: NodeStatus;
  loadingDetail: boolean;
  loadingCard: boolean;
}>();

const emit = defineEmits<{
  jump: [key: string];
  start333: [phase: 'activation' | 'quiz'];
  ask: [question: string];
}>();

const STATUS_TEXT: Record<NodeStatus, string> = {
  unlearned: '未学习',
  learning: '学习中',
  mastered: '已掌握',
  review: '建议复习',
};

const DIFFICULTY_LABEL: Record<number, string> = {
  1: '基础概念',
  2: '核心方法',
  3: '进阶应用',
};

const TABS = [
  { id: 'explain', label: '通俗理解' },
  { id: 'exam', label: '考试复习' },
  { id: 'code', label: '代码示例' },
] as const;

const tab = ref<(typeof TABS)[number]['id']>('explain');

// 换节点时回到第一个 Tab，避免看到上一个节点的「代码示例」错位。
watch(
  () => props.node.id,
  () => {
    tab.value = 'explain';
  },
);

const related = () => props.detail?.related ?? props.node.related;

/** 难度 / 时长优先取 node 模式的返回值（更贴合该节点的实际讲解），退回地图字段。 */
/** 关系网络的三个分组，顺序按 §6.2：前置 → 相关 → 后继。 */
const relationRows = computed(() => [
  {
    label: '前置知识',
    ids: props.detail?.prerequisites ?? props.node.prerequisites,
    markUnmet: true,
  },
  { label: '相关概念', ids: related(), markUnmet: false },
  {
    label: '后继知识',
    ids: props.detail?.successor ?? props.node.successor,
    markUnmet: false,
  },
]);

const isMastered = (key: string) =>
  props.statuses?.[key] === 'mastered' || props.statuses?.[props.map?.nodes.find((n) => n.name === key)?.id ?? ''] === 'mastered';

const shownDifficulty = computed(() => props.detail?.difficulty ?? props.node.difficulty);
const shownTime = computed(() => props.detail?.estimated_time ?? props.node.estimated_time);

/**
 * relations 数组里存的是节点 id（如 decision_tree）。直接渲染会漏出英文 id，
 * 而用户只认识「决策树」。这里统一解析成 name；解析不到就原样返回，
 * 保证 Agent 直接给 name 时也能正常显示。
 */
function nameOf(key: string): string {
  const nodes = props.map?.nodes ?? [];
  return nodes.find((n) => n.id === key)?.name ?? nodes.find((n) => n.name === key)?.name ?? key;
}
</script>

<template>
  <article class="detail">
    <nav class="detail__crumb" aria-label="位置">
      <span>{{ node.category }}</span>
      <span class="detail__crumb-sep">/</span>
      <span class="detail__crumb-current">{{ node.name }}</span>
    </nav>

    <header class="detail__head">
      <h1 class="detail__title">{{ node.name }}</h1>
      <span class="badge" :class="`is-${status}`">{{ STATUS_TEXT[status] }}</span>
    </header>

    <!-- §6.2 第一层「知识定位」的三要素：难度 + 学习时间。
         这两个字段契约里一直有、地图树上也在用，但节点详情里此前完全没渲染，
         DIFFICULTY_LABEL 定义了却一次都没被引用过。 -->
    <p class="detail__meta">
      <span>难度 {{ shownDifficulty }} · {{ DIFFICULTY_LABEL[shownDifficulty] }}</span>
      <span class="detail__meta-dot" aria-hidden="true">·</span>
      <span>预计 {{ shownTime }} 分钟</span>
    </p>

    <div class="tabs" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        role="tab"
        class="tab"
        :class="{ 'is-active': tab === t.id }"
        :aria-selected="tab === t.id"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="detail__body">
      <div v-if="loadingDetail" class="skeleton" aria-hidden="true">
        <span style="width: 92%" /><span style="width: 78%" /><span style="width: 64%" />
      </div>

      <template v-else-if="tab === 'explain'">
        <p class="detail__lead">{{ detail?.explanation ?? node.description }}</p>

        <LossCurve v-if="detail?.visual" :visual="detail.visual" />

        <p v-if="detail?.definition" class="detail__sub">{{ detail.definition }}</p>

        <!-- §6.2 第二层「理解内容」：通俗解释、一个具体例子、一个常见误区。
             example 这个字段 fixture 里一直有（预测房价那段），此前从未渲染。 -->
        <section v-if="detail?.example" class="layer">
          <h3 class="layer__title">举个例子</h3>
          <p class="layer__body">{{ detail.example }}</p>
        </section>

        <!-- §6.2 第三层「关系网络」：前置知识、相关概念、后继知识。
             此前只渲染了「相关概念」，前置与后继都丢了——
             而「前置知识（未掌握则标『需要先学』）」是规划里点名的功能。 -->
        <section class="layer">
          <h3 class="layer__title">关系网络</h3>
          <div v-for="row in relationRows" :key="row.label" class="rel-row">
            <span class="rel-row__label">{{ row.label }}</span>
            <span v-if="row.ids.length === 0" class="rel-row__empty">—</span>
            <span v-else class="rel-row__chips">
              <button
                v-for="key in row.ids"
                :key="key"
                type="button"
                class="chip"
                :class="{
                  'chip--warn': row.markUnmet && !isMastered(key),
                  'chip--ok': isMastered(key),
                }"
                @click="emit('jump', key)"
              >
                {{ nameOf(key) }}
                <em v-if="row.markUnmet && !isMastered(key)" class="chip__note">需要先学</em>
              </button>
            </span>
          </div>
        </section>

        <!-- §6.2 第四层「学习入口」：开始 333 学习法、生成自测题、向 AI 提问 -->
        <section class="layer">
          <h3 class="layer__title">学习入口</h3>
          <div class="entries">
            <button type="button" class="entry" :class="{ 'entry--resume': resumeStep }" @click="emit('start333', 'activation')">
              <AppIcon name="study-board" :size="16" />
              <span>{{ resumeStep ? `继续 333 学习法（第 ${resumeStep} 步）` : '开始 333 学习法' }}</span>
            </button>
            <button type="button" class="entry" @click="emit('start333', 'quiz')">
              <AppIcon name="check-circle" :size="16" />
              <span>我直接测一下</span>
            </button>
            <button type="button" class="entry" @click="emit('ask', `用更简单的说法讲讲「${node.name}」`)">
              <AppIcon name="chat-sparkle" :size="16" />
              <span>向 AI 提问</span>
            </button>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'exam'">
        <p v-if="detail?.exam_focus" class="detail__lead">{{ detail.exam_focus }}</p>
        <p v-else class="detail__pending">
          「考试复习」视角需要 Agent 的 node 模式补充，当前未返回该字段。
        </p>

        <div v-if="detail?.misconception" class="callout">
          <strong>常见误区</strong>
          <p>{{ detail.misconception }}</p>
        </div>
      </template>

      <template v-else>
        <pre v-if="detail?.code_example" class="code"><code>{{ detail.code_example }}</code></pre>
        <p v-else class="detail__pending">
          「代码示例」需要 Agent 的 node 模式补充，当前未返回该字段。
        </p>
      </template>
    </div>

    <section class="card333">
      <header class="card333__head">
        <h2>
          <AppIcon name="study-board" :size="17" class="card333__icon" />
          333 学习法
        </h2>
        <span class="card333__hint">用更少的时间，掌握更核心的内容</span>
      </header>

      <ol class="card333__steps">
        <li
          v-for="(label, i) in ['3 分钟理解', '3 个关键点', '3 道自测题']"
          :key="label"
          class="step"
          :class="{ 'is-active': i === 1 }"
        >
          <span class="step__no">{{ i + 1 }}</span>
          {{ label }}
        </li>
      </ol>

      <div v-if="loadingCard" class="skeleton" aria-hidden="true">
        <span style="width: 90%" /><span style="width: 82%" /><span style="width: 70%" />
      </div>

      <ol v-else-if="card" class="points">
        <li v-for="(point, i) in card.key_points" :key="i">
          <span class="point__no">{{ i + 1 }}</span>
          <span>{{ point }}</span>
        </li>
      </ol>

      <button type="button" class="primary-button card333__cta" @click="emit('start333')">
        <span>开始自测</span>
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </section>
  </article>
</template>

<style scoped>
.detail__crumb {
  color: var(--ink-400);
  font-size: 12.5px;
  margin-bottom: 6px;
}

.detail__crumb-sep {
  margin: 0 6px;
}

.detail__crumb-current {
  color: var(--ink-600);
}

.detail__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -8px 0 14px;
  color: var(--ink-400);
  font-size: 12.5px;
}

.detail__meta-dot {
  color: var(--ink-300);
}

.detail__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.detail__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink-900);
}

.badge {
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge.is-unlearned {
  background: var(--surface-muted);
  color: var(--ink-500);
}
.badge.is-learning {
  background: var(--brand-50);
  color: var(--brand-700);
}
.badge.is-mastered {
  background: #eafaf0;
  color: var(--success-600);
}
.badge.is-review {
  background: #fff7ed;
  color: var(--warn-600);
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.tab {
  padding: 8px 14px;
  color: var(--ink-500);
  position: relative;
  font-size: 13.5px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.tab:hover {
  color: var(--brand-600);
  background: var(--brand-50);
}

.tab.is-active {
  color: var(--brand-700);
  font-weight: 600;
}

.tab.is-active::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--brand-600);
}

.detail__lead {
  margin: 0 0 12px;
  font-size: 15px;
  color: var(--ink-800);
  line-height: 1.8;
}

.detail__sub {
  margin: 12px 0 0;
  color: var(--ink-400);
  font-size: 12.5px;
}

.detail__pending {
  margin: 0;
  padding: 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--ink-400);
  background: #fbfcfe;
}

.callout {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: #fffaf0;
  border: 1px solid #fde9c8;
}

.callout strong {
  display: block;
  font-size: 12.5px;
  color: var(--warn-600);
  margin-bottom: 4px;
}

.callout p {
  margin: 0;
  color: #7c4a12;
}

.code {
  margin: 0;
  padding: 14px;
  border-radius: var(--radius-md);
  background: #101f3c;
  color: #e2e8f0;
  overflow: auto;
  font-size: 12.5px;
  line-height: 1.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.layer {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.layer__title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
}

.layer__body {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--ink-700);
}

.rel-row {
  display: flex;
  gap: 10px;
  padding: 5px 0;
  align-items: flex-start;
}

.rel-row__label {
  flex: none;
  width: 62px;
  padding-top: 3px;
  color: var(--ink-400);
  font-size: 12.5px;
}

.rel-row__empty {
  color: var(--ink-300);
  font-size: 12.5px;
  padding-top: 3px;
}

.rel-row__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chip__note {
  margin-left: 5px;
  padding: 0 4px;
  border-radius: 4px;
  background: #fff7ed;
  color: var(--warn-600);
  font-size: 10.5px;
  font-style: normal;
}

/* 未掌握的前置：要显眼，因为它是「你得先学这个」 */
.chip--warn {
  background: #fffaf0;
  border-color: #fde9c8;
  color: var(--warn-600);
}

/* 已掌握的：给一个克制但能一眼看出的正反馈 */
.chip--ok {
  background: #f3fbf6;
  border-color: #bbf7d0;
  color: var(--success-600);
}

.entries {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--brand-700);
  font-size: 13px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.entry--resume {
  background: #f3fbf6;
  border-color: #bbf7d0;
  color: var(--success-600);
  font-weight: 600;
}

.entry:hover {
  background: var(--brand-50);
  border-color: var(--brand-400);
  transform: translateY(-1px);
}

.chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.chips__label {
  color: var(--ink-400);
  font-size: 12.5px;
}

.chip {
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 12.5px;
  transition: border-color 0.15s ease;
}

.chip:hover {
  border-color: var(--brand-400);
}

.card333 {
  margin-top: 22px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: #fbfcfe;
}

.card333__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.card333__head h2 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 16px;
  color: var(--ink-900);
}

.card333__icon {
  color: var(--brand-600);
}

.card333__hint {
  color: var(--ink-400);
  font-size: 12px;
}

.card333__steps {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  flex-wrap: wrap;
}

.step {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  color: var(--ink-500);
  font-size: 12.5px;
}

.step.is-active {
  background: var(--brand-600);
  color: #fff;
  font-weight: 600;
}

.step__no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-pill);
  background: rgba(16, 31, 60, 0.12);
  font-size: 11px;
}

.step.is-active .step__no {
  background: rgba(255, 255, 255, 0.28);
}

.points {
  list-style: none;
  margin: 0 0 16px;
  display: grid;
  gap: 8px;
}

.points li {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
}

.point__no {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-pill);
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 11.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 11px;
  background: var(--brand-600);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: var(--shadow-brand);
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;
}

.primary-button:hover {
  background: var(--brand-700);
  transform: translateY(-1px);
}

.card333__cta {
  width: 100%;
}

.skeleton {
  display: grid;
  gap: 9px;
  padding: 6px 0;
}

.skeleton span {
  display: block;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--surface-muted), var(--border-strong), var(--surface-muted));
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite linear;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 560px) {
  .detail__title {
    font-size: 21px;
  }
  .card333__head {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
