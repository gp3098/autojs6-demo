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
    launchApp('com.phoenix.read');
    //等待打开成功
    waitForActivity('com.dragon.read.pages.main.MainFragmentActivity', 1000, {
      then: () => {
        log('Activity is ready: com.dragon.read.pages.main.MainFragmentActivity');
        this.activityReadyCallback();
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
