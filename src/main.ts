// 简单的 ES5 兼容类示例
class AppMgr {
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
  }
}

function main(): void {
  try {
    var appMgr = new AppMgr();
    
    // 使用简单的对象合并，避免展开语法
    var config = {
      debug: true,
      timeout: 5000
    };
    
    var extendedConfig = {
      debug: config.debug,
      timeout: config.timeout,
      name: 'Extended Config',
      version: '1.0.0'
    };
    
    console.log('Config:', extendedConfig);
    
    // 调用方法
    appMgr.handleClick();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
