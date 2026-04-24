import { IAppTaskStrategy } from "../core/IAppTaskStrategy";
import { AdState } from "../core/Enums";

export class PhoenixReadStrategy implements IAppTaskStrategy {
  public appPackage = "com.phoenix.read";
  public appName = "红果免费短剧";

  handleGlobalPopups(): boolean {
    let popupHandled = false;

    // 升级弹窗
    const upgradeSelectors = [
      textContains("升级").findOnce(),
      textContains("新版本邀请你来抢险体验").findOnce(),
      id("com.phoenix.read:id/gty").visibleToUser(true).findOnce(),
    ];
    if (upgradeSelectors.some((node) => node != null)) {
      const closeObj = id("com.phoenix.read:id/gth").findOnce();
      if (closeObj && closeObj.click()) {
        toastLog("自动关闭了升级弹窗");
        popupHandled = true;
      }
    }

    // 签到
    const signInPopup = textContains("立即签到").findOnce();
    if (signInPopup) {
      signInPopup.clickBounds(10, 10);
      toastLog("点击了立即签到弹窗");
      popupHandled = true;
    }

    // 推荐弹窗
    const recommendBtn = id("com.phoenix.read:id/f").visibleToUser(true).clickable(true).findOnce();
    const recommendCloseBtn = id("com.phoenix.read:id/bxe")
      .visibleToUser(true)
      .clickable(true)
      .findOnce();
    if (recommendBtn || recommendCloseBtn) {
      recommendCloseBtn?.click();
      toastLog("自动关闭推荐弹窗");
      popupHandled = true;
    }

    // 百万金币平分 - “我知道了”
    const knowButton = textContains("我知道了").findOnce();
    if (knowButton) {
      knowButton.clickBounds(10, 10);
      toastLog("关闭了“我知道了”弹窗");
      popupHandled = true;
    }

    return popupHandled;
  }

  handleAppLaunching(): boolean {
    const pkg = currentPackage();
    const currentAct = currentActivity();
    if (
      pkg !== this.appPackage ||
      currentAct !== "com.dragon.read.pages.main.MainFragmentActivity"
    ) {
      toastLog(`启动中... 当前包名: ${pkg}`);
      launchApp(this.appName);
      return false;
    }

    const welfareNavBtn = text("赚钱").findOnce();
    const welfareAltBtn = id("com.phoenix.read:id/d94").findOnce();

    if (welfareNavBtn) {
      log("找到福利入口，准备进入");
      welfareNavBtn.clickBounds(10, 10);
      return true;
    } else if (welfareAltBtn) {
      log("找到另一种福利入口按钮，点击");
      welfareAltBtn.clickBounds(10, 10);
      return true;
    }
    return false;
  }

  handleWelfarePage(): "TRIGGER_AD" | "FINISHED" | "WAITING" {
    const openChestBtn = textContains("开宝箱得金币").findOnce();
    if (openChestBtn) {
      toastLog("触发: 开宝箱");
      openChestBtn.clickBounds(10, 10);
      return "TRIGGER_AD";
    }

    const watchVideoBtn1 = textContains("看视频再领").clickable(true).findOnce();
    const watchVideoBtn2 = textContains("看视频最高再领").clickable(true).findOnce();
    if (watchVideoBtn1 || watchVideoBtn2) {
      toastLog("触发: 连续看视频");
      (watchVideoBtn1 || watchVideoBtn2)?.clickBounds(10, 10);
      return "TRIGGER_AD";
    }

    return "WAITING";
  }

  pollAdSubTask(currentState: AdState): { nextState?: AdState; requestFallback?: boolean } {
    const collectBtn = id("com.phoenix.read:id/cc5").findOnce();
    if (collectBtn) {
      collectBtn.clickBounds(10, 10);
      return {};
    }

    if (currentState === AdState.WATCHING_AD) {
      const closeAction = textContains("关闭").findOnce() || textContains("跳过").findOnce();
      if (closeAction) {
        log("发现广告关闭/跳过按钮");
        closeAction.clickBounds(10, 10);
        return { nextState: AdState.WAITING_FOR_REWARD };
      }
      return {};
    }

    if (currentState === AdState.WAITING_FOR_REWARD) {
      const continueRewardBtn =
        textContains("看视频再领").findOnce() || textContains("看视频最高再领").findOnce();
      const directRewardBtn = text("立即领取").clickable(true).visibleToUser(true).findOnce();

      if (continueRewardBtn) {
        log("出现连播广告奖励提示，继续观看");
        continueRewardBtn.clickBounds(10, 10);
        return { nextState: AdState.WATCHING_AD };
      } else if (directRewardBtn) {
        log("出现立即领取");
        directRewardBtn.clickBounds(10, 10);
        return {};
      } else {
        return { nextState: AdState.DONE };
      }
    }

    return {};
  }
}
