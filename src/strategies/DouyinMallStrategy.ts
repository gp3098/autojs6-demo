import { IAppTaskStrategy } from '../core/IAppTaskStrategy';
import { AdState } from '../core/Enums';
import { DouyinScheduler } from '../douyin/DouyinScheduler';

export class DouyinMallStrategy implements IAppTaskStrategy {
  public appPackage = 'com.ss.android.ugc.livelite';
  public appName = '抖音商城';

  private scheduler: DouyinScheduler | null = null;

  public runWithCustomEngine() {
    if (!this.scheduler) {
      this.scheduler = new DouyinScheduler();
    }
    this.scheduler.start();
  }

  public stopCustomEngine() {
    this.scheduler?.stop();
  }

  // 兼容旧接口（当 runWithCustomEngine 存在时不会被状态机主流程调用）
  handleGlobalPopups(): boolean {
    return false;
  }

  handleAppLaunching(): boolean {
    return false;
  }

  handleWelfarePage(): 'TRIGGER_AD' | 'FINISHED' | 'WAITING' {
    return 'WAITING';
  }

  pollAdSubTask(_currentState: AdState): { nextState?: AdState; requestFallback?: boolean } {
    return {};
  }
}
