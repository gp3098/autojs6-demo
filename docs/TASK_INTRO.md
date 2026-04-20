# 任务介绍

## 抖音商城任务

### 任务界面信息
PackageName: com.ss.android.ugc.livelite
Activity: com.ss.android.ugc.aweme.bullet.ui.BulletContainerActivity

#### 界面元素
默认使用ocr识别,括号内包含了点开后的唯一识别信息
- 任务界面：fullId="com.ss.android.ugc.livelite:id/7y"
    - 收金币
    - 收集中
    - 全部任务：(做任务赚金币)
        - 每日签到(连续签到)
            -  立即签到(金币到账)
                - 看广告视频再得
                - X(关闭)
        - 翻卡片领金币
        - 天天拆红包
            - 看视频拆红包
            - 最高得
            - 看视频拆开红包(点开后进入"看视频任务"界面)
            - 今日第N个红包(N为数字)
        - 看视频赚金币
        - X

如何确认当前在任务页面?
当前Activity包含任务列表的id

如何打开某个任务？
截图并使用ocr找到“全部任务”按钮，然后点击

如何确认打开了“全部任务”界面？
当前界面ocr包含“做任务赚金币”字样

### 看视频任务
PackageName: com.ss.android.ugc.livelite
Activity: com.ss.android.excitingvideo.ExcitingVideoActivity

#### 界面元素
- 视频播放区域
    - 广告
    - 反馈
    - 领取成功
    - X
    - 进直播间领券
    - 直播间观看时长计入奖励时长

```javascript
const { Subject, BehaviorSubject, interval } = rxjs;
const { scan, distinctUntilChanged, tap, filter } = rxjs.operators;

class AutoTaskEngine {

  constructor() {
    this.action$ = new Subject();
    this.state$ = new BehaviorSubject(this.initialState());

    this.initStateMachine();
    this.initSensors();
    this.initEffects();
  }

  initialState() {
    return {
      page: 'UNKNOWN',
      subPage: null,
      currentTask: null,
      busy: false,
      retryCount: 0,
      timestamp: Date.now()
    };
  }

  dispatch(action) {
    this.action$.next(action);
  }

  // =========================
  // 状态机核心
  // =========================
  initStateMachine() {
    this.action$
      .pipe(
        scan((state, action) => this.reducer(state, action), this.initialState())
      )
      .subscribe(this.state$);
  }

  reducer(state, action) {
    switch (action.type) {

      case 'PAGE_DETECTED':
        return { ...state, page: action.page };

      case 'ENTER_TASK_LIST':
        return { ...state, page: 'TASK_LIST' };

      case 'TASK_SELECTED':
        return { ...state, currentTask: action.task, busy: true };

      case 'AD_STARTED':
        return { ...state, page: 'AD_VIDEO', busy: true };

      case 'REWARD_RECEIVED':
        return { ...state, busy: false };

      case 'AD_FINISHED':
        return { ...state, page: 'TASK_LIST', currentTask: null, busy: false };

      case 'ERROR':
        return { ...state, retryCount: state.retryCount + 1, busy: false };

      default:
        return state;
    }
  }

  // =========================
  // 感知层（OCR + Activity）
  // =========================
  initSensors() {
    interval(1000).subscribe(() => {
      const page = this.detectPage();
      this.dispatch({ type: 'PAGE_DETECTED', page });
    });
  }

  detectPage() {
    const activity = currentActivity();

    if (activity.includes("BulletContainerActivity")) {
      if (this.ocrContains("做任务赚金币")) return "TASK_LIST";
      return "TASK_HOME";
    }

    if (activity.includes("ExcitingVideoActivity")) {
      return "AD_VIDEO";
    }

    return "UNKNOWN";
  }

  ocrContains(text) {
    // TODO: 接入你的 OCR
    return false;
  }

  // =========================
  // 副作用层（自动操作）
  // =========================
  initEffects() {

    this.state$
      .pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(state => this.handleState(state))
      )
      .subscribe();
  }

  handleState(state) {

    if (state.busy) return;

    switch (state.page) {

      case 'TASK_HOME':
        this.openTaskList();
        break;

      case 'TASK_LIST':
        this.selectTask();
        break;

      case 'AD_VIDEO':
        this.handleAd();
        break;
    }
  }

  // =========================
  // 行为实现
  // =========================

  openTaskList() {
    const btn = this.findByOCR("全部任务");
    if (btn) {
      click(btn);
      this.dispatch({ type: 'ENTER_TASK_LIST' });
    }
  }

  selectTask() {
    const btn = this.findByOCR("看视频拆开红包");
    if (btn) {
      click(btn);
      this.dispatch({ type: 'TASK_SELECTED', task: 'RED_PACKET' });
    }
  }

  handleAd() {

    if (this.ocrContains("领取成功")) {
      const close = this.findByOCR("X");
      if (close) {
        click(close);
        this.dispatch({ type: 'AD_FINISHED' });
      }
    }
  }

  findByOCR(text) {
    // TODO: OCR返回坐标
    return null;
  }

}
```

```javascript
const TaskType = {
  SIGN: 'SIGN',
  RED_PACKET: 'RED_PACKET',
  VIDEO: 'VIDEO'
};

class Task {
  constructor(config) {
    this.type = config.type;
    this.priority = config.priority;
    this.cooldown = config.cooldown;
    this.maxRuns = config.maxRuns;
    this.reward = config.reward;

    this.lastRun = 0;
    this.runCount = 0;
    this.available = false;
  }

  canRun(now) {
    if (this.maxRuns && this.runCount >= this.maxRuns) return false;
    if (now - this.lastRun < this.cooldown) return false;
    if (!this.available) return false;
    return true;
  }
}
```

```javascript
class TaskScheduler {

  constructor() {
    this.tasks = [];
  }

  register(task) {
    this.tasks.push(task);
  }

  updateAvailability(type, available) {
    const task = this.tasks.find(t => t.type === type);
    if (task) task.available = available;
  }

  markExecuted(type) {
    const task = this.tasks.find(t => t.type === type);
    if (task) {
      task.lastRun = Date.now();
      task.runCount++;
    }
  }

  getNextTask() {
    const now = Date.now();

    const candidates = this.tasks.filter(t => t.canRun(now));

    if (candidates.length === 0) return null;

    // 核心策略：优先级 + 收益
    candidates.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.reward - a.reward;
    });

    return candidates[0];
  }
}
```

1️⃣ 在 state 中加入调度信息
{
  currentTask: null,
  taskQueue: [],
  schedulerState: {}
}
2️⃣ 引入“调度 action”
const ActionTypes = {
  SCHEDULE: 'SCHEDULE',
  TASK_START: 'TASK_START',
  TASK_FINISH: 'TASK_FINISH'
};
3️⃣ scan 中加入调度逻辑
case 'SCHEDULE':
  return {
    ...state,
    currentTask: action.task
  };

case 'TASK_FINISH':
  return {
    ...state,
    currentTask: null
  };
五、调度触发时机（非常重要）

不是一直调度，而是：

👉 在“空闲 + 在任务页”时调度

this.state$
  .pipe(
    filter(state => 
      state.page === 'TASK_LIST' &&
      !state.currentTask &&
      !state.busy
    )
  )
  .subscribe(() => {
    const task = this.scheduler.getNextTask();
    if (task) {
      this.dispatch({ type: 'SCHEDULE', task });
    }
  });
六、任务执行（真正开始干活）
handleState(state) {

  if (state.currentTask) {
    this.executeTask(state.currentTask);
    return;
  }

  // fallback逻辑
}
任务执行分发
executeTask(task) {

  switch (task.type) {

    case 'SIGN':
      this.doSign();
      break;

    case 'RED_PACKET':
      this.openRedPacket();
      break;

    case 'VIDEO':
      this.watchVideo();
      break;
  }
}
七、OCR → 更新任务可用性（关键）

👉 调度器的“眼睛”

detectTasksByOCR() {

  this.scheduler.updateAvailability(
    'SIGN',
    this.ocrContains("立即签到")
  );

  this.scheduler.updateAvailability(
    'RED_PACKET',
    this.ocrContains("看视频拆开红包")
  );

  this.scheduler.updateAvailability(
    'VIDEO',
    this.ocrContains("看视频赚金币")
  );
}

这个要放在你的 sensor 里面周期执行。

八、任务完成后必须做的事
onTaskFinished(taskType) {

  this.scheduler.markExecuted(taskType);

  this.dispatch({
    type: 'TASK_FINISH'
  });
}
九、调度策略进阶（这是精华）

基础是 priority + reward，但你可以升级：

✅ 策略1：收益效率（推荐）
reward / timeCost
✅ 策略2：动态权重
score =
  priority * 10 +
  reward * 0.1 -
  runCount * 2
✅ 策略3：防刷机制（很重要）

避免一直刷红包：

if (task.type === 'RED_PACKET' && task.runCount > 10) {
  降权
}
✅ 策略4：兜底任务
if (没有任务可做) {
  执行 VIDEO（无限任务）
}
十、最终系统结构
AutoTaskEngine
 ├── RxJS 状态机（scan）
 ├── TaskScheduler（调度器）
 ├── OCR 感知
 ├── 执行器（click/back）