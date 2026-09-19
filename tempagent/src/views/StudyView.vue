<script setup lang="ts">
/**
 * 学习空间 —— 三栏仪表盘（设计稿）。
 *   左：知识地图（分组树）
 *   中：节点详情 + 333 学习法
 *   右：AI 学习伙伴
 *
 * 落地页提交主题后跳到 /study?topic=…&role=…&level=…，
 * 这里读完参数立刻 router.replace 把 query 清掉 —— 刷新页面不会重新生成一次地图
 * （既省钱，也避免同一份地图出现两份不同的内容）。
 */
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '../components/AppIcon.vue';
import ChatPanel from '../components/study/ChatPanel.vue';
import MapTree from '../components/study/MapTree.vue';
import NodeDetail from '../components/study/NodeDetail.vue';
import StudyCard333 from '../components/study/StudyCard333.vue';
import { useStudy } from '../composables/useStudy';
import type { MapNode } from '../contract/types';

const route = useRoute();
const router = useRouter();
const {
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
  exitCard,
  completeNode,
  reset,
} = useStudy();

const booting = ref(true);

onMounted(async () => {
  warm();

  const topic = route.query.topic;
  if (typeof topic === 'string' && topic.trim()) {
    const role = typeof route.query.role === 'string' ? route.query.role : undefined;
    const level = typeof route.query.level === 'string' ? route.query.level : undefined;
    await submitTopic(topic, { role, level });
    void router.replace({ path: '/study' });
  } else if (!state.value.map) {
    // 没有主题也没有历史进度：回落地页输入
    void router.replace('/');
    return;
  } else {
    greetOnReturn();
  }

  booting.value = false;
});

function onSelect(node: MapNode) {
  void selectNode(node);
}

function newTopic() {
  reset();
  void router.push('/');
}
</script>

<template>
  <div class="study">
    <header class="study-header">
      <div class="study-header__inner">
        <RouterLink class="brand" to="/">
          <svg class="brand__mark" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path
              d="M8.6 8.4 18.8 12.3M18.8 12.3 11.8 20.4M11.8 20.4 8.6 8.4"
              stroke="#3f6fdd"
              stroke-width="1.7"
              stroke-linecap="round"
              opacity="0.65"
            />
            <circle cx="8.6" cy="8.4" r="3.5" fill="#2f6bf0" />
            <circle cx="18.8" cy="12.3" r="2.9" fill="#7aa7f8" />
            <circle cx="11.8" cy="20.4" r="2.9" fill="#7aa7f8" />
          </svg>
          <span class="brand__name">智图伙伴</span>
        </RouterLink>

        <nav class="study-nav" aria-label="主导航">
          <span class="study-nav__item is-active">学习空间</span>
          <button type="button" class="study-nav__item" disabled title="待接入">概念检索</button>
          <button type="button" class="study-nav__item" disabled title="待接入">学习记录</button>
        </nav>

        <button type="button" class="study-header__cta" @click="newTopic">
          <AppIcon name="sparkle" :size="15" />
          <span>新建学习主题</span>
        </button>
      </div>
    </header>

    <main class="workspace">
      <section class="col col--map">
        <h2 class="col__title">
          <AppIcon name="mind-map" :size="16" class="col__icon" />
          知识地图
        </h2>
        <MapTree
          v-if="state.map"
          :map="state.map"
          :statuses="state.nodeStatus"
          :active-id="activeId"
          @select="onSelect"
        />
      </section>

      <section class="col col--detail">
        <div class="topic-head">
          <div>
            <h2 class="topic-title">{{ state.topic }}</h2>
            <p class="topic-sub">从知识地图开始，一步步理解与掌握</p>
          </div>
          <div class="progress">
            <span class="progress__text">
              已学习 {{ progress.mastered }} / {{ progress.total }} 个知识点
            </span>
            <span class="progress__bar">
              <span
                class="progress__fill"
                :style="{
                  width: `${progress.total ? (progress.mastered / progress.total) * 100 : 0}%`,
                }"
              />
            </span>
          </div>
        </div>

        <div v-if="booting && !state.map" class="skeleton" aria-hidden="true">
          <span style="width: 92%" /><span style="width: 78%" /><span style="width: 68%" />
        </div>

        <!-- 333 六步向导会占据中栏；返回后回到节点详情 -->
        <StudyCard333
          v-if="cardActive && card"
          :card="card"
          :completed-count="completedCount"
          @exit="exitCard"
          @complete="completeNode"
        />

        <NodeDetail
          v-else-if="activeNode"
          :node="activeNode"
          :detail="detail"
          :card="card"
          :status="state.nodeStatus[activeNode.id] ?? activeNode.status"
          :loading-detail="busy.node && !detail"
          :loading-card="busy.node && !card"
          @jump="jumpTo"
          @start333="start333"
        />

        <p v-else class="detail__pending">从左边选一个知识点开始。</p>
      </section>

      <section class="col col--chat">
        <ChatPanel
          :topic="state.topic"
          :node-name="activeNode?.name ?? null"
          :messages="state.chatHistory"
          :busy="busy.qa"
          @ask="(q) => ask(q)"
          @jump="jumpTo"
        />
      </section>
    </main>

    <p v-if="isMock" class="mock-note">
      当前是 mock 模式（本地 fixture 数据，未连接 Agent）。配置 <code>VITE_AGENT_ID</code> 后自动切换为真实 Agent。
    </p>
  </div>
</template>

<style scoped>
.study {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.study-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid var(--border);
  backdrop-filter: saturate(180%) blur(12px);
}

.study-header__inner {
  display: flex;
  align-items: center;
  gap: 24px;
  height: var(--header-height);
  width: min(1500px, 100% - 48px);
  margin-inline: auto;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.brand__mark {
  width: 27px;
  height: 27px;
}

.brand__name {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-900);
}

.study-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.study-nav__item {
  position: relative;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--ink-600);
}

.study-nav__item:disabled {
  color: var(--ink-300);
  cursor: not-allowed;
}

.study-nav__item.is-active {
  color: var(--brand-600);
  font-weight: 600;
}

.study-nav__item.is-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 22px;
  height: 2px;
  border-radius: 2px;
  background: var(--brand-600);
  transform: translateX(-50%);
}

.study-header__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  background: var(--brand-600);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: var(--shadow-brand);
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;
}

.study-header__cta:hover {
  background: var(--brand-700);
  transform: translateY(-1px);
}

.workspace {
  flex: 1;
  width: min(1500px, 100% - 48px);
  margin-inline: auto;
  padding: 20px 0 40px;
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr) 368px;
  gap: 20px;
  align-items: start;
}

.col {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 16px;
}

.col--map,
.col--chat {
  position: sticky;
  top: calc(var(--header-height) + 14px);
}

.col--map {
  max-height: calc(100vh - var(--header-height) - 34px);
  overflow: auto;
}

.col--chat {
  height: calc(100vh - var(--header-height) - 34px);
  display: flex;
}

.col__title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
}

.col__icon {
  color: var(--brand-600);
}

.topic-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.topic-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink-900);
}

.topic-sub {
  margin: 2px 0 0;
  color: var(--ink-400);
  font-size: 12.5px;
}

.progress {
  text-align: right;
  min-width: 170px;
}

.progress__text {
  display: block;
  color: var(--ink-500);
  font-size: 12.5px;
  margin-bottom: 6px;
}

.progress__bar {
  display: block;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  overflow: hidden;
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, var(--brand-500), var(--success-500));
  transition: width 0.4s ease;
}

.detail__pending {
  margin: 0;
  padding: 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--ink-400);
  background: #fbfcfe;
}

.banner {
  margin: 16px 0 0;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--brand-50);
  border: 1px solid var(--border-strong);
  color: var(--brand-700);
  font-size: 12.5px;
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

.mock-note {
  width: min(1500px, 100% - 48px);
  margin: 0 auto 24px;
  color: var(--ink-400);
  font-size: 12px;
  text-align: center;
}

.mock-note code {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 5px;
}

/* 先并栏，再单列（§10 移动端保底：牺牲双栏美观换可用性） */
@media (max-width: 1180px) {
  .workspace {
    grid-template-columns: 248px minmax(0, 1fr);
  }
  .col--chat {
    grid-column: 1 / -1;
    position: static;
    height: auto;
    min-height: 420px;
  }
}

@media (max-width: 820px) {
  .study-header__inner {
    gap: 12px;
    width: min(1500px, 100% - 28px);
  }
  .study-nav {
    display: none;
  }
  .study-header__cta span {
    display: none;
  }
  .workspace {
    grid-template-columns: 1fr;
    width: min(1500px, 100% - 28px);
    gap: 14px;
  }
  .col--map {
    position: static;
    max-height: none;
  }
  .topic-head {
    flex-direction: column;
    gap: 10px;
  }
  .progress {
    text-align: left;
    width: 100%;
  }
}
</style>
