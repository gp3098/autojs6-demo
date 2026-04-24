import { AdState } from "./Enums";

export interface IAppTaskStrategy {
  appPackage: string;
  appName: string;

  // 可选：策略自带完整引擎（任务调度器 + 状态机）时，直接由策略接管执行
  runWithCustomEngine?(): void;
  stopCustomEngine?(): void;

  // 必须实现：全局弹窗处理（包含升级、青少年模式、签到等）
  // @returns 是否成功拦截并处理了某个弹窗
  handleGlobalPopups(): boolean;

  // 必须实现：应用启动与首页路由校验
  // @returns true 表示成功定位到任务页，false 表示处于未知页面或启动中
  handleAppLaunching(): boolean;

  // 必须实现：福利页/任务页分配处理
  // @returns 'TRIGGER_AD' 触发接下来的广告任务, 'FINISHED' 任务做完了, 'WAITING' 什么也没匹配到继续等待
  handleWelfarePage(): "TRIGGER_AD" | "FINISHED" | "WAITING";

  // 必须实现：看广告子状态机的流转处理
  // @returns nextState：指示引擎应流转到的下一个状态，若没有返回则维持现状
  // @returns lostCountModifier：如果发现异常，要求引擎重置或叠加重试次数。如 fallback 设为 true 则要求脱困
  pollAdSubTask(currentState: AdState): { nextState?: AdState; requestFallback?: boolean };
}
