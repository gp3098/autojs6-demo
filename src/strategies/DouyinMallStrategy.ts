import { IAppTaskStrategy } from '../core/IAppTaskStrategy';
import { AdState } from '../core/Enums';

export class DouyinMallStrategy implements IAppTaskStrategy {
   public appPackage = 'com.ss.android.ugc.livelite';
   //   public appPackage = 'com.ss.android.ugc.aweme';
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
      if (pkg !== this.appPackage) {
         toastLog(`正在启动 ${this.appName}...`);
         log('handleAppLaunching: pkg=' + pkg + ', activity=' + activity, 'this.appPackage=', this.appPackage, typeof this.appPackage, pkg === this.appPackage, typeof pkg);
         launchApp(this.appName);
         return false;
      }

      // 尝试寻找赚金币按钮
      const earnCoinsBtnBounds = [31, 415, 229, 614];
      const earnCoinsBtn = bounds(earnCoinsBtnBounds[0], earnCoinsBtnBounds[1], earnCoinsBtnBounds[2], earnCoinsBtnBounds[3]).findOnce();
      if (earnCoinsBtn) {
         earnCoinsBtn.clickBounds(10, 10);
         // 根据网络状态，可能需要等一下加载
         sleep(1000);
         return true;
      }

      // 如果已经在赚金币页面
      //这些文字需要ocr才能识别，所以不使用textContains，改用bounds
      const watchAdBtnBounds = [26, 1246, 1174, 1447];
      const watchAdBtn = bounds(watchAdBtnBounds[0], watchAdBtnBounds[1], watchAdBtnBounds[2], watchAdBtnBounds[3]).findOnce();
      if (watchAdBtn) {
         return true;
      }

      return false; // 继续轮询寻找
   }

   handleWelfarePage(): 'TRIGGER_AD' | 'FINISHED' | 'WAITING' {
      console.log('handleWelfarePage')
      const watchAdBtnBounds = [26, 1246, 1174, 1447]
      const watchAdBtn = bounds(watchAdBtnBounds[0], watchAdBtnBounds[1], watchAdBtnBounds[2], watchAdBtnBounds[3]).findOnce()
      console.log('handleWelfarePage watchAdBtn', watchAdBtn)
      // const watchAdBtn = textContains('看广告视频').findOnce() || textContains('去领钱').findOnce();
      if (watchAdBtn) {
         toastLog('点击：看广告赚金币');
         watchAdBtn.clickBounds(10, 10);
         return 'TRIGGER_AD';
      }
      return 'WAITING';
   }

   pollAdSubTask(currentState: AdState): { nextState?: AdState, requestFallback?: boolean } {
      if (currentState === AdState.WATCHING_AD) {
         // 使用截图 OCR 的方式来获取按钮的位置

         // 1. 获取截图权限
         try {
            if (!(global as any)._hasScreenCapture) {
               if (!requestScreenCapture(false)) {
                  toastLog('需要截图权限来进行 OCR！');
                  return {}; // 这一帧等待用户允许截图权限
               }
               (global as any)._hasScreenCapture = true;
            }
         } catch (e) {
            console.error('获取截图权限异常: ' + e);
            return {};
         }

         // 2. 截图
         const img = captureScreen();
         if (!img) return {};

         // 3. OCR 识别
         let isActionTaken = false;
         let targetNextState: AdState | undefined = undefined;

         const results = (global as any).ocr.mlkit.detect(img, { useSlim: true });
         console.log('OCR 识别结果', results)
         if (results) {
            const resultsArray = Array.from(results);

            // 4. 打印日志
            // console.log(`OCR 识别到 ${resultsArray.length} 个文本块`);

            for (let i = 0; i < resultsArray.length; i++) {
               const res: any = resultsArray[i];
               const label = res.label;

               // 判断是否是关闭或跳过按钮
               if (label.includes('关闭') || label.includes('跳过') || label.includes('领取奖励') || label.includes('跳过广告') || label.includes('领取成功') || label.includes('看广告翻开') || label.includes('看广告重翻') || label.includes('X')) {
                  log(`通过 OCR 发现操作按钮: [${label}]`);

                  // 5. 点击
                  click(res.bounds.centerX(), res.bounds.centerY());
                  isActionTaken = true;

                  // 7. 状态切换
                  targetNextState = AdState.WAITING_FOR_REWARD;
                  break;
               }
            }
         }

         // 6. 回收图片
         img.recycle();

         if (isActionTaken) {
            return { nextState: targetNextState };
         }

         // OCR 之后作为保险兜底，依然使用 UI 检索寻找是否有标准控件（因为有时 OCR 不稳定）
         const closeUi = textContains('关闭').findOnce() || textContains('跳过').findOnce() || text('领取奖励').findOnce();
         if (closeUi) {
            closeUi.clickBounds(10, 10);
            return { nextState: AdState.WAITING_FOR_REWARD };
         }
      }

      if (currentState === AdState.WAITING_FOR_REWARD) {
         // 第一层：开心收下 / 领取成功
         const rewardClose = textContains('开心收下').findOnce() || textContains('去提现').findOnce() || textContains('领取成功').findOnce();
         if (rewardClose) {
            log('检测到第一层领取按钮');
            rewardClose.clickBounds(10, 10);
            sleep(1000); // 稍微等待第二层二次挽留弹窗出现
         }

         // 第二层：“看视频继续领奖励”弹出层（包含两个选项：继续领奖励 / 坚持退出）
         const continueRewardBtn = textContains('继续领').findOnce() || textContains('继续观看').findOnce();
         const insistExitBtn = textContains('坚持退出').findOnce();

         if (continueRewardBtn || insistExitBtn) {
            if (continueRewardBtn) {
               log('检测到挽留弹窗，点击[继续领奖励]');
               continueRewardBtn.clickBounds(10, 10);
               // 重新回到看广告状态
               return { nextState: AdState.WATCHING_AD };
            } else if (insistExitBtn) {
               log('检测到挽留弹窗，只能[坚持退出]');
               insistExitBtn.clickBounds(10, 10);
               return { nextState: AdState.DONE };
            }
         }

         // TODO: 如果上述都没有触发，如何确认真的结束了？可以通过轮询一定次数后退出来实现（此处依赖外层的 lostCount 发挥作用）
      }
      return {};
   }
}
