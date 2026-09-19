<script setup lang="ts">
/**
 * 333 学习卡 · 六步认知加工链（§6.3.2）
 * ======================================
 * 这是整个产品的核心，也是「333」这个名字的来源：
 *
 *   3 分钟理解   → 第 1 步 激活先验 · 第 2 步 核心解释 · 第 3 步 具体例子
 *   3 个关键点   → 第 4 步 用自己的话复述 · 第 5 步 对照关键点
 *   3 道自测题   → 第 6 步 检索型自测（每题先追问推理依据，再给判断）
 *
 * 学习科学依据（§6.3.1）：
 *   · 认知负荷管理 —— 每段解释都停一下确认，别一次性灌
 *   · 生成效应     —— 第 4 步逼学生用自己的话复述，这是最关键的一步
 *   · 检索练习效应 —— 第 6 步是回忆而不是重读，保留率高近 40%
 *
 * 苏格拉底式追问（§6.3.3）在第 6 步里：学生提交答案后**不直接判对错**，
 * 先问「你是怎么想到的」，拿到推理路径后再定位认知断层。
 */
import { computed, ref } from 'vue';
import AppIcon from '../AppIcon.vue';
import StudyAvatar from './StudyAvatar.vue';
import { probeAnswer } from '../../agent/modes';
import type { Card333Payload, ProbePayload } from '../../contract/types';

const props = defineProps<{
  card: Card333Payload;
  /** 已完成的知识点数（本地统计，用于进步可视化）。 */
  completedCount: number;
}>();

const emit = defineEmits<{ complete: [summary: Card333Summary]; exit: [] }>();

export interface Card333Summary {
  concept: string;
  keyPointsHit: number;
  quizCorrect: number;
  elapsedMs: number;
  skipped: number;
}

type Phase =
  | 'activation'
  | 'explain1'
  | 'explain2'
  | 'example'
  | 'recall'
  | 'recallFeedback'
  | 'keypoints'
  | 'quiz'
  | 'quizProbe'
  | 'quizVerdict'
  | 'done';

const phase = ref<Phase>('activation');
const busy = ref(false);
const startedAt = ref(Date.now());

const activation = ref('');
const recallText = ref('');
const recallResult = ref<ProbePayload | null>(null);
const marks = ref<Array<'hit' | 'miss' | null>>([null, null, null]);

const quizIndex = ref(0);
const quizAnswer = ref('');
const quizReasoning = ref('');
const verdicts = ref<Array<ProbePayload | null>>([null, null, null]);
const skipped = ref(0);

const currentQuestion = computed(() => props.card.questions[quizIndex.value]);
const keyPointsHit = computed(() => marks.value.filter((m) => m === 'hit').length);
const quizCorrect = computed(() => verdicts.value.filter((v) => v?.verdict === 'correct').length);
/**
 * 故意写成普通函数而不是 computed：computed 会把第一次求值的时刻缓存住，
 * 一旦有人在进入 done 之前读过它，最终显示的用时就会是错的。
 */
function elapsedMs() {
  return Date.now() - startedAt.value;
}

/** 三个药丸对应「333」的三个 3，六步映射到药丸上。 */
const pillIndex = computed(() => {
  switch (phase.value) {
    case 'activation':
    case 'explain1':
    case 'explain2':
    case 'example':
      return 0;
    case 'recall':
    case 'recallFeedback':
    case 'keypoints':
      return 1;
    default:
      return 2;
  }
});

/** 六步的细进度，显示「第 X / 6 步」。 */
const stepNo = computed(() => {
  switch (phase.value) {
    case 'activation':
      return 1;
    case 'explain1':
    case 'explain2':
      return 2;
    case 'example':
      return 3;
    case 'recall':
    case 'recallFeedback':
      return 4;
    case 'keypoints':
      return 5;
    default:
      return 6;
  }
});

const PILLS = ['3 分钟理解', '3 个关键点', '3 道自测题'];

const TYPE_LABEL: Record<string, string> = {
  causal: '因果推理',
  conditional: '条件判断',
  comparative: '对比辨析',
};

const VERDICT_META: Record<string, { label: string; tone: string }> = {
  correct: { label: '答对了', tone: 'ok' },
  partial: { label: '对了一半', tone: 'warn' },
  wrong: { label: '这题偏了', tone: 'bad' },
  unknown: { label: '继续', tone: 'ok' },
};

async function submitRecall() {
  if (!recallText.value.trim() || busy.value) return;
  busy.value = true;
  try {
    const result = await probeAnswer({
      concept: props.card.concept,
      answer: recallText.value,
      stage: 'recall',
      keyPoints: props.card.key_points,
    });
    recallResult.value = result.payload;
    // 数字人判定的命中情况直接预填到第五步，学生仍可改
    const keyPoints = props.card.key_points;
    marks.value = keyPoints.map((point) => {
      const covered = !result.payload.gap?.includes(point.slice(0, 20));
      return covered ? 'hit' : 'miss';
    });
    phase.value = 'recallFeedback';
  } finally {
    busy.value = false;
  }
}

async function submitQuizAnswer() {
  if (!quizAnswer.value.trim() || busy.value) return;
  busy.value = true;
  try {
    const result = await probeAnswer({
      concept: props.card.concept,
      answer: quizAnswer.value,
      reference: currentQuestion.value.answer,
      stage: 'quiz',
    });
    verdicts.value[quizIndex.value] = result.payload;
    phase.value = 'quizProbe';
  } finally {
    busy.value = false;
  }
}

async function submitQuizReasoning() {
  if (!quizReasoning.value.trim() || busy.value) return;
  busy.value = true;
  try {
    const result = await probeAnswer({
      concept: props.card.concept,
      // 判分依据是学生答的那道题，不是他解释的思路
      answer: quizAnswer.value,
      studentReasoning: quizReasoning.value,
      reference: currentQuestion.value.answer,
      stage: 'quiz',
    });
    verdicts.value[quizIndex.value] = result.payload;
    phase.value = 'quizVerdict';
  } finally {
    busy.value = false;
  }
}

function nextQuestion() {
  if (quizIndex.value < props.card.questions.length - 1) {
    quizIndex.value += 1;
    quizAnswer.value = '';
    quizReasoning.value = '';
    phase.value = 'quiz';
  } else {
    phase.value = 'done';
  }
}

function skipQuestion() {
  skipped.value += 1;
  verdicts.value[quizIndex.value] = null;
  if (quizIndex.value < props.card.questions.length - 1) {
    quizIndex.value += 1;
    quizAnswer.value = '';
    quizReasoning.value = '';
    phase.value = 'quiz';
  } else {
    phase.value = 'done';
  }
}

function finish() {
  emit('complete', {
    concept: props.card.concept,
    keyPointsHit: keyPointsHit.value,
    quizCorrect: quizCorrect.value,
    elapsedMs: elapsedMs(),
    skipped: skipped.value,
  });
}

function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

const closingRemark = computed(() => {
  const hit = keyPointsHit.value;
  const correct = quizCorrect.value;
  if (correct >= 2 && hit >= 2) return '你今天是真的把它弄懂了，不是「看过」。这种感觉记住它。';
  if (correct >= 1) return '大部分抓住了，剩下那一点正是最容易混的地方，下次遇到你会认出来。';
  return '别急，能走完这六步本身就不容易。过一会儿再回来复述一遍，会顺很多。';
});
</script>

<template>
  <article class="wizard">
    <header class="wizard__head">
      <button type="button" class="wizard__back" @click="emit('exit')">
        <AppIcon name="arrow-right" :size="15" class="wizard__back-icon" />
        返回节点
      </button>
      <span class="wizard__step">第 {{ stepNo }} / 6 步</span>
    </header>

    <div class="wizard__title-row">
      <h2 class="wizard__title">{{ card.concept }} · 333 学习法</h2>
    </div>

    <ol class="pills">
      <li v-for="(label, i) in PILLS" :key="label" class="pill" :class="{ 'is-active': i === pillIndex }">
        <span class="pill__no">{{ i + 1 }}</span>
        {{ label }}
      </li>
    </ol>

    <!-- ── 第 1 步：激活先验 ───────────────────────────────── -->
    <section v-if="phase === 'activation'" class="block">
      <div class="say">
        <StudyAvatar state="probing" :size="40" />
        <p>{{ card.activation_prompt }}</p>
      </div>
      <textarea
        v-model="activation"
        class="input"
        rows="3"
        placeholder="随便猜，猜错也没关系…"
        aria-label="你的猜想"
      />
      <p class="hint">这一步不计分。先把脑子里的想法倒出来，后面接收信息会顺很多。</p>
      <button type="button" class="primary-button" :disabled="!activation.trim()" @click="phase = 'explain1'">
        提交猜想，继续
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </section>

    <!-- ── 第 2 步：核心解释（分两段，段间停顿确认） ────────── -->
    <section v-else-if="phase === 'explain1'" class="block">
      <span class="block__tag">第一段</span>
      <p class="prose">{{ card.explanation_part1 }}</p>
      <div class="say say--small">
        <StudyAvatar state="idle" :size="34" />
        <p>到这里能跟上吗？</p>
      </div>
      <button type="button" class="primary-button" @click="phase = 'explain2'">
        跟得上，继续
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </section>

    <section v-else-if="phase === 'explain2'" class="block">
      <span class="block__tag">第二段</span>
      <p class="prose">{{ card.explanation_part2 }}</p>
      <div class="say say--small">
        <StudyAvatar state="idle" :size="34" />
        <p>两段合起来，就是它的完整机制了。</p>
      </div>
      <button type="button" class="primary-button" @click="phase = 'example'">
        明白了，继续
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </section>

    <!-- ── 第 3 步：具体例子 ───────────────────────────────── -->
    <section v-else-if="phase === 'example'" class="block">
      <span class="block__tag">一个具体例子</span>
      <p class="prose">{{ card.example }}</p>
      <button type="button" class="primary-button" @click="phase = 'recall'">
        看懂了，继续
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </section>

    <!-- ── 第 4 步：用自己的话复述（生成效应发生的地方） ────── -->
    <section v-else-if="phase === 'recall'" class="block">
      <div class="say">
        <StudyAvatar state="encouraging" :size="40" />
        <p>{{ card.recall_prompt }}</p>
      </div>
      <textarea
        v-model="recallText"
        class="input"
        rows="4"
        placeholder="不看上面的内容，用你自己的话讲一遍…"
        aria-label="你的复述"
      />
      <button type="button" class="primary-button" :disabled="!recallText.trim() || busy" @click="submitRecall">
        <template v-if="busy"><AppIcon name="spinner" :size="17" class="spin" /> 正在看你的复述…</template>
        <template v-else>提交复述 <AppIcon name="arrow-right" :size="17" /></template>
      </button>
    </section>

    <section v-else-if="phase === 'recallFeedback' && recallResult" class="block">
      <div class="say">
        <StudyAvatar state="encouraging" :size="40" />
        <p>{{ recallResult.feedback }}</p>
      </div>
      <div v-if="recallResult.gap" class="callout callout--warn">
        <strong>还没提到</strong>
        <p>{{ recallResult.gap }}</p>
      </div>
      <p v-if="recallResult.encouragement" class="encourage">{{ recallResult.encouragement }}</p>
      <button type="button" class="primary-button" @click="phase = 'keypoints'">
        对照关键点
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </section>

    <!-- ── 第 5 步：对照关键点（从被动接收变成主动对照） ────── -->
    <section v-else-if="phase === 'keypoints'" class="block">
      <div class="say say--small">
        <StudyAvatar state="idle" :size="34" />
        <p>这是 3 个关键点。你刚才的复述里已经提到了哪几个？漏掉了哪个？</p>
      </div>
      <ul class="checklist">
        <li v-for="(point, i) in card.key_points" :key="i" class="checklist__item">
          <p class="checklist__text"><span class="checklist__no">{{ i + 1 }}</span>{{ point }}</p>
          <div class="checklist__actions">
            <button
              type="button"
              class="mark mark--hit"
              :class="{ 'is-on': marks[i] === 'hit' }"
              @click="marks[i] = 'hit'"
            >
              我提到了这个
            </button>
            <button
              type="button"
              class="mark mark--miss"
              :class="{ 'is-on': marks[i] === 'miss' }"
              @click="marks[i] = 'miss'"
            >
              我漏了这个
            </button>
          </div>
        </li>
      </ul>
      <button type="button" class="primary-button" :disabled="marks.some((m) => m === null)" @click="phase = 'quiz'">
        看完了，开始自测
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </section>

    <!-- ── 第 6 步：检索型自测 ─────────────────────────────── -->
    <section v-else-if="phase === 'quiz'" class="block">
      <div class="quiz-head">
        <span class="block__tag">第 {{ quizIndex + 1 }} / {{ card.questions.length }} 题</span>
        <span class="type-badge">{{ TYPE_LABEL[currentQuestion.type] }}</span>
      </div>
      <p class="prose prose--strong">{{ currentQuestion.question }}</p>
      <textarea
        v-model="quizAnswer"
        class="input"
        rows="4"
        placeholder="先写下你的答案…"
        aria-label="你的答案"
      />
      <div class="row-actions">
        <button type="button" class="ghost-button" @click="skipQuestion">先跳过</button>
        <button
          type="button"
          class="primary-button"
          :disabled="!quizAnswer.trim() || busy"
          @click="submitQuizAnswer"
        >
          <template v-if="busy"><AppIcon name="spinner" :size="17" class="spin" /> 数字人在想…</template>
          <template v-else>提交答案 <AppIcon name="arrow-right" :size="17" /></template>
        </button>
      </div>
    </section>

    <!-- 苏格拉底式追问：先问推理依据，不判对错（§6.3.3） -->
    <section v-else-if="phase === 'quizProbe' && verdicts[quizIndex]" class="block">
      <div class="say">
        <StudyAvatar state="probing" :size="40" />
        <p>{{ verdicts[quizIndex]?.followup }}</p>
      </div>
      <textarea
        v-model="quizReasoning"
        class="input"
        rows="4"
        placeholder="说说你是怎么想的，哪一步让你得出这个答案…"
        aria-label="你的推理过程"
      />
      <p class="hint">先不用管对不对——把思路说出来，我才能看出是哪里断的。</p>
      <button
        type="button"
        class="primary-button"
        :disabled="!quizReasoning.trim() || busy"
        @click="submitQuizReasoning"
      >
        <template v-if="busy"><AppIcon name="spinner" :size="17" class="spin" /> 正在定位…</template>
        <template v-else>提交我的思路 <AppIcon name="arrow-right" :size="17" /></template>
      </button>
    </section>

    <section v-else-if="phase === 'quizVerdict' && verdicts[quizIndex]" class="block">
      <span class="verdict" :class="`verdict--${VERDICT_META[verdicts[quizIndex]!.verdict].tone}`">
        {{ VERDICT_META[verdicts[quizIndex]!.verdict].label }}
      </span>
      <p v-if="verdicts[quizIndex]!.feedback" class="prose">{{ verdicts[quizIndex]!.feedback }}</p>

      <div v-if="verdicts[quizIndex]!.gap" class="callout callout--warn">
        <strong>认知断层可能在这里</strong>
        <p>{{ verdicts[quizIndex]!.gap }}</p>
      </div>

      <div class="answer-box">
        <strong>参考答案</strong>
        <p>{{ currentQuestion.answer }}</p>
        <strong>为什么</strong>
        <p>{{ currentQuestion.explanation }}</p>
      </div>

      <p v-if="verdicts[quizIndex]!.encouragement" class="encourage">
        {{ verdicts[quizIndex]!.encouragement }}
      </p>

      <button type="button" class="primary-button" @click="nextQuestion">
        {{ quizIndex < card.questions.length - 1 ? '下一题' : '完成学习' }}
        <AppIcon name="arrow-right" :size="17" />
      </button>
    </section>

    <!-- ── 完成：学习成果卡片（§6.3.4 关联性 + 进步可视化） ── -->
    <section v-else-if="phase === 'done'" class="block">
      <div class="result">
        <header class="result__head">
          <StudyAvatar state="celebrating" :size="56" />
          <div>
            <h3>你完成了「{{ card.concept }}」的 333 学习</h3>
            <p>用时 {{ formatDuration(elapsedMs()) }}</p>
          </div>
        </header>

        <ul class="result__stats">
          <li>
            <span class="result__num">{{ keyPointsHit }} / 3</span>
            <span class="result__label">复述命中关键点</span>
          </li>
          <li>
            <span class="result__num">{{ quizCorrect }} / {{ card.questions.length }}</span>
            <span class="result__label">自测答对</span>
          </li>
          <li>
            <span class="result__num">{{ completedCount + 1 }}</span>
            <span class="result__label">你已掌握的知识点</span>
          </li>
        </ul>

        <p class="result__remark">{{ closingRemark }}</p>
      </div>

      <button type="button" class="primary-button primary-button--wide" @click="finish">
        完成，标记为已掌握
        <AppIcon name="check-circle" :size="17" />
      </button>
    </section>
  </article>
</template>

<style scoped>
.wizard {
  display: flex;
  flex-direction: column;
}

.wizard__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.wizard__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-500);
  font-size: 13px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.wizard__back:hover {
  color: var(--brand-600);
  background: var(--brand-50);
}

.wizard__back-icon {
  transform: rotate(180deg);
}

.wizard__step {
  color: var(--ink-400);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}

.wizard__title {
  margin: 0 0 12px;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink-900);
}

.pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.pill {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  color: var(--ink-500);
  font-size: 12.5px;
}

.pill.is-active {
  background: var(--brand-600);
  color: #fff;
  font-weight: 600;
}

.pill__no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-pill);
  background: rgba(16, 31, 60, 0.12);
  font-size: 11px;
}

.pill.is-active .pill__no {
  background: rgba(255, 255, 255, 0.28);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block__tag {
  align-self: flex-start;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 12px;
  font-weight: 600;
}

.say {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--surface-muted);
  border: 1px solid var(--border);
}

.say p {
  margin: 0;
  color: var(--ink-800);
  font-size: 14px;
  line-height: 1.75;
}

.say--small p {
  font-size: 13.5px;
  color: var(--ink-600);
}

.prose {
  margin: 0;
  font-size: 15px;
  line-height: 1.9;
  color: var(--ink-800);
}

.prose--strong {
  font-weight: 600;
  color: var(--ink-900);
}

.input {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  font-size: 14.5px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.input:focus {
  border-color: var(--brand-400);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.hint {
  margin: 0;
  color: var(--ink-400);
  font-size: 12.5px;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  align-self: flex-start;
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

.primary-button:hover:not(:disabled) {
  background: var(--brand-700);
  transform: translateY(-1px);
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.primary-button--wide {
  align-self: stretch;
}

.ghost-button {
  padding: 11px 18px;
  border-radius: 11px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--ink-500);
  font-size: 14px;
}

.ghost-button:hover {
  color: var(--ink-700);
  border-color: var(--ink-300);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.row-actions .primary-button {
  margin-left: auto;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.callout {
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
  font-size: 13.5px;
}

.encourage {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: #eafaf0;
  color: #15803d;
  font-size: 13.5px;
}

.checklist {
  display: grid;
  gap: 10px;
}

.checklist__item {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
}

.checklist__text {
  display: flex;
  gap: 9px;
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink-800);
}

.checklist__no {
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
  margin-top: 3px;
}

.checklist__actions {
  display: flex;
  gap: 8px;
}

.mark {
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--ink-500);
  font-size: 12.5px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.mark--hit.is-on {
  background: #eafaf0;
  border-color: var(--success-500);
  color: var(--success-600);
  font-weight: 600;
}

.mark--miss.is-on {
  background: #fff7ed;
  border-color: var(--warn-600);
  color: var(--warn-600);
  font-weight: 600;
}

.quiz-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.type-badge {
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  color: var(--ink-500);
  font-size: 12px;
}

.verdict {
  align-self: flex-start;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  font-size: 12.5px;
  font-weight: 600;
}

.verdict--ok {
  background: #eafaf0;
  color: var(--success-600);
}

.verdict--warn {
  background: #fff7ed;
  color: var(--warn-600);
}

.verdict--bad {
  background: #fef2f2;
  color: #dc2626;
}

.answer-box {
  padding: 14px;
  border-radius: var(--radius-md);
  background: #fbfcfe;
  border: 1px solid var(--border);
}

.answer-box strong {
  display: block;
  font-size: 12.5px;
  color: var(--brand-700);
  margin-bottom: 4px;
}

.answer-box p {
  margin: 0 0 12px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-700);
}

.answer-box p:last-child {
  margin-bottom: 0;
}

.result {
  padding: 18px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #f1f6ff, #ffffff);
  border: 1px solid var(--border-strong);
}

.result__head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.result__head h3 {
  margin: 0;
  font-size: 17px;
  color: var(--ink-900);
}

.result__head p {
  margin: 2px 0 0;
  color: var(--ink-400);
  font-size: 12.5px;
}

.result__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.result__stats li {
  padding: 10px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: center;
}

.result__num {
  display: block;
  font-size: 19px;
  font-weight: 700;
  color: var(--brand-700);
  font-variant-numeric: tabular-nums;
}

.result__label {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--ink-400);
}

.result__remark {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-700);
}

@media (max-width: 560px) {
  .result__stats {
    grid-template-columns: 1fr;
  }
  .row-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .row-actions .primary-button {
    margin-left: 0;
    justify-content: center;
  }
  .primary-button {
    align-self: stretch;
    justify-content: center;
  }
}
</style>
