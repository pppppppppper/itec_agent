<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import FeatureGrid from '../components/FeatureGrid.vue'
import HeroBackdrop from '../components/HeroBackdrop.vue'
import LearnRequestCard from '../components/LearnRequestCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import TopicChips from '../components/TopicChips.vue'

const router = useRouter()

const topic = ref('')
const role = ref('大学生')
const level = ref('零基础')
const showGuide = ref(false)

const recommendations = ['高等数学中的极限', 'Python 数据分析']
const topicSuggestions = ['机器学习', '高等数学', 'Python 编程', '英语写作', '数据结构']

const guidelines = [
  {
    tone: 'ok',
    icon: 'check-circle',
    text: '推荐：写具体的知识点或能力目标，例如「高等数学中的极限」。',
  },
  {
    tone: 'ok',
    icon: 'check-circle',
    text: '推荐：带上学习目的或场景，例如「用 Python 做数据分析」。',
  },
  {
    tone: 'warn',
    icon: 'info-circle',
    text: '避免：无意义的重复字符（啊啊啊）、纯数字（123）或过于宽泛的表述（我要学习）。',
  },
]

function useTopic(value) {
  topic.value = value
}

/**
 * LearnRequestCard 校验通过后抛出 submit —— 这里才是真正「进入学习空间」的地方。
 * 之前这个事件是没人接的，卡片自己 setTimeout 假装生成完了。
 * 主题与学习者背景一起带进 /study，Agent 侧会用 role/level 调整难度与措辞。
 */
function startStudy({ topic: value, role: roleValue, level: levelValue }) {
  router.push({ path: '/study', query: { topic: value, role: roleValue, level: levelValue } })
}
</script>

<template>
  <div id="top" class="landing">
    <AppHeader />

    <main class="landing__main">
      <HeroBackdrop />

      <div class="shell">
        <section class="hero">
          <p class="hero__badge">AI 驱动的个性化学习空间</p>
          <h1 class="hero__title">输入一个主题，开启你的学习地图</h1>
          <p class="hero__subtitle">
            AI 将为你拆解知识结构、讲解核心概念，并用 333 学法帮助你真正掌握。
          </p>

          <LearnRequestCard
            v-model:topic="topic"
            v-model:role="role"
            v-model:level="level"
            @submit="startStudy"
          />

          <div class="hero__guide">
            <button
              v-for="item in recommendations"
              :key="item"
              type="button"
              class="guide-chip guide-chip--ok"
              @click="useTopic(item)"
            >
              <AppIcon name="check-circle" :size="15" class="guide-chip__icon" />
              <span>推荐：{{ item }}</span>
            </button>

            <span class="guide-chip guide-chip--avoid">
              <AppIcon name="info-circle" :size="15" class="guide-chip__icon" />
              <span>请避免：啊啊啊、123、无明确学习目标</span>
            </span>

            <span class="guide__divider" aria-hidden="true"></span>

            <button
              type="button"
              class="guide__link"
              aria-controls="input-guide"
              :aria-expanded="showGuide"
              @click="showGuide = !showGuide"
            >
              <span>查看输入规范</span>
              <AppIcon
                name="arrow-right"
                :size="14"
                class="guide__link-icon"
                :class="{ 'is-open': showGuide }"
              />
            </button>
          </div>

          <Transition name="guide">
            <div v-if="showGuide" id="input-guide" class="guide-panel">
              <p class="guide-panel__title">输入规范</p>
              <ul>
                <li v-for="item in guidelines" :key="item.text" class="guide-panel__item">
                  <AppIcon
                    :name="item.icon"
                    :size="15"
                    :class="`guide-panel__icon is-${item.tone}`"
                  />
                  <span>{{ item.text }}</span>
                </li>
              </ul>
            </div>
          </Transition>
        </section>

        <TopicChips :topics="topicSuggestions" :active="topic" @select="useTopic" />
        <FeatureGrid />
      </div>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.landing {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
}

.landing__main {
  position: relative;
  padding-bottom: 4px;
}

.hero {
  position: relative;
  padding-top: 46px;
  text-align: center;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 15px;
  border-radius: var(--radius-pill);
  background: rgba(37, 99, 235, 0.07);
  border: 1px solid rgba(37, 99, 235, 0.14);
  color: var(--brand-600);
  font-size: 13px;
  font-weight: 500;
}

.hero__title {
  margin-top: 20px;
  font-size: clamp(28px, 4vw, 46px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--ink-900);
}

.hero__subtitle {
  margin-top: 14px;
  font-size: 16px;
  color: var(--ink-500);
}

.hero__guide {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  font-size: 13px;
}

.guide-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border: 1px solid #eaf1fb;
  border-radius: 9px;
  background: var(--surface-muted);
  color: var(--ink-600);
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.guide-chip--ok .guide-chip__icon {
  color: var(--success-600);
}

.guide-chip--avoid .guide-chip__icon {
  color: var(--ink-400);
}

button.guide-chip:hover {
  color: var(--brand-600);
  background: var(--brand-50);
  border-color: var(--brand-200);
}

.guide__divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--border-strong);
}

.guide__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 4px;
  color: var(--brand-600);
  font-weight: 500;
}

.guide__link:hover {
  color: var(--brand-700);
  text-decoration: underline;
}

.guide__link-icon {
  transition: transform 0.2s ease;
}

.guide__link-icon.is-open {
  transform: rotate(90deg);
}

.guide-panel {
  width: min(760px, 100%);
  margin: 14px auto 0;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.guide-panel__title {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
}

.guide-panel__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  font-size: 13.5px;
  color: var(--ink-600);
}

.guide-panel__icon {
  margin-top: 3px;
}

.guide-panel__icon.is-ok {
  color: var(--success-600);
}

.guide-panel__icon.is-warn {
  color: var(--ink-400);
}

.guide-enter-active,
.guide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.guide-enter-from,
.guide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .hero {
    padding-top: 34px;
  }

  .hero__subtitle {
    font-size: 15px;
  }
}
</style>
