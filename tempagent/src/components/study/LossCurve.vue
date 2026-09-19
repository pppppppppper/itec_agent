<script setup lang="ts">
/**
 * 损失曲线图 —— 设计稿中间栏与右栏的那张「损失 vs 参数」。
 *
 * 契约里给的是**数据点**而不是函数，所以这里用最小假设去还原曲线：
 * 假设损失地貌是二次的（梯度下降的教科书场景），用中位数估计开口系数 a，
 * 再叠加真实的下降路径点。Agent 换一组 step 数据也能画对，
 * 前端不需要硬编码任何一条具体曲线。
 */
import { computed } from 'vue';
import type { LossCurveVisual } from '../../contract/types';

const props = withDefaults(
  defineProps<{
    visual: LossCurveVisual;
    height?: number;
    compact?: boolean;
  }>(),
  { height: 190, compact: false },
);

const W = 320;

const geom = computed(() => {
  const { steps, optimum, oscillating } = props.visual;
  const pad = props.compact ? { l: 26, r: 10, t: 10, b: 22 } : { l: 34, r: 14, t: 14, b: 28 };
  const H = props.height;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const xs = [optimum.param, ...steps.map((s) => s.param)];
  const ys = [optimum.loss, ...steps.map((s) => s.loss)];
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...ys, 1e-6);
  const xPad = (xMax - xMin) * 0.08 || 1;

  const dx0 = xMin - xPad;
  const dx1 = xMax + xPad;

  const sx = (x: number) => pad.l + ((x - dx0) / (dx1 - dx0)) * innerW;
  const sy = (y: number) => pad.t + innerH - (y / (yMax * 1.08)) * innerH;

  // 用偏离最优点的采样点估计二次开口系数，取中位数抗离群。
  const ratios = steps
    .filter((s) => Math.abs(s.param - optimum.param) > 1e-9 && s.loss - optimum.loss > 1e-9)
    .map((s) => (s.loss - optimum.loss) / (s.param - optimum.param) ** 2)
    .sort((a, b) => a - b);
  const a = ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)] : 1;
  const loss = (x: number) => optimum.loss + Math.max(a, 1e-6) * (x - optimum.param) ** 2;

  const SAMPLES = 80;
  const curve = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const x = dx0 + ((dx1 - dx0) * i) / SAMPLES;
    return `${i === 0 ? 'M' : 'L'} ${sx(x).toFixed(1)} ${sy(loss(x)).toFixed(1)}`;
  }).join(' ');

  return {
    H,
    W,
    pad,
    curve,
    oscillating,
    points: steps.map((s) => `${sx(s.param).toFixed(1)},${sy(s.loss).toFixed(1)}`).join(' '),
    dots: steps.map((s) => ({ x: sx(s.param), y: sy(s.loss) })),
    optimum: { x: sx(optimum.param), y: sy(optimum.loss) },
    axisBottom: sy(0),
    midX: (pad.l + W - pad.r) / 2,
  };
});

const markerId = computed(() => (props.compact ? 'gd-arrow-compact' : 'gd-arrow'));
</script>

<template>
  <figure class="chart" :class="{ 'chart--compact': compact }">
    <svg
      :viewBox="`0 0 ${W} ${geom.H}`"
      width="100%"
      :height="geom.H"
      role="img"
      :aria-label="`损失随${visual.xLabel ?? '参数'}变化`"
    >
      <line :x1="geom.pad.l" :y1="geom.axisBottom" :x2="W - geom.pad.r" :y2="geom.axisBottom" class="chart-axis" />
      <line :x1="geom.pad.l" :y1="geom.pad.t" :x2="geom.pad.l" :y2="geom.axisBottom" class="chart-axis" />

      <path :d="geom.curve" class="chart-curve" />

      <defs>
        <marker
          :id="markerId"
          markerWidth="7"
          markerHeight="7"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" class="chart-arrow" />
        </marker>
      </defs>

      <polyline
        :points="geom.points"
        class="chart-path"
        :class="{ 'chart-path--osc': geom.oscillating }"
        :marker-end="geom.oscillating ? undefined : `url(#${markerId})`"
      />

      <circle
        v-for="(dot, i) in geom.dots"
        :key="i"
        :cx="dot.x"
        :cy="dot.y"
        :r="compact ? 2.4 : 3.4"
        class="chart-dot"
      />
      <circle :cx="geom.optimum.x" :cy="geom.optimum.y" :r="compact ? 3.2 : 4.4" class="chart-optimum" />

      <text
        v-if="!compact"
        :x="geom.optimum.x"
        :y="geom.optimum.y + 18"
        text-anchor="middle"
        class="chart-tick"
      >
        最优解
      </text>
      <text :x="geom.midX" :y="geom.H - 6" text-anchor="middle" class="chart-tick">
        {{ visual.xLabel ?? '参数' }}
      </text>
      <text v-if="!compact" :x="geom.pad.l - 6" :y="geom.pad.t + 8" text-anchor="end" class="chart-tick">
        {{ visual.yLabel ?? '损失' }}
      </text>
    </svg>

    <figcaption v-if="geom.oscillating && !compact" class="chart-note">
      学习率过大时，参数在最优解附近来回震荡
    </figcaption>
  </figure>
</template>

<style scoped>
.chart {
  margin: 14px 0 0;
  padding: 8px;
  border-radius: var(--radius-md);
  background: #fbfcfe;
  border: 1px solid var(--border);
}

.chart--compact {
  margin-top: 10px;
  padding: 4px;
  background: var(--surface);
}

.chart-note {
  margin: 2px 0 4px;
  text-align: center;
  color: var(--ink-400);
  font-size: 11.5px;
}

.chart-axis {
  stroke: var(--border-strong);
  stroke-width: 1;
}

.chart-curve {
  fill: none;
  stroke: var(--ink-300);
  stroke-width: 1.6;
  stroke-dasharray: 4 3;
}

.chart-path {
  fill: none;
  stroke: var(--brand-600);
  stroke-width: 1.8;
}

.chart-path--osc {
  stroke: #f97316;
  stroke-dasharray: 5 3;
}

.chart-arrow {
  fill: var(--brand-600);
}

.chart-dot {
  fill: #fff;
  stroke: var(--brand-600);
  stroke-width: 1.6;
}

.chart-optimum {
  fill: var(--success-600);
  stroke: #fff;
  stroke-width: 1.5;
}

.chart-tick {
  fill: var(--ink-400);
  font-size: 9px;
}
</style>
