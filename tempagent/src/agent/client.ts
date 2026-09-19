/**
 * OpenHex 客户端封装。
 *
 * 关键点：浏览器里永远不出现真实凭据。SDK 官方推荐两种做法，我们用的是
 * 第二种（反向代理替换 Authorization 头）——见 server/index.mjs 与 vite.config.ts。
 * 这里传的 `injected-by-proxy` 是**故意明显是假的占位符**：万一代理哪天忘了替换，
 * 上游返回的 401 一眼就能看出原因，而不是让人误以为 key 过期了。
 */
import { OpenhexClient } from '@openhex-ai/agent-sdk';

const agentId = (import.meta.env.VITE_AGENT_ID as string | undefined)?.trim();
const mockFlag = import.meta.env.VITE_MOCK as string | undefined;

/**
 * 没有配 VITE_AGENT_ID 就自动进 mock 模式 —— 零配置即可跑通全流程。
 * 等 Agent 同学给出 ID，往 .env 里加一行 VITE_AGENT_ID=… 就自动切到真链路。
 */
export const isMock = mockFlag === '1' || !agentId;

export const PROXY_BASE = `${window.location.origin}/openhex-proxy`;

let cached: OpenhexClient | null = null;

export function getClient(): OpenhexClient {
  if (!agentId) throw new Error('未配置 VITE_AGENT_ID，无法调用真实 Agent');
  cached ??= new OpenhexClient({
    baseUrl: PROXY_BASE,
    apiKey: 'injected-by-proxy',
    agentId,
  });
  return cached;
}

/** 预热：§7.1 冷启动 —— 首条消息会拉起 Agent 运行环境，可能要十几秒。 */
export async function warmUp(): Promise<void> {
  if (isMock) return;
  try {
    await getClient().sendMessage('[[mode:warmup]] 预备', { idleTimeoutMs: 60_000 });
  } catch {
    /* 预热失败不影响主流程，真链路会自己再拉一次 */
  }
}

/** 测试钩子：允许注入一个假客户端，避免真打网络。 */
export function __setClientForTest(client: OpenhexClient | null): void {
  cached = client;
}
