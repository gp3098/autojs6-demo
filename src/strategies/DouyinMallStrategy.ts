import { IAppTaskStrategy } from '../core/IAppTaskStrategy';
import { AdState } from '../core/Enums';

export class DouyinMallStrategy implements IAppTaskStrategy {
  public appPackage = 'com.ss.android.ugc.livelite';
  public appName = '抖音商城';

  handleGlobalPopups(): boolean {
    // 抖音商城版的全局弹窗处理
    const upgrade = textContains('升级').findOnce();
    if (upgrade) {
       const close = text('以后再说').findOnce() || text('取消').findOnce();
       if (close) { close.click(); return true; }
    }
    
    const signIn = textContains('每日签到').findOnce() || textContains('签到领金币').findOnce();
    if (signIn) {
       signIn.clickBounds(10, 10);
       return true;
    }
    return false;
  }

  handleAppLaunching(): boolean {
    const pkg = currentPackage();
    const activity = currentActivity();
    if (pkg !== this.appPackage || activity !== 'com.ss.android.ugc.livelite.MainActivity') {
      toastLog(`正在启动 ${this.appName}...`);
      log('handleAppLaunching: pkg=' + pkg + ', activity=' + activity);
      launchApp(this.appName);
      return false; 
    }

    // 尝试寻找赚金币按钮
    const earnCoinsBtn = textContains('赚金币').findOnce();
    if (earnCoinsBtn) {
       earnCoinsBtn.clickBounds(10, 10);
       // 根据网络状态，可能需要等一下加载
       sleep(1000);
       return true;
    }
    
    // 如果已经在赚金币页面
    if (textContains('看广告视频').exists() || textContains('看视频').exists()) {
       return true; 
    }

    return false; // 继续轮询寻找
  }

  handleWelfarePage(): 'TRIGGER_AD' | 'FINISHED' | 'WAITING' {
    const watchAdBtn = textContains('看广告视频').findOnce() || textContains('去领钱').findOnce();
    if (watchAdBtn) {
      toastLog('点击：看广告赚金币');
      watchAdBtn.clickBounds(10, 10);
      return 'TRIGGER_AD';
    }
    return 'WAITING';
  }

  pollAdSubTask(currentState: AdState): { nextState?: AdState, requestFallback?: boolean } {
    if (currentState === AdState.WATCHING_AD) {
       // 寻找关闭或跳过或领取奖励
       const close = textContains('关闭').findOnce() || textContains('跳过').findOnce() || text('领取奖励').findOnce();
       if (close) {
          close.clickBounds(10, 10);
          return { nextState: AdState.WAITING_FOR_REWARD };
       }
    }
    
    if (currentState === AdState.WAITING_FOR_REWARD) {
       const rewardClose = text('开心收下').findOnce() || text('去提现').findOnce() || textContains('继续看').findOnce();
       if (rewardClose) {
          rewardClose.clickBounds(10, 10);
          if (rewardClose.text().includes('继续看')) {
             return { nextState: AdState.WATCHING_AD };
          }
       }
       // 如果没有弹窗，认为直接结束
       return { nextState: AdState.DONE };
    }
    return {};
  }
}
