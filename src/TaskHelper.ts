import { BehaviorSubject, Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

// ============================================
// 状态枚举定义
// ============================================

export enum GlobalState {
  INIT = "INIT", // 初始状态
  APP_LAUNCHING = "APP_LAUNCHING", // 检查/启动应用
  WELFARE_PAGE = "WELFARE_PAGE", // 处于福利页，分发任务
  SUBTASK_AD = "SUBTASK_AD", // 正在执行看广告子任务
  FALLBACK = "FALLBACK", // 迷失页面，尝试不断回退
  FINISHED = "FINISHED", // 全部任务完成
}

export enum AdState {
  IDLE = "IDLE", // 未激活
  WATCHING_AD = "WATCHING_AD", // 正在观看广告（监测跳过/关闭按钮）
  WAITING_FOR_REWARD = "WAITING_FOR_REWARD", // 广告结束，尝试点击立即领取/看视频再领
  DONE = "DONE", // 单次看视频结束
}

export class TaskHelper {
  // 定义状态机数据流
  private globalState$ = new BehaviorSubject<GlobalState>(GlobalState.INIT);
  private adState$ = new BehaviorSubject<AdState>(AdState.IDLE);

  // 销毁流，用于结束任务
  private destroy$ = new Subject<void>();

  // 销毁标志，用于结束 while 轮询
  private isDestroyed = false;

  // 记录持续在未知页面的次数，达到阈值触发 Fallback
  private lostCount = 0;

  constructor() {}

  // ============================================
  // 公共入口
  // ============================================

  public start() {
    log("RxJS TaskHelper started");
    auto.waitFor();
    this.setupStateMachine();

    // 初始化状态，进入应用启动环节
    this.globalState$.next(GlobalState.APP_LAUNCHING);

    // ❗️ 在 AutoJs Rhino 引擎里使用 Webpack 打包的 setInterval (RxJS interval 底层依赖) 会导致
    // 脚本以为没有挂起的任务而直接结束。最稳健的方案是使用主线程原生的 while + sleep() 轮询。
    while (!this.isDestroyed) {
      this.pollUIAndTransition();
      sleep(1500); // 每次扫描间隔 1.5 秒
    }

    log("Main Poll Loop Completed");
  }

  public stop() {
    toastLog("停止全部任务");
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // 状态机核心轮询与切换
  // ============================================

  private pollUIAndTransition() {
    try {
      const state = this.globalState$.getValue();

      // 全局 UI 弹窗兜底拦截
      // 如果检测到弹窗并处理了，我们会跳过这一帧里的业务逻辑（避免同时点错）
      if (this.handleGlobalPopups()) {
        return;
      }

      switch (state) {
        case GlobalState.APP_LAUNCHING:
          this.handleAppLaunching();
          break;
        case GlobalState.WELFARE_PAGE:
          this.handleWelfarePage();
          break;
        case GlobalState.SUBTASK_AD:
          this.pollAdSubTask();
          break;
        case GlobalState.FALLBACK:
          this.handleFallback();
          break;
        case GlobalState.FINISHED:
          this.stop();
          break;
      }
    } catch (error) {
      console.error("Error in pollUIAndTransition", error);
    }
  }

  private setupStateMachine() {
    // 监听状态变化并打印日志 (可选)
    this.globalState$.pipe(takeUntil(this.destroy$)).subscribe((s) => {
      console.log(`[Global State Change] => ${s}`);
    });
    this.adState$.pipe(takeUntil(this.destroy$)).subscribe((s) => {
      if (s !== AdState.IDLE) {
        console.log(`[Ad State Change] => ${s}`);
      }
    });
  }

  // ============================================
  // 具体状态处理器
  // ============================================

  /**
   * 全局弹窗拦截器
   * 包含：升级弹窗、签到弹窗、推荐弹窗等
   * 返回 true 表示有弹窗被处理
   */
  private handleGlobalPopups(): boolean {
    let popupHandled = false;

    // 1. 升级弹窗
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

    // 2. 签到弹窗
    const signInPopup = textContains("立即签到").findOnce();
    if (signInPopup) {
      signInPopup.clickBounds(10, 10);
      toastLog("点击了立即签到弹窗");
      popupHandled = true;
    }

    // 3. 询问是否推荐的弹窗
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

    // 4. 百万金币平分 - “我知道了” 弹窗
    const knowButton = textContains("我知道了").findOnce();
    if (knowButton) {
      knowButton.clickBounds(10, 10);
      toastLog("关闭了“我知道了”弹窗");
      popupHandled = true;
    }

    return popupHandled;
  }

  /**
   * APP 启动状态：检查包名，尝试跳转福利页
   */
  private handleAppLaunching() {
    const pkg = currentPackage();
    const currentAct = currentActivity();
    if (
      pkg !== "com.phoenix.read" ||
      currentAct !== "com.dragon.read.pages.main.MainFragmentActivity"
    ) {
      console.log("当前包名：" + pkg + " 当前Activity：" + currentAct);
      toastLog("启动红果免费短剧应用...当前包名：" + pkg + " 当前Activity：" + currentAct);
      launchApp("红果免费短剧");
      this.lostCount = 0;
      return; // 等待下一帧检查
    }

    // 如果处于主应用环境，尝试找【福利】导航按钮去福利页
    const welfareNavBtn = text("赚钱").findOnce();
    const welfareAltBtn = id("com.phoenix.read:id/d94").findOnce(); // 另一种变体的立即领取按钮

    if (welfareNavBtn) {
      log("找到福利入口，准备进入");
      welfareNavBtn.clickBounds(10, 10);
      // 跳转成功后，设定状态为福利页
      this.globalState$.next(GlobalState.WELFARE_PAGE);
      this.lostCount = 0;
      log("lostCount: " + this.lostCount);
    } else if (welfareAltBtn) {
      log("找到另一种福利入口按钮，点击");
      welfareAltBtn.clickBounds(10, 10);
      this.globalState$.next(GlobalState.WELFARE_PAGE);
      this.lostCount = 0;
    } else {
      // 没有任何认识的入口按钮，增加迷失计数
      this.lostCount++;
      if (this.lostCount > 10) {
        log("10秒内未找到福利入口，尝试 Fallback 回退机制");
        this.globalState$.next(GlobalState.FALLBACK);
      }
    }
  }

  /**
   * 福利页面任务分配枢纽
   */
  private handleWelfarePage() {
    this.lostCount = 0; // 重置计数
    //福利页面的任务一页显示不下，需要上下滑动才能查看到所有的任务。
    //福利页面目前能够执行的任务有：
    //1.看视频转海量金币(需要翻页)

    // // 任务1：开宝箱得金币
    // const openChestBtn = textContains('开宝箱得金币').findOnce();
    // if (openChestBtn) {
    //   toastLog('触发: 开宝箱得金币');
    //   openChestBtn.clickBounds(10, 10);
    //   this.startAdSubTask();
    //   return;
    // }

    // // 任务2：找“看视频再领”、“看视频最高再领”按钮
    // const watchVideoBtn1 = textContains('看视频再领').clickable(true).findOnce();
    // const watchVideoBtn2 = textContains('看视频最高再领').clickable(true).findOnce();
    // if (watchVideoBtn1 || watchVideoBtn2) {
    //   toastLog('触发: 连续看视频');
    //   (watchVideoBtn1 || watchVideoBtn2)?.clickBounds(10, 10);
    //   this.startAdSubTask();
    //   return;
    // }

    // // 任务3：百万金币平分
    // const millionGoldBtn = textContains('百万金币平分').findOnce();
    // if (millionGoldBtn) {
    //   if (!textContains('去看看').exists()) {
    //     toastLog('触发: 百万金币平分活动');
    //     millionGoldBtn.clickBounds(10, 10);
    //     // 百万金币平分一般会跳出新的 WebView 页面
    //     // 这里可以直接等待 “立即打卡参与”
    //     const participateButton = textContains('立即打卡参与').findOne(3000);
    //     if (participateButton) {
    //       participateButton.clickBounds(10, 10);
    //     }
    //     return;
    //   }
    // }

    // 如果没有任何可做的任务，假设我们要不就挂机，要不就退出
    // 这里做个简单示例：停留
    log("福利页暂无匹配任务，等待中...");
  }

  /**
   * Fallback: 不断系统回退，来消灭乱飞的页面
   */
  private handleFallback() {
    toastLog("进入 Fallback，尝试返回操作...");
    const backBtnApp = id("com.phoenix.read:id/dam").findOnce(); // APP 内部的返回小箭头
    if (backBtnApp) {
      backBtnApp.click();
    } else {
      back(); // 系统级物理返回
    }

    // 返回后，将状态回调到检查启动状态
    this.lostCount = 0;
    this.globalState$.next(GlobalState.APP_LAUNCHING);
  }

  // ============================================
  // 子状态机：看广告
  // ============================================

  private startAdSubTask() {
    this.globalState$.next(GlobalState.SUBTASK_AD);
    this.adState$.next(AdState.WATCHING_AD);
    this.lostCount = 0;
  }

  private pollAdSubTask() {
    const s = this.adState$.getValue();

    // 兜底广告内关闭弹窗 (有的广告点完开宝箱会先弹个恭喜获得金币)
    const collectBtn = id("com.phoenix.read:id/cc5").findOnce(); // 恭喜获得xx金币 的关闭或领取按钮
    if (collectBtn) {
      collectBtn.clickBounds(10, 10);
      return;
    }

    if (s === AdState.WATCHING_AD) {
      // 在广告播放中查找跳过/关闭
      const closeAction = textContains("关闭").findOnce() || textContains("跳过").findOnce();
      if (closeAction) {
        log("发现广告关闭/跳过按钮");
        closeAction.clickBounds(10, 10);
        // 结束观看后，很可能跳出第二个奖励窗口
        this.adState$.next(AdState.WAITING_FOR_REWARD);
        this.lostCount = 0;
      } else {
        // 如果找不到关闭跳过，增加计数（防止死等的防卡死逻辑），如果广告真有60秒，这儿需要配合比较大的阈值
        this.lostCount++;
        if (this.lostCount > 60) {
          log("看广告超过预期时间(或卡死)，尝试物理返回拔出");
          back();
          this.adState$.next(AdState.DONE);
          this.lostCount = 0;
        }
      }
    } else if (s === AdState.WAITING_FOR_REWARD) {
      // 广告关闭后，看是否有继续领取的提示
      const continueRewardBtn =
        textContains("看视频再领").findOnce() || textContains("看视频最高再领").findOnce();
      const directRewardBtn = text("立即领取").clickable(true).visibleToUser(true).findOnce();

      if (continueRewardBtn) {
        log("出现连播广告奖励提示，继续观看");
        continueRewardBtn.clickBounds(10, 10);
        this.adState$.next(AdState.WATCHING_AD); // 兜一圈再回去看广告状态
      } else if (directRewardBtn) {
        log("出现立即领取");
        directRewardBtn.clickBounds(10, 10);
      } else {
        // 如果这里屏幕上啥也没了，或者只有 cc5(上方已拦截)，或者识别不出连播提示，认为本次广告流程彻底结束
        this.lostCount++;
        if (this.lostCount > 3) {
          this.adState$.next(AdState.DONE);
        }
      }
    } else if (s === AdState.DONE) {
      log("广告任务闭环完成，回到主状态机");
      this.globalState$.next(GlobalState.WELFARE_PAGE);
      this.adState$.next(AdState.IDLE);
      this.lostCount = 0;
    }
  }
}
