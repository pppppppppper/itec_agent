<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import SelectField from './SelectField.vue'

const MAX_LENGTH = 50
const IDLE_HINT = '会自动检测无效、敏感或过于模糊的输入'

/** 明显不是学习主题的输入 */
const FILLER_TOPICS = [
  '不知道',
  '随便',
  '都行',
  '没有',
  '学点什么',
  '无',
  'test',
  'asdf',
  'null',
  'undefined',
]

const topic = defineModel('topic', { type: String, default: '' })
const role = defineModel('role', { type: String, default: '大学生' })
const level = defineModel('level', { type: String, default: '零基础' })

const emit = defineEmits(['submit'])

const roleOptions = ['大学生', '高中生', '职场人', '转行者', '教师']
const levelOptions = ['零基础', '有一些基础', '进阶提升']

// idle：初始提示 / loading：生成中 / ok：已生成 / warn：输入需要调整
const status = ref('idle')
const message = ref('')
let timer = null

const counter = computed(() => `${topic.value.length} / ${MAX_LENGTH}`)
const canSubmit = computed(() => topic.value.trim().length > 0 && status.value !== 'loading')

const hintText = computed(() => message.value || IDLE_HINT)
const hintIcon = computed(() => {
  if (status.value === 'loading') return 'spinner'
  if (status.value === 'warn') return 'info-circle'
  return 'check-circle'
})

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

/** 返回错误文案，通过校验时返回空字符串 */
function validate(value) {
  const text = value.trim()
  const compact = text.replace(/\s+/g, '')

  if (compact.length < 2) {
    return '主题太短啦，试试更具体的写法，例如「高等数学中的极限」。'
  }
  if (new Set(compact).size <= 1) {
    return '重复的字符不构成学习主题，换一个具体的知识点试试。'
  }
  if (/^\d+$/.test(compact) || /^[^\w\u4e00-\u9fa5]+$/.test(compact)) {
    return '这个输入太模糊了，试试「Python 数据分析」这样明确的主题。'
  }
  if (FILLER_TOPICS.includes(compact.toLowerCase())) {
    return '这是避免使用的表述，换成你想掌握的具体知识点吧。'
  }
  return ''
}

function resetStatus() {
  clearTimer()
  status.value = 'idle'
  message.value = ''
}

function submit() {
  if (!canSubmit.value) return

  const error = validate(topic.value)
  if (error) {
    status.value = 'warn'
    message.value = error
    return
  }

  status.value = 'loading'
  message.value = '正在拆解知识结构并生成学习地图…'

  clearTimer()
  timer = setTimeout(() => {
    timer = null
    const value = topic.value.trim()
    status.value = 'ok'
    message.value = `已为「${value}」生成学习地图，可以从最前面的概念开始学习了。`
    emit('submit', { topic: value, role: role.value, level: level.value })
  }, 1200)
}

watch(topic, resetStatus)
onBeforeUnmount(clearTimer)

defineExpose({ submit })
</script>

<template>
  <section class="prompt-card">
    <label class="prompt-card__label" for="learn-topic">
      <AppIcon name="sparkle" :size="20" class="prompt-card__label-icon" />
      <span>我想学习</span>
    </label>

    <textarea
      id="learn-topic"
      v-model="topic"
      class="prompt-card__input"
      :maxlength="MAX_LENGTH"
      rows="2"
      placeholder="例如：机器学习入门、高等数学中的极限…"
      @keydown.enter.exact.prevent="submit"
    ></textarea>

    <div class="prompt-card__toolbar">
      <SelectField v-model="role" :options="roleOptions" icon="graduation" label="学习者身份" />
      <SelectField v-model="level" :options="levelOptions" icon="level" label="当前基础" />

      <div class="prompt-card__actions">
        <span class="prompt-card__counter">{{ counter }}</span>
        <button type="button" class="primary-button" :disabled="!canSubmit" @click="submit">
          <template v-if="status === 'loading'">
            <AppIcon name="spinner" :size="17" class="prompt-card__spin" />
            <span>生成中…</span>
          </template>
          <template v-else>
            <span>生成学习地图</span>
            <AppIcon name="arrow-right" :size="17" />
          </template>
        </button>
      </div>
    </div>

    <p class="prompt-card__hint" :class="`is-${status}`">
      <AppIcon :name="hintIcon" :size="16" class="prompt-card__hint-icon" />
      <span>{{ hintText }}</span>
    </p>
  </section>
</template>

<style scoped>
.prompt-card {
  width: min(760px, 100%);
  margin: 32px auto 0;
  padding: 22px 24px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 2px 3px rgba(28, 60, 120, 0.03),
    0 18px 42px rgba(28, 60, 120, 0.08);
  text-align: left;
}

.prompt-card__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink-900);
  cursor: pointer;
}

.prompt-card__label-icon {
  color: var(--brand-600);
}

.prompt-card__input {
  display: block;
  width: 100%;
  min-height: 76px;
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--ink-900);
  font-size: 17px;
  line-height: 1.6;
  resize: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.prompt-card__input::placeholder {
  color: var(--ink-400);
}

.prompt-card__input:focus {
  outline: none;
  border-color: var(--brand-400);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.prompt-card__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.prompt-card__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}

.prompt-card__counter {
  font-size: 13px;
  color: var(--ink-400);
  font-variant-numeric: tabular-nums;
}

.primary-button {
  display: inline-flex;
  align-items: center;
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
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.primary-button:hover:not(:disabled) {
  background: var(--brand-700);
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.32);
}

.primary-button:active:not(:disabled) {
  transform: translateY(0);
}

.primary-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.prompt-card__spin {
  animation: spin 0.9s linear infinite;
}

.prompt-card__hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--ink-500);
  text-align: center;
}

.prompt-card__hint.is-idle .prompt-card__hint-icon {
  color: var(--brand-500);
}

.prompt-card__hint.is-ok {
  color: var(--success-600);
}

.prompt-card__hint.is-warn {
  color: var(--warn-600);
}

.prompt-card__hint.is-loading .prompt-card__hint-icon {
  color: var(--brand-500);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 560px) {
  .prompt-card {
    padding: 18px 16px 14px;
  }

  .prompt-card__toolbar > * {
    flex: 1 1 100%;
  }

  .prompt-card__actions {
    margin-left: 0;
    justify-content: space-between;
  }

  .primary-button {
    justify-content: center;
    flex: 1;
  }
}
</style>
