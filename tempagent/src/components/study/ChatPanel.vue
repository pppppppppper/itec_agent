<script setup lang="ts">
/**
 * AI 学习伙伴（右栏）—— §6.5 知识问答 + 设计稿右栏。
 *
 * 整个学习过程里数字人的所有发言都落在这个面板：开场白、地图生成提示、
 * 前置提醒、追问、问答，保证「全程由同一位数字人陪伴」（§7.4 人设一致性）。
 */
import { nextTick, ref, watch } from 'vue';
import AppIcon from '../AppIcon.vue';
import StudyAvatar from './StudyAvatar.vue';
import LossCurve from './LossCurve.vue';
import type { ChatMessage } from '../../state/store';

const props = defineProps<{
  topic: string | null;
  nodeName: string | null;
  messages: ChatMessage[];
  busy: boolean;
}>();

const emit = defineEmits<{ ask: [question: string]; jump: [key: string] }>();

const draft = ref('');
const listEl = ref<HTMLElement | null>(null);

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    const el = listEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  },
);

function submit() {
  const text = draft.value.trim();
  if (!text || props.busy) return;
  draft.value = '';
  emit('ask', text);
}

function onKeydown(event: KeyboardEvent) {
  // 中文输入法组词时的回车不应该发送
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault();
    submit();
  }
}
</script>

<template>
  <aside class="chat" aria-label="AI 学习伙伴">
    <header class="chat__head">
      <StudyAvatar :state="busy ? 'thinking' : 'idle'" :size="36" :speaking="busy" />
      <div class="chat__head-text">
        <h2>AI 学习伙伴</h2>
        <p>{{ nodeName ? `结合「${nodeName}」为你解答` : '结合知识地图为你解答' }}</p>
      </div>
      <span v-if="nodeName" class="chat__badge">当前：{{ nodeName }}</span>
    </header>

    <div ref="listEl" class="chat__list">
      <p v-if="messages.length === 0" class="chat__empty">
        {{ topic ? '有不懂的地方随时问我。' : '先告诉我你想学什么，我来画一张知识地图。' }}
      </p>

      <template v-for="m in messages" :key="m.id">
        <div v-if="m.role === 'user'" class="msg msg--user">
          <div class="bubble bubble--user">{{ m.text }}</div>
        </div>

        <div v-else class="msg msg--avatar">
          <div class="bubble bubble--avatar" :class="{ 'is-degraded': m.degraded }">
            <span v-if="m.pending" class="typing" :aria-label="m.text">
              <i /><i /><i />
            </span>

            <template v-else>
              <p class="bubble__text">{{ m.text }}</p>

              <p v-if="m.qa?.reason" class="bubble__extra">{{ m.qa.reason }}</p>
              <p v-if="m.qa?.example" class="bubble__extra">{{ m.qa.example }}</p>
              <LossCurve v-if="m.qa?.visual" :visual="m.qa.visual" :height="120" compact />

              <div
                v-if="m.qa?.related_concepts && m.qa.related_concepts.length > 0"
                class="chips chips--tight"
              >
                <span class="chips__label">关联概念</span>
                <button
                  v-for="c in m.qa.related_concepts"
                  :key="c"
                  type="button"
                  class="chip"
                  @click="emit('jump', c)"
                >
                  {{ c }}
                </button>
              </div>

              <p v-if="m.qa?.next_step" class="bubble__next">{{ m.qa.next_step }}</p>
              <p v-if="m.qa?.counter_question" class="bubble__counter">
                <AppIcon name="info-circle" :size="13" class="bubble__counter-icon" />
                {{ m.qa.counter_question }}
              </p>
            </template>
          </div>
        </div>
      </template>
    </div>

    <div class="chat__input">
      <input
        v-model="draft"
        placeholder="继续提问，深入理解…"
        aria-label="向 AI 学习伙伴提问"
        @keydown="onKeydown"
      />
      <button
        type="button"
        class="chat__send"
        :disabled="busy || !draft.trim()"
        aria-label="发送"
        @click="submit"
      >
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

.chat__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.chat__head-text h2 {
  margin: 0;
  font-size: 15px;
  color: var(--ink-900);
}

.chat__head-text p {
  margin: 0;
  color: var(--ink-400);
  font-size: 12px;
}

.chat__badge {
  margin-left: auto;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 12px;
  white-space: nowrap;
}

.chat__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 2px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat__empty {
  margin: auto;
  color: var(--ink-400);
  font-size: 12.5px;
  text-align: center;
}

.msg {
  display: flex;
}

.msg--user {
  justify-content: flex-end;
}

.msg--avatar {
  justify-content: flex-start;
}

.bubble {
  max-width: 90%;
  padding: 10px 13px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  line-height: 1.7;
}

.bubble--user {
  background: var(--brand-600);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bubble--avatar {
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}

.bubble--avatar.is-degraded {
  background: #fffaf0;
  border-color: #fde9c8;
  color: #92400e;
}

.bubble__text {
  margin: 0;
  white-space: pre-wrap;
}

.bubble__extra {
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px dashed var(--border-strong);
  color: var(--ink-600);
  font-size: 13px;
}

.bubble__next {
  margin: 10px 0 0;
  color: var(--ink-400);
  font-size: 12.5px;
}

.bubble__counter {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 8px 0 0;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--brand-700);
  font-size: 12.5px;
}

.bubble__counter-icon {
  flex: none;
  margin-top: 3px;
}

.typing {
  display: inline-flex;
  gap: 4px;
  padding: 2px 0;
}

.typing i {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--ink-400);
  animation: blink 1.2s infinite ease-in-out;
}

.typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.typing i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes blink {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.chips--tight {
  margin-top: 10px;
}

.chips__label {
  color: var(--ink-400);
  font-size: 12.5px;
}

.chip {
  padding: 3px 11px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 12.5px;
}

.chip:hover {
  border-color: var(--brand-400);
}

.chat__input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  background: var(--surface);
}

.chat__input:focus-within {
  border-color: var(--brand-400);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.chat__input input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: none;
}

.chat__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  background: var(--brand-600);
  color: #fff;
  flex: none;
  transition: background-color 0.18s ease;
}

.chat__send:hover:not(:disabled) {
  background: var(--brand-700);
}

.chat__send:disabled {
  background: var(--border-strong);
  cursor: not-allowed;
}
</style>
