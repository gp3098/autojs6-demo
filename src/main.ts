import { TaskHelper } from './TaskHelper';

// 简单的 ES5 兼容类示例
function main(): void {
  console.launch();
  console.show();
  try {
    var taskHelper = new TaskHelper();

    // 使用简单的对象合并，避免展开语法
    var config = {
      debug: true,
      timeout: 5000,
    };

    var extendedConfig = {
      debug: config.debug,
      timeout: config.timeout,
      name: 'Extended Config',
      version: '1.0.0',
    };

    console.log('Config:', extendedConfig);

    // 调用方法
    taskHelper.handleClick();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
