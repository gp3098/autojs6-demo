import { TaskHelper } from './TaskHelper';

function main(): void {
  try {
    const taskHelper = new TaskHelper();
    // 启动状态机任务 (内部将依靠 while 循环阻塞保活)
    taskHelper.start();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
