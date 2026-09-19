/**
 * 数字人话术表 —— 逐条对应 §2.2「交互模式」。
 *
 * 为什么单独一个文件：§7.4 要求四种模式共享同一人设、禁止语气跳变。
 * 平台生成的话术和前端兜底话术都从这里取，才能保证「Agent 挂了」和
 * 「Agent 正常」两种情况下，用户听到的是同一个人的声音。
 */
export const COPY = {
  greeting: '我是智图伙伴，今天想学点什么？',
  resume: (nodeName: string) => `欢迎回来，你上次学到「${nodeName}」，要继续吗？`,
  thinkingMap: '正在为你整理知识地图……',
  thinkingNode: '我去把这个节点整理一下……',
  thinkingCard: '我把这个知识点做成 3 分钟的学习卡……',
  degraded: '我暂时没连上网络，先看看示例地图吧。',
  emptyTopic: '先随便说一个你想学的主题就行，比如「机器学习」。',
  startStudy: '我们先花 3 分钟理解它，然后我会问你 3 个问题。',
  probeOnWrong: '别急，先告诉我你是怎么想到这个答案的？',
  mastered: (next: string) => `你已经掌握了这个节点，接下来想学「${next}」吗？`,
  /** §6.2 数字人在节点详情旁的引导：需要先掌握 X。 */
  needPrereq: (names: string[]) =>
    `这个节点需要先掌握「${names.join('」「')}」，你还没学。要我带你过去吗？`,
  /** 前置都掌握了。 */
  readyFor: (name: string) => `这个节点叫「${name}」，前置都掌握了，我们开始吧。`,
} as const;
