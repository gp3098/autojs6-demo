export class TaskHelper {
  private name: string;

  constructor() {
    this.name = 'AutoJS6 Demo';
    console.log('AppMgr initialized');
    this.showInfo();
  }

  showInfo(): void {
    console.log('Application: ' + this.name);
    console.log('Version: 1.0.0');
    console.log('Build time: ' + new Date().toISOString());
  }

  // 使用普通方法而不是箭头函数属性
  handleClick(): void {
    console.log('Button clicked!');
    app.launch('红果免费短剧');
  }
}
