<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import BrandMark from '../components/BrandMark.vue'
import HeroBackdrop from '../components/HeroBackdrop.vue'
import { useAuth } from '../composables/useAuth'

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/
const PHONE_RE = /^1[3-9]\d{9}$/

const route = useRoute()
const router = useRouter()
const { login, register } = useAuth()

const mode = ref('login')
const status = ref('idle') // idle | info | error | ok
const message = ref('')
const remember = ref(true)
const agreed = ref(false)
const showPassword = ref(false)

const loginForm = reactive({ account: '', password: '' })
const registerForm = reactive({ name: '', account: '', password: '', confirm: '' })

let timer = null

const isLogin = computed(() => mode.value === 'login')
const messageIcon = computed(() => (status.value === 'ok' ? 'check-circle' : 'info-circle'))

function setMessage(nextStatus, text) {
  status.value = nextStatus
  message.value = text
}

function clearMessage() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (status.value !== 'ok') {
    status.value = 'idle'
    message.value = ''
  }
}

function switchMode(next) {
  if (mode.value === next) return
  mode.value = next
  showPassword.value = false
  clearMessage()
}

function resolveRedirect() {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : '/'
}

function finish(text) {
  setMessage('ok', text)
  timer = setTimeout(() => {
    timer = null
    router.push(resolveRedirect())
  }, 700)
}

function submitLogin() {
  const result = login(loginForm, { persist: remember.value })
  if (!result.ok) {
    setMessage('error', result.error)
    return
  }
  finish('登录成功，正在进入你的学习空间…')
}

function validateRegister() {
  const { name, account, password, confirm } = registerForm
  if (name.trim().length < 2) return '昵称至少需要 2 个字。'
  if (!EMAIL_RE.test(account.trim()) && !PHONE_RE.test(account.trim())) {
    return '请输入正确的邮箱或 11 位手机号。'
  }
  if (password.length < 6) return '密码至少需要 6 位字符。'
  if (password !== confirm) return '两次输入的密码不一致。'
  if (!agreed.value) return '请先阅读并同意《用户协议》与《隐私政策》。'
  return ''
}

function submitRegister() {
  const error = validateRegister()
  if (error) {
    setMessage('error', error)
    return
  }

  const result = register(registerForm, { persist: remember.value })
  if (!result.ok) {
    setMessage('error', result.error)
    return
  }
  finish('注册成功，正在为你创建学习空间…')
}

function forgotPassword() {
  setMessage('info', '演示环境暂不支持找回密码，请重新注册一个账号。')
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="auth-page">
    <AppHeader />

    <main class="auth-page__main">
      <HeroBackdrop />

      <div class="shell auth-page__inner">
        <section class="auth-card">
          <div class="auth-card__brand">
            <BrandMark :size="30" />
            <span>智图伙伴</span>
          </div>

          <h1 class="auth-card__title">{{ isLogin ? '欢迎回来' : '创建学习账号' }}</h1>
          <p class="auth-card__subtitle">
            {{
              isLogin
                ? '登录后继续你的学习地图，进度与知识点都会保留。'
                : '注册后即可生成专属学习地图，让 AI 陪你逐步掌握。'
            }}
          </p>

          <div class="auth-tabs" aria-label="登录或注册">
            <button
              type="button"
              class="auth-tabs__item"
              :class="{ 'is-active': isLogin }"
              :aria-pressed="isLogin"
              @click="switchMode('login')"
            >
              登录
            </button>
            <button
              type="button"
              class="auth-tabs__item"
              :class="{ 'is-active': !isLogin }"
              :aria-pressed="!isLogin"
              @click="switchMode('register')"
            >
              注册
            </button>
          </div>

          <form v-if="isLogin" class="auth-form" novalidate @submit.prevent="submitLogin">
            <div class="field">
              <label class="field__label" for="login-account">账号</label>
              <input
                id="login-account"
                v-model="loginForm.account"
                class="field__input"
                type="text"
                autocomplete="username"
                placeholder="邮箱或手机号"
                @input="clearMessage"
              />
            </div>

            <div class="field">
              <label class="field__label" for="login-password">密码</label>
              <div class="field__control">
                <input
                  id="login-password"
                  v-model="loginForm.password"
                  class="field__input"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="请输入密码"
                  @input="clearMessage"
                />
                <button
                  type="button"
                  class="field__toggle"
                  :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                  @click="showPassword = !showPassword"
                >
                  <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="18" />
                </button>
              </div>
            </div>

            <div class="auth-form__row">
              <label class="checkbox">
                <input v-model="remember" class="checkbox__input" type="checkbox" />
                <span class="checkbox__box"><AppIcon name="check" :size="11" /></span>
                <span>记住我</span>
              </label>
              <button type="button" class="link-button" @click="forgotPassword">忘记密码？</button>
            </div>

            <button type="submit" class="submit-button">
              <span>登录</span>
              <AppIcon name="arrow-right" :size="17" />
            </button>
          </form>

          <form v-else class="auth-form" novalidate @submit.prevent="submitRegister">
            <div class="field">
              <label class="field__label" for="register-name">昵称</label>
              <input
                id="register-name"
                v-model="registerForm.name"
                class="field__input"
                type="text"
                autocomplete="nickname"
                placeholder="怎么称呼你"
                @input="clearMessage"
              />
            </div>

            <div class="field">
              <label class="field__label" for="register-account">账号</label>
              <input
                id="register-account"
                v-model="registerForm.account"
                class="field__input"
                type="text"
                autocomplete="username"
                placeholder="邮箱或 11 位手机号"
                @input="clearMessage"
              />
            </div>

            <div class="field">
              <label class="field__label" for="register-password">密码</label>
              <div class="field__control">
                <input
                  id="register-password"
                  v-model="registerForm.password"
                  class="field__input"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="至少 6 位字符"
                  @input="clearMessage"
                />
                <button
                  type="button"
                  class="field__toggle"
                  :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                  @click="showPassword = !showPassword"
                >
                  <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="18" />
                </button>
              </div>
            </div>

            <div class="field">
              <label class="field__label" for="register-confirm">确认密码</label>
              <input
                id="register-confirm"
                v-model="registerForm.confirm"
                class="field__input"
                type="password"
                autocomplete="new-password"
                placeholder="再次输入密码"
                @input="clearMessage"
              />
            </div>

            <label class="checkbox">
              <input v-model="agreed" class="checkbox__input" type="checkbox" />
              <span class="checkbox__box"><AppIcon name="check" :size="11" /></span>
              <span>我已阅读并同意《用户协议》与《隐私政策》</span>
            </label>

            <button type="submit" class="submit-button">
              <span>注册并开始学习</span>
              <AppIcon name="arrow-right" :size="17" />
            </button>
          </form>

          <p v-if="message" class="auth-message" :class="`is-${status}`" role="status">
            <AppIcon :name="messageIcon" :size="15" class="auth-message__icon" />
            <span>{{ message }}</span>
          </p>
        </section>

        <p class="auth-page__note">演示环境：账号数据仅保存在本地浏览器，不会上传到服务器。</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
}

.auth-page__main {
  position: relative;
  padding: 52px 0 64px;
}

.auth-page__inner {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 16px;
}

.auth-card {
  width: min(452px, 100%);
  padding: 30px 32px 28px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow:
    0 2px 4px rgba(28, 60, 120, 0.04),
    0 22px 48px rgba(28, 60, 120, 0.09);
}

.auth-card__brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-900);
}

.auth-card__title {
  margin-top: 18px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink-900);
}

.auth-card__subtitle {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ink-500);
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 22px;
  padding: 4px;
  background: var(--surface-muted);
  border-radius: 12px;
}

.auth-tabs__item {
  padding: 9px 0;
  border-radius: 9px;
  font-size: 14.5px;
  color: var(--ink-500);
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}

.auth-tabs__item:hover {
  color: var(--brand-600);
}

.auth-tabs__item.is-active {
  background: var(--surface);
  color: var(--brand-600);
  font-weight: 600;
  box-shadow: var(--shadow-xs);
}

.auth-form {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.field {
  display: grid;
  gap: 6px;
}

.field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-700);
}

.field__input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 11px;
  font-size: 15px;
  color: var(--ink-900);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.field__input::placeholder {
  color: var(--ink-400);
}

.field__input:focus {
  outline: none;
  border-color: var(--brand-400);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.field__control {
  position: relative;
}

.field__control .field__input {
  padding-right: 46px;
}

.field__toggle {
  position: absolute;
  top: 50%;
  right: 7px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--ink-400);
  transform: translateY(-50%);
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}

.field__toggle:hover {
  color: var(--brand-600);
  background: var(--brand-50);
}

.auth-form__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-600);
  cursor: pointer;
}

.checkbox__input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.checkbox__box {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-strong);
  border-radius: 5px;
  background: var(--surface);
  color: #fff;
  flex: none;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.checkbox__box :deep(.app-icon) {
  opacity: 0;
}

.checkbox__input:checked + .checkbox__box {
  background: var(--brand-600);
  border-color: var(--brand-600);
}

.checkbox__input:checked + .checkbox__box :deep(.app-icon) {
  opacity: 1;
}

.checkbox__input:focus-visible + .checkbox__box {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
}

.link-button {
  font-size: 13px;
  color: var(--brand-600);
}

.link-button:hover {
  color: var(--brand-700);
  text-decoration: underline;
}

.submit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border-radius: 12px;
  background: var(--brand-600);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: var(--shadow-brand);
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.submit-button:hover {
  background: var(--brand-700);
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.32);
}

.submit-button:active {
  transform: translateY(0);
}

.auth-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.55;
}

.auth-message__icon {
  margin-top: 2px;
}

.auth-message.is-info {
  background: var(--brand-50);
  color: var(--brand-700);
}

.auth-message.is-error {
  background: var(--danger-50);
  color: var(--danger-600);
}

.auth-message.is-ok {
  background: var(--success-50);
  color: var(--success-600);
}

.auth-page__note {
  font-size: 12.5px;
  color: var(--ink-400);
  text-align: center;
}

@media (max-width: 520px) {
  .auth-page__main {
    padding: 32px 0 48px;
  }

  .auth-card {
    padding: 24px 20px 22px;
  }

  .auth-card__title {
    font-size: 21px;
  }
}
</style>
