import { computed, ref } from 'vue'

// 纯前端演示实现：账号数据只保存在浏览器本地存储中，不会上传到服务器。
const SESSION_KEY = 'zhitu:session'
const USERS_KEY = 'zhitu:users'

function createStore(getStorage) {
  return {
    read(key, fallback) {
      try {
        const raw = getStorage().getItem(key)
        return raw ? JSON.parse(raw) : fallback
      } catch {
        return fallback
      }
    },
    write(key, value) {
      try {
        const storage = getStorage()
        if (value === null) {
          storage.removeItem(key)
        } else {
          storage.setItem(key, JSON.stringify(value))
        }
      } catch {
        // 隐私模式或存储被禁用时降级为纯内存状态
      }
    },
  }
}

const local = createStore(() => window.localStorage)
const session = createStore(() => window.sessionStorage)

const storedUsers = local.read(USERS_KEY, [])
const users = ref(Array.isArray(storedUsers) ? storedUsers : [])
const user = ref(local.read(SESSION_KEY, null) ?? session.read(SESSION_KEY, null))

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

/** persist = false 时使用 sessionStorage，仅在本次会话内保持登录 */
function setSession(profile, persist = true) {
  user.value = profile
  const target = persist ? local : session
  const other = persist ? session : local
  target.write(SESSION_KEY, profile)
  other.write(SESSION_KEY, null)
}

function login({ account, password }, options = {}) {
  const key = normalize(account)
  if (!key) return { ok: false, error: '请先填写账号。' }
  if (!password) return { ok: false, error: '请先填写密码。' }

  const matched = users.value.find((item) => normalize(item.account) === key)
  if (!matched) return { ok: false, error: '没有找到这个账号，先注册一个吧。' }
  if (matched.password !== password) return { ok: false, error: '密码不正确，请重新输入。' }

  setSession({ name: matched.name, account: matched.account }, options.persist !== false)
  return { ok: true }
}

function register({ name, account, password }, options = {}) {
  const key = normalize(account)
  if (users.value.some((item) => normalize(item.account) === key)) {
    return { ok: false, error: '该账号已注册，直接登录即可。' }
  }

  const profile = { name: String(name).trim(), account: String(account).trim(), password }
  users.value = [...users.value, profile]
  local.write(USERS_KEY, users.value)
  setSession({ name: profile.name, account: profile.account }, options.persist !== false)
  return { ok: true }
}

function logout() {
  setSession(null)
}

export function useAuth() {
  return {
    user,
    isLoggedIn: computed(() => user.value !== null),
    login,
    register,
    logout,
  }
}

export function isAuthenticated() {
  return user.value !== null
}
