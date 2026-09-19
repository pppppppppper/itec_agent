<script setup lang="ts">
/**
 * 数字人头像 —— §2.3「5 小时轻量方案」。
 * 明确不做 3D、不做语音（§9 取舍原则），用内联 SVG + 状态切换表情
 * 营造伙伴感：零资源、零加载、任意尺寸不失真。
 */
import { computed } from 'vue';
import type { AvatarState } from '../../state/store';

const props = withDefaults(
  defineProps<{
    state?: AvatarState;
    size?: number;
    speaking?: boolean;
  }>(),
  { state: 'idle', size: 56, speaking: false },
);

const TINT: Record<AvatarState, string> = {
  idle: '#2563eb',
  thinking: '#7c3aed',
  encouraging: '#0891b2',
  probing: '#d18700',
  celebrating: '#be123c',
};

const LABEL: Record<AvatarState, string> = {
  idle: '待机',
  thinking: '思考',
  encouraging: '鼓励',
  probing: '追问',
  celebrating: '庆祝',
};

const tint = computed(() => TINT[props.state]);
const gradientId = computed(() => `avatar-bg-${props.state}`);
</script>

<template>
  <span
    class="avatar"
    :class="{ 'avatar--speaking': speaking }"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="`智图伙伴（${LABEL[state]}）`"
    :data-state="state"
  >
    <svg :viewBox="'0 0 72 72'" :width="size" :height="size" aria-hidden="true">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#f1f6fd" />
        </linearGradient>
      </defs>

      <rect
        x="4"
        y="4"
        width="64"
        height="64"
        rx="22"
        :fill="`url(#${gradientId})`"
        :stroke="tint"
        stroke-width="2.5"
      />

      <!-- 眼睛 -->
      <g :fill="tint" :stroke="tint" stroke-width="3" stroke-linecap="round">
        <template v-if="state === 'idle'">
          <circle cx="26" cy="36" r="3.4" />
          <circle cx="46" cy="36" r="3.4" />
        </template>
        <template v-else-if="state === 'thinking'">
          <circle cx="24" cy="33" r="3.4" />
          <circle cx="44" cy="33" r="3.4" />
          <path d="M20 27 Q26 23 31 26" fill="none" />
          <path d="M41 26 Q46 23 52 27" fill="none" />
        </template>
        <template v-else-if="state === 'encouraging'">
          <path d="M21 37 Q26 31 31 37" fill="none" />
          <path d="M41 37 Q46 31 51 37" fill="none" />
        </template>
        <template v-else-if="state === 'probing'">
          <circle cx="26" cy="37" r="3.6" />
          <circle cx="46" cy="36" r="3.6" />
          <path d="M20 27 Q27 22 33 27" fill="none" />
          <path d="M41 25 Q47 22 52 25" fill="none" />
        </template>
        <template v-else>
          <path d="M26 31 L28 36 L33 38 L28 40 L26 45 L24 40 L19 38 L24 36 Z" />
          <path d="M46 31 L48 36 L53 38 L48 40 L46 45 L44 40 L39 38 L44 36 Z" />
        </template>
      </g>

      <!-- 嘴 -->
      <g fill="none" :stroke="tint" stroke-width="3.2" stroke-linecap="round">
        <ellipse v-if="state === 'thinking'" cx="36" cy="50" rx="4.2" ry="4.8" />
        <path v-else-if="state === 'idle'" d="M28 48 Q36 55 44 48" />
        <path v-else-if="state === 'encouraging'" d="M27 47 Q36 57 45 47" />
        <path v-else-if="state === 'probing'" d="M29 49 Q36 46 43 49" />
        <path v-else d="M26 47 Q36 59 46 47 Z" :fill="tint" stroke="none" />
      </g>

      <!-- 状态装饰 -->
      <g v-if="state === 'thinking'" :fill="tint" opacity="0.75">
        <circle class="avatar-dot" cx="58" cy="16" r="2.6" />
        <circle class="avatar-dot avatar-dot--2" cx="63" cy="11" r="2" />
      </g>
      <g v-else-if="state === 'celebrating'" :stroke="tint" stroke-width="2.4" stroke-linecap="round" opacity="0.8">
        <path d="M12 20 L8 14" />
        <path d="M60 20 L64 14" />
      </g>
    </svg>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex: none;
}

.avatar--speaking {
  animation: avatar-breathe 2.4s ease-in-out infinite;
}

@keyframes avatar-breathe {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

.avatar-dot {
  animation: avatar-blink 1.4s infinite ease-in-out;
}

.avatar-dot--2 {
  animation-delay: 0.3s;
}

@keyframes avatar-blink {
  0%,
  60%,
  100% {
    opacity: 0.25;
  }
  30% {
    opacity: 1;
  }
}
</style>
