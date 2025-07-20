export class TaskHelper {
  //恭喜你获得xxx金币弹窗的selector
  get popup1Selector() {
    return id('com.phoenix.read:id/cc5');
  }

  get popup1CloseBtn() {
    return this.popup1Selector.findOne(1000);
  }

  get popup2Selector() {
    return textContains('看视频再领');
  }

  get popup5Selector() {
    return textContains('看视频最高再领');
  }

  constructor() {}

  // 使用普通方法而不是箭头函数属性
  async start() {
    log('TaskHelper started');
    auto.waitFor();
    try {
      //前往福利页面
      const res = this.gotoWelfarePage();
      log('start target tasks', res);
      await this.startTasks();
    } catch (error) {
      console.error('Error in start method:', error);
      toastLog('Error in start method: ' + error);
    }
  }

  gotoWelfarePage() {
    log('gotoWelfarePage called');
    // 打开红果免费短剧应用
    launchApp('红果免费短剧');
    //日志打当前的活动名称
    const currentActivityName = currentActivity();
    toastLog(`当前活动名称: ${currentActivityName}`);
    //日志打印当前包名称
    const currentPackageName = currentPackage();
    toastLog(`当前包名称: ${currentPackageName}`);
    //处理升级弹窗，自动关闭
    this.closeUpgradePopup();

    //关闭签到弹窗
    toastLog('尝试关闭签到弹窗');
    const signInPopup = textContains('立即签到').findOne(1000);
    if (signInPopup?.clickBounds(10, 10)) {
      log('Clicked on sign-in popup');
    } else {
      log('Sign-in popup not found or click failed');
    }

    this.closePopup1();

    this.closePopup2();

    this.closePopup3();

    this.closePopup4();

    this.closePopup5();

    const navResult = this.tryNavigateToWelfarePage();
    console.log('Navigation result:', navResult);
    if (!navResult) {
      log('Welfare navigate button not found1, trying to go back');
      const backBtnSelector = id('com.phoenix.read:id/dam');
      if (backBtnSelector.exists()) {
        log('Click back button');
        const goBackResult = backBtnSelector.findOne(1000)?.click();
        if (!goBackResult) {
          back();
        }
        const res = this.tryNavigateToWelfarePage();
        log(`tryNavigateToWelfarePage result: ${res}`);
      } else {
        if (id('com.phoenix.read:id/d94').exists()) {
          log('尝试通过按下立即领取按钮打开福利页面');
          id('com.phoenix.read:id/d94').findOne(1000)?.clickBounds(10, 10);
          return;
        }
        back();
        const res = this.tryNavigateToWelfarePage();
        log(`tryNavigateToWelfarePage result: ${res}`);
      }
    }
  }

  tryNavigateToWelfarePage = () => {
    log('try Navigating to welfare page');
    const findWelfareNavigateSelector = id('com.phoenix.read:id/aeb');
    if (findWelfareNavigateSelector.exists()) {
      findWelfareNavigateSelector.findOne(1).clickBounds(10, 10);
      log('Clicked on welfare navigate button');
      return true;
    } else {
      log('Welfare navigate button not found');
      return false;
    }
  };

  closeUpgradePopup = () => {
    log('Closing upgrade popup if exists');
    // 检查是否有升级弹窗
    const upgradePopup1 = textContains('升级').findOne(1000);
    const upgradePopup2 = textContains('新版本邀请你来抢险体验').findOne(1000);
    const upgradePopup3 = id('com.phoenix.read:id/gty').visibleToUser(true).findOne(1000);
    if (upgradePopup1 || upgradePopup2 || upgradePopup3) {
      // 如果存在升级弹窗，点击关闭按钮
      // upgradePopup1?.click();
      // upgradePopup2?.click();
      if (upgradePopup3) {
        toastLog('尝试自动关闭升级弹窗');
        const result = id('com.phoenix.read:id/gth').click();
        result && toastLog('升级弹窗已关闭');
      }
      return;
    }
    log('No upgrade popup found');
  };

  /**
   * 关闭“恭喜你获得xx金币”弹窗
   * @returns
   */
  closePopup1 = () => {
    // log('关闭“恭喜你获得xx金币”弹窗');
    if (this.popup1Selector.exists()) {
      log('恭喜你获得xx金币弹窗已找到，尝试关闭');
      if (this.popup1CloseBtn?.clickBounds(10, 10)) {
        log('成功关闭“恭喜你获得xx金币”弹窗');
      } else {
        log('未能成功关闭“恭喜你获得xx金币”弹窗');
      }
    }
  };

  /**
   * 关闭“看视频再领”弹窗
   * @returns
   */
  closePopup2 = () => {
    if (this.popup2Selector.exists()) {
      log('看视频再领弹窗已找到，尝试关闭');
      if (this.popup2Selector.findOne(1000).clickBounds(0, 250)) {
        log('成功关闭“看视频再领”弹窗');
      } else {
        log('未能成功关闭“看视频再领”弹窗');
      }
    }
  };

  /**
   * 关闭
   */
  closePopup3 = () => {
    const recommendBtnSelector = id('com.phoenix.read:id/f').visibleToUser(true).clickable(true);
    if (recommendBtnSelector.exists()) {
      log('找到了推荐按钮，尝试关闭');
      recommendBtnSelector.findOne(1000)?.clickBounds(10, 10);
    }
  };

  /**
   * 关闭“是否会推荐给其他人”的弹窗
   */
  closePopup4 = () => {
    const btn = id('com.phoenix.read:id/bxe').visibleToUser(true).clickable(true);
    if (btn.exists()) {
      log('找到了推荐的关闭按钮，尝试关闭');
      btn.findOne(1000)?.click();
    }
  };

  /**
   * 关闭“看视频最高再领”弹窗
   * @returns
   */
  closePopup5 = () => {
    if (this.popup5Selector.exists()) {
      log('看视频最高再领弹窗已找到，尝试关闭');
      if (this.popup5Selector.findOne(1000).clickBounds(0, 250)) {
        log('成功关闭“看视频最高再领”弹窗');
      } else {
        log('未能成功关闭“看视频最高再领”弹窗');
      }
    }
  };

  startTasks = async () => {
    log('Starting tasks');
    this.executeOpenChestTask();

    this.executeClickRewardTask();

    this.executeMillionGoldTask();
  };
  /**
   * 开宝箱得币任务
   */
  executeOpenChestTask = () => {
    toastLog('任务： 开宝箱得金币');
    const openChestResult = textContains('开宝箱得金币').findOnce()?.clickBounds(10, 10);
    if (openChestResult) {
      log('Clicked on open chest button');
      //关闭弹窗
      id('com.phoenix.read:id/cc5').findOnce()?.clickBounds(10, 10);
      log('Closed popup after opening chest');
    }
  };

  /**
   * 任务: 点击立即领取
   */
  executeClickRewardTask = () => {
    toastLog('任务： 点击立即领取');
    //点击下一个奖励
    // textContains('下一个奖励').findOnce()?.clickBounds(10, 10);
    // toastLog('点击下一个奖励');
    //关闭弹窗
    // id('com.phoenix.read:id/cc5').findOnce()?.clickBounds(10, 10);
    //点击领取奖励
    const clickRewardResult = text('立即领取').clickable(true).visibleToUser(true).findOnce()?.clickBounds(10, 10);

    if (clickRewardResult) {
      toastLog('成功点击领取奖励');
      const closePopupResult = id('com.phoenix.read:id/cc5').findOnce()?.clickBounds(10, 10);
      if (closePopupResult) {
        toastLog('成功关闭弹窗');
      }
    }
    this.closePopup2();
  };

  /**
   * 任务: 点击“百万金币平分”的“立即参与”按钮，等待新的活动页面加载，再点击“立即打卡参与”按钮
   */
  executeMillionGoldTask = () => {
    toastLog('任务： 点击“百万金币平分”的“立即参与”按钮');
    //点击百万金币平分的立即参与按钮
    const millionGoldButton = textContains('百万金币平分').findOnce()?.clickBounds(10, 10);
    log('Clicked on million gold button', millionGoldButton);
    waitForActivity('com.dragon.read.bullet.widget.BulletContainerActivity', 1000, {
      then: () => {
        log('Activity is ready: com.dragon.read.pages.main.MainFragmentActivity');
        // 点击“立即打卡参与”按钮
        const participateButton = textContains('立即打卡参与').findOne(3000);
        if (participateButton) {
          log('Clicked on participate button');
          participateButton.clickBounds(10, 10);
          //点完后会弹出新的弹窗，然后要点我知道了按钮
          const knowButton = textContains('我知道了').findOne(3000);
          if (knowButton) {
            log('Clicked on know button');
            knowButton.clickBounds(10, 10);
          }
        } else {
          log('Participate button not found');
        }
      },
      else() {
        log('Activity not found within timeout');
      },
    });
  };

  // getTasks = async () => {
  //   //打开红果免费短剧
  //   launchApp('红果免费短剧');
  //   // launchPackage('com.phoenix.read');

  //   waitForActivity('com.dragon.read.component.shortvideo.impl.ShortSeriesActivity', 1000, {
  //     then: () => {
  //       log('Activity is ready: com.dragon.read.component.shortvideo.impl.ShortSeriesActivity');
  //       // swipe(500, 1000, 500, 500, 500);
  //       back();
  //       waitForActivity('com.dragon.read.pages.main.MainFragmentActivity', 1000, {
  //         then: () => {
  //           log('Activity is ready: com.dragon.read.pages.main.MainFragmentActivity');
  //           this.activityReadyCallback();
  //           textContains('立即签到').click();
  //         },
  //         else() {
  //           log('Activity not found within timeout');
  //         },
  //       });
  //     },
  //     else() {
  //       log('Activity not found within timeout');
  //     },
  //   });
  //   //等待打开成功
  //   waitForActivity('com.dragon.read.pages.main.MainFragmentActivity', 1000, {
  //     then: () => {
  //       log('Activity is ready: com.dragon.read.pages.main.MainFragmentActivity');
  //       this.activityReadyCallback();
  //       textContains('立即签到').click();
  //     },
  //     else() {
  //       log('Activity not found within timeout');
  //     },
  //   });

  //   waitForActivity('com.bytedance.ies.bullet.service.popup.ui.a.a', 1000, {
  //     then: () => {
  //       log('Activity is ready: com.bytedance.ies.bullet.service.popup.ui.a.a');
  //       // 关闭弹窗
  //       // toastLog(textContains('立即签到').findOne(1000).click());
  //       // log(textContains('立即签到').findOne(1000).clickBounds(10, 10));
  //       wait(() => textContains('立即签到').findOne(1000), 1000, {
  //         then: () => {
  //           log('Found "立即签到" button');
  //           textContains('立即签到').click();
  //         },
  //         else() {
  //           log('"立即签到" button not found');
  //           if (textContains('签到成功').exists()) {
  //             log('签到成功');

  //             // const button = textContains('看视频').findOne(1000);
  //             // if (button) {
  //             //   log('Found "看视频" button');
  //             //   button.clickBounds(10, 10);
  //             // } else {
  //             //   log('"看视频" button not found');
  //             // }
  //           }
  //         },
  //       });
  //     },
  //     else() {
  //       log('Activity not found within timeout');
  //     },
  //   });

  //   //监测当前页面

  //   //检查是否有弹窗要关闭
  //   //点击“福利”按钮
  // };

  // activityReadyCallback(): void {
  //   // 在这里执行需要在活动准备好后进行的操作
  //   id('aeb').click();
  // }
}
