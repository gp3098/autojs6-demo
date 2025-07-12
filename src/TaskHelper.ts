export class TaskHelper {
  private name: string;

  tasks: any[] = [];

  constructor() {
    this.name = 'AutoJS6 Demo';
    console.log('AppMgr initialized');
  }

  // 使用普通方法而不是箭头函数属性
  start(): void {
    log('TaskHelper started');
    auto.waitFor();
    this.getTasks();
  }

  getTasks(): void {
    //打开红果免费短剧
    launchApp('红果免费短剧');
    // launchPackage('com.phoenix.read');
    toastLog(currentActivity());
    waitForActivity('com.dragon.read.component.shortvideo.impl.ShortSeriesActivity', 1000, {
      then: () => {
        log('Activity is ready: com.dragon.read.component.shortvideo.impl.ShortSeriesActivity');
        // swipe(500, 1000, 500, 500, 500);
        back();
        waitForActivity('com.dragon.read.pages.main.MainFragmentActivity', 1000, {
          then: () => {
            log('Activity is ready: com.dragon.read.pages.main.MainFragmentActivity');
            this.activityReadyCallback();
            textContains('立即签到').click();
          },
          else() {
            log('Activity not found within timeout');
          },
        });
      },
      else() {
        log('Activity not found within timeout');
      },
    });
    //等待打开成功
    waitForActivity('com.dragon.read.pages.main.MainFragmentActivity', 1000, {
      then: () => {
        log('Activity is ready: com.dragon.read.pages.main.MainFragmentActivity');
        this.activityReadyCallback();
        textContains('立即签到').click();
      },
      else() {
        log('Activity not found within timeout');
      },
    });

    waitForActivity('com.bytedance.ies.bullet.service.popup.ui.a.a', 1000, {
      then: () => {
        log('Activity is ready: com.bytedance.ies.bullet.service.popup.ui.a.a');
        // 关闭弹窗
        // toastLog(textContains('立即签到').findOne(1000).click());
        // log(textContains('立即签到').findOne(1000).clickBounds(10, 10));
        wait(() => textContains('立即签到').findOne(1000), 1000, {
          then: () => {
            log('Found "立即签到" button');
            textContains('立即签到').click();
          },
          else() {
            log('"立即签到" button not found');
            if (textContains('签到成功').exists()) {
              log('签到成功');

              // const button = textContains('看视频').findOne(1000);
              // if (button) {
              //   log('Found "看视频" button');
              //   button.clickBounds(10, 10);
              // } else {
              //   log('"看视频" button not found');
              // }
            }
          },
        });
      },
      else() {
        log('Activity not found within timeout');
      },
    });

    //监测当前页面

    //检查是否有弹窗要关闭
    //点击“福利”按钮
  }

  activityReadyCallback(): void {
    // 在这里执行需要在活动准备好后进行的操作
    id('aeb').click();
  }
}
