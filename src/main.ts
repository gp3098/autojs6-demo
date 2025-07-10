import { TaskHelper } from './TaskHelper';

// 简单的 ES5 兼容类示例
function main(): void {
  try {
    var taskHelper = new TaskHelper();

    // 调用方法
    taskHelper.start();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
