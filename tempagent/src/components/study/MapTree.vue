<script setup lang="ts">
/**
 * 知识地图（左栏）—— 设计稿的纵向可折叠分组树。
 *
 * 与规划 §6.1.3 的「左→右层级树」不同：设计稿按 category 分四组
 * （数学基础 / 基础概念 / 经典算法 / 实践应用），组内是节点列表。
 * 分组树不画关系线，但「前置知识检查」仍然依赖 prerequisites，
 * 所以点击节点时依然会算「需要先学」。
 */
import { computed, ref } from 'vue';
import AppIcon from '../AppIcon.vue';
import { deriveCategories, type MapNode, type MapPayload, type NodeStatus } from '../../contract/types';

const props = defineProps<{
  map: MapPayload;
  statuses: Record<string, NodeStatus>;
  activeId: string | null;
}>();

const emit = defineEmits<{ select: [node: MapNode] }>();

const STATUS_TEXT: Record<NodeStatus, string> = {
  unlearned: '未学习',
  learning: '学习中',
  mastered: '已掌握',
  review: '建议复习',
};

const query = ref('');
const collapsed = ref<Set<string>>(new Set());

const categories = computed(() => deriveCategories(props.map));

const grouped = computed(() => {
  const q = query.value.trim().toLowerCase();
  return categories.value.map((category) => ({
    category,
    nodes: props.map.nodes.filter(
      (n) =>
        n.category === category &&
        (q === '' || n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)),
    ),
  }));
});

const searching = computed(() => query.value.trim() !== '');

function toggle(category: string) {
  const next = new Set(collapsed.value);
  if (next.has(category)) next.delete(category);
  else next.add(category);
  collapsed.value = next;
}

function isCollapsed(category: string) {
  return collapsed.value.has(category) && !searching.value;
}

function statusOf(node: MapNode): NodeStatus {
  return props.statuses[node.id] ?? node.status;
}
</script>

<template>
  <div class="tree">
    <div class="tree-search">
      <AppIcon name="mind-map" :size="15" class="tree-search__icon" />
      <input v-model="query" type="search" placeholder="搜索知识点…" aria-label="搜索知识点" />
    </div>

    <div class="tree-root">
      <span class="tree-root__dot" />
      <span class="tree-root__name">{{ map.topic }}</span>
    </div>

    <ul class="tree-groups">
      <template v-for="{ category, nodes } in grouped" :key="category">
        <li v-if="!searching || nodes.length > 0" class="tree-group">
          <button
            type="button"
            class="tree-group__head"
            :aria-expanded="!isCollapsed(category)"
            @click="toggle(category)"
          >
            <AppIcon
              name="chevron-down"
              :size="13"
              class="tree-group__caret"
              :class="{ 'is-closed': isCollapsed(category) }"
            />
            <span>{{ category }}</span>
            <span class="tree-group__count">{{ nodes.length }}</span>
          </button>

          <ul v-show="!isCollapsed(category)" class="tree-nodes">
            <li v-for="node in nodes" :key="node.id">
              <button
                type="button"
                class="tree-node"
                :class="[`is-${statusOf(node)}`, { 'is-active': activeId === node.id }]"
                :title="node.description"
                @click="emit('select', node)"
              >
                <AppIcon
                  v-if="statusOf(node) === 'mastered'"
                  name="check-circle"
                  :size="15"
                  class="tree-node__mark"
                />
                <span v-else class="tree-node__mark tree-node__mark--dot" />
                <span class="tree-node__name">{{ node.name }}</span>
                <span class="sr-only">{{ STATUS_TEXT[statusOf(node)] }}</span>
              </button>
            </li>
          </ul>
        </li>
      </template>
    </ul>

    <ul class="tree-legend">
      <li v-for="s in (['unlearned', 'learning', 'mastered'] as NodeStatus[])" :key="s">
        <span class="tree-legend__mark" :class="`is-${s}`" />
        {{ STATUS_TEXT[s] }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tree-search {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-muted);
  margin-bottom: 12px;
}

.tree-search:focus-within {
  border-color: var(--brand-400);
  background: var(--surface);
}

.tree-search__icon {
  color: var(--ink-400);
  flex: none;
}

.tree-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: none;
  font-size: 13.5px;
}

.tree-root {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 9px;
  font-weight: 600;
  color: var(--ink-900);
}

.tree-root__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--brand-600);
  flex: none;
}

.tree-groups {
  list-style: none;
}

.tree-group__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 4px;
  color: var(--ink-600);
  font-size: 13px;
  text-align: left;
  border-radius: 6px;
}

.tree-group__head:hover {
  background: var(--surface-muted);
}

.tree-group__caret {
  color: var(--ink-400);
  transition: transform 0.16s ease;
}

.tree-group__caret.is-closed {
  transform: rotate(-90deg);
}

.tree-group__count {
  margin-left: auto;
  color: var(--ink-400);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.tree-nodes {
  list-style: none;
  margin: 2px 0 6px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  color: var(--ink-600);
  text-align: left;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.tree-node:hover {
  background: var(--surface-muted);
}

.tree-node.is-active {
  background: var(--brand-50);
  color: var(--brand-700);
  font-weight: 600;
}

.tree-node__mark {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--success-600);
}

.tree-node__mark--dot {
  width: 8px;
  height: 8px;
  margin: 0 3.5px;
  border-radius: var(--radius-pill);
  background: transparent;
  border: 1.6px solid var(--ink-300);
}

.tree-node.is-learning .tree-node__mark--dot {
  background: var(--brand-600);
  border-color: var(--brand-600);
}

.tree-node.is-review .tree-node__mark--dot {
  background: var(--warn-600);
  border-color: var(--warn-600);
}

.tree-node.is-mastered .tree-node__name {
  color: var(--ink-600);
}

.tree-legend {
  display: flex;
  gap: 14px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  color: var(--ink-400);
  font-size: 12px;
}

.tree-legend li {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tree-legend__mark {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-pill);
  border: 1.6px solid var(--ink-300);
}

.tree-legend__mark.is-learning {
  background: var(--brand-600);
  border-color: var(--brand-600);
}

.tree-legend__mark.is-mastered {
  background: var(--success-600);
  border-color: var(--success-600);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
