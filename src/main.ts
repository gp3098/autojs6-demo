import { TaskManager, TaskRecord } from './core/TaskManager';
import { StateMachineEngine } from './core/StateMachineEngine';
import { TaskRunStatus } from './core/Enums';

// 在 Webpack 编译后，由于 BannerPlugin 介入，文件顶部会插入 "ui"; 
// 告诉 AutoJs 运行于 UI 模式
const taskManager = new TaskManager();
let currentTabId = 'all';

ui.layout(
  `<vertical>
      <appbar>
          <toolbar title="自动化任务中心" bg="#2196F3" />
          <tabs id="tabs" bg="#2196F3" textColor="#ffffff" />
      </appbar>
      <button id="btnAutoAll" text="▶ 自动连跑所有未完成任务" style="Widget.AppCompat.Button.Colored" padding="15" margin="10" />
      
      <list id="taskList" layout_weight="1">
          <card w="*" h="auto" margin="10 5" cardElevation="2dp" cardCornerRadius="5dp">
              <horizontal padding="16" gravity="center_vertical">
                  <vertical layout_weight="1">
                      <text id="taskName" textSize="16sp" textColor="#333333" text="{{this.taskName}}" textStyle="bold" />
                      <text id="appName" textSize="14sp" textColor="#777777" text="{{this.appName}}" marginTop="4" />
                  </vertical>
                  <vertical w="100" gravity="center">
                      <text id="status" textSize="12sp" textColor="#FF5722" text="{{this.status}}" marginBottom="5" />
                      <button id="btnRun" text="{{this.status === '已完成' ? '再跑一次' : '单独运行'}}" bg="#4CAF50" textColor="#ffffff" textSize="12sp" />
                  </vertical>
              </horizontal>
          </card>
      </list>
  </vertical>`
);

function renderList() {
    const data = taskManager.getTasksForApp(currentTabId);
    (ui as any).taskList.setDataSource(data);
}

// 初始化 Tabs
const apps = taskManager.getApps();
(ui as any).tabs.setupWithViewPager(null);

for(let i = 0; i < apps.length; i++) {
    (ui as any).tabs.addTab((ui as any).tabs.newTab().setText(apps[i].name));
}

(ui as any).tabs.addOnTabSelectedListener(new (com as any).google.android.material.tabs.TabLayout.OnTabSelectedListener({
    onTabSelected: function(tab: any) {
        currentTabId = apps[tab.getPosition()].id;
        renderList();
    }
}));

// 初始化列表数据
renderList();

// 在 UI 线程更新特定的任务状态
function updateTaskStatusUI(taskId: string, status: TaskRunStatus) {
    ui.run(() => {
        taskManager.updateTaskState(taskId, 0, status);
        (ui as any).taskList.adapter.notifyDataSetChanged();
    });
}

// 执行状态机引用（如果存在）
let currentEngine: StateMachineEngine | null = null;
let currentThread: any = null;

function stopCurrentThread() {
    if (currentEngine) {
        currentEngine.stop();
        currentEngine = null;
    }
    if (currentThread) {
        currentThread.interrupt();
        currentThread = null;
    }
}

// 点击整个列表项即可执行任务（避免使用 item_bind 带来的 View 复用导致事件叠加的 BUG）
(ui as any).taskList.on("item_click", function(item: any, i: number, itemView: any, listView: any) {
    if (item.status === TaskRunStatus.RUNNING) {
        toast('该任务正在运行中...');
        return;
    }
    // 起一个线程开始执单独的任务
    runSingleTask(item);
});

(ui as any).btnAutoAll.on("click", function() {
    toast('准备自动连跑所有未完成任务');
    const allTasks = taskManager.tasks;
    
    stopCurrentThread();
    currentThread = threads.start(() => {
        for (const task of allTasks) {
            if (task.status === TaskRunStatus.DONE) {
                continue; 
            }

            updateTaskStatusUI(task.id, TaskRunStatus.RUNNING);
            const StrategyClass = task.strategyClass;
            const strategy = new StrategyClass();
            const engine = new StateMachineEngine(strategy);
            currentEngine = engine;
            
            engine.start();
            
            updateTaskStatusUI(task.id, TaskRunStatus.DONE);
            currentEngine = null;
        }

        ui.run(() => {
            toastLog('所有队列任务执行完毕！');
        });
    });
});

function runSingleTask(task: TaskRecord) {
    stopCurrentThread();
    
    updateTaskStatusUI(task.id, TaskRunStatus.RUNNING);

    currentThread = threads.start(() => {
        const StrategyClass = task.strategyClass;
        const strategy = new StrategyClass();
        const engine = new StateMachineEngine(strategy);
        currentEngine = engine;

        engine.start(); 

        updateTaskStatusUI(task.id, TaskRunStatus.DONE);
        currentEngine = null;
    });
}

// 防止 UI 脚本运行完退出，UI 自动持有生命周期
