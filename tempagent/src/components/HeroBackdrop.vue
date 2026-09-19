<script setup>
import AppIcon from './AppIcon.vue'
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <div class="backdrop__glow backdrop__glow--left"></div>
    <div class="backdrop__glow backdrop__glow--top"></div>
    <div class="backdrop__glow backdrop__glow--right"></div>
    <div class="backdrop__grid"></div>

    <svg class="backdrop__lines" viewBox="0 0 1440 760" preserveAspectRatio="none">
      <path d="M-60 300 C 200 90, 400 470, 700 300 S 1150 120, 1500 300" />
      <path d="M-60 380 C 230 180, 460 560, 760 400 S 1180 220, 1500 380" />
      <path d="M120 700 C 320 540, 540 620, 720 480" />
    </svg>

    <div class="float float--map-card">
      <svg viewBox="0 0 150 100" fill="none">
        <path
          d="M34 30 62 48M62 48 44 76M44 76 34 30M62 48 108 30M108 30 122 66M122 66 88 80M44 76 88 80"
          stroke="#8fb8f2"
          stroke-width="1.4"
          opacity="0.7"
        />
        <circle cx="34" cy="30" r="9" fill="#3b82f6" />
        <circle cx="62" cy="48" r="6" fill="#93c0f7" />
        <circle cx="44" cy="76" r="5.5" fill="#93c0f7" />
        <circle cx="108" cy="30" r="4.5" fill="#bcd6fa" />
        <circle cx="122" cy="66" r="5" fill="#93c0f7" />
        <circle cx="88" cy="80" r="4" fill="#c8dcfa" />
      </svg>
    </div>
    <div class="float float--map-label">
      <p><strong>从知识出发</strong>构建你的学习地图</p>
    </div>

    <div class="float float--list-card">
      <div class="mini-list">
        <div class="mini-list__row">
          <span class="mini-list__dot" style="background: #3b82f6"></span>
          <span class="mini-list__bar" style="width: 100%"></span>
        </div>
        <div class="mini-list__row">
          <span class="mini-list__dot" style="background: #34d399"></span>
          <span class="mini-list__bar" style="width: 62%"></span>
        </div>
        <div class="mini-list__row">
          <span class="mini-list__dot" style="background: #cbd5e1"></span>
          <span class="mini-list__bar" style="width: 78%"></span>
        </div>
      </div>
    </div>
    <div class="float float--list-label">
      <p><strong>系统化学习</strong>掌握核心重点</p>
    </div>

    <div class="float float--ask-card">
      <span class="float__tile"><AppIcon name="sparkle" :size="24" /></span>
    </div>
    <div class="float float--ask-label">
      <p><strong>随时提问</strong>AI 为你解答</p>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.backdrop__glow {
  position: absolute;
  border-radius: 50%;
}

.backdrop__glow--left {
  left: -220px;
  top: 60px;
  width: 620px;
  height: 620px;
  background: radial-gradient(closest-side, rgba(93, 148, 255, 0.16), transparent);
}

.backdrop__glow--top {
  left: 50%;
  top: -260px;
  width: 1000px;
  height: 620px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(120, 165, 255, 0.2), transparent);
}

.backdrop__glow--right {
  right: -240px;
  top: 140px;
  width: 660px;
  height: 660px;
  background: radial-gradient(closest-side, rgba(125, 200, 255, 0.2), transparent);
}

.backdrop__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 99, 235, 0.05) 1px, transparent 1px);
  background-size: 46px 46px;
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent 72%);
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent 72%);
}

.backdrop__lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.backdrop__lines path {
  fill: none;
  stroke: #a5dfbe;
  stroke-width: 1.6;
  opacity: 0.55;
}

.backdrop__lines path:nth-child(2) {
  stroke: #a9c8fa;
  opacity: 0.5;
}

.backdrop__lines path:nth-child(3) {
  stroke: #a5dfbe;
  opacity: 0.4;
}

/* 装饰浮层 */
.float {
  position: absolute;
}

.float--map-card {
  left: 3.6%;
  top: 62px;
  width: 156px;
  height: 122px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 40px rgba(31, 71, 145, 0.1);
  backdrop-filter: blur(6px);
}

.float--map-label {
  left: 3.2%;
  top: 256px;
}

.float--list-card {
  right: 4.4%;
  top: 62px;
  width: 158px;
  padding: 18px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 40px rgba(31, 71, 145, 0.1);
  backdrop-filter: blur(6px);
}

.float--list-label {
  right: 2.8%;
  top: 178px;
}

.float--ask-card {
  right: 5.2%;
  top: 250px;
  width: 100px;
  height: 78px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 40px rgba(31, 71, 145, 0.1);
  backdrop-filter: blur(6px);
}

.float--ask-label {
  right: 4.2%;
  top: 344px;
}

.float__tile {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: var(--tile);
  color: var(--brand-600);
}

.float p {
  padding: 9px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(232, 240, 251, 0.9);
  box-shadow: 0 12px 26px rgba(31, 71, 145, 0.08);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-500);
  white-space: nowrap;
}

.float p strong {
  display: block;
  font-weight: 600;
  color: var(--ink-700);
}

.mini-list {
  display: grid;
  gap: 12px;
}

.mini-list__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mini-list__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.mini-list__bar {
  height: 6px;
  border-radius: 3px;
  background: #e2ebf9;
}

@media (max-width: 1180px) {
  .float {
    display: none;
  }
}
</style>
