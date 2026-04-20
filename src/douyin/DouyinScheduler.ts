import { BehaviorSubject, Subject } from 'rxjs';
import { scan, takeUntil } from 'rxjs/operators';
import { DouyinTaskDefinition, DOUYIN_TASKS, DOUYIN_UI_LEXICON } from './DouyinTaskData';
import { OcrService, OCRFindResult } from './OcrService';

export type DouyinPage = 'UNKNOWN' | 'TASK_HOME' | 'TASK_LIST' | 'AD_VIDEO';

export interface DouyinState {
  page: DouyinPage;
  currentTaskId: string | null;
  finishedTaskRuns: { [taskId: string]: number };
  awaitingTaskReturn: boolean;
  busy: boolean;
  retryCount: number;
  lostCount: number;
  timestamp: number;
}

type DouyinAction =
  | { type: 'PAGE_DETECTED'; page: DouyinPage }
  | { type: 'TASK_STARTED'; taskId: string }
  | { type: 'TASK_FINISHED' }
  | { type: 'SET_AWAITING_RETURN'; value: boolean }
  | { type: 'SET_BUSY'; value: boolean }
  | { type: 'INC_RETRY' }
  | { type: 'INC_LOST' }
  | { type: 'RESET_LOST' };

export class DouyinScheduler {
  private readonly appPackage = 'com.ss.android.ugc.livelite';
  private readonly appName = '抖音商城';
  private readonly homeActivity = 'com.ss.android.ugc.aweme.main.MainActivity';
  private readonly action$ = new Subject<DouyinAction>();
  private readonly state$ = new BehaviorSubject<DouyinState>(this.initialState());
  private readonly destroy$ = new Subject<void>();
  private readonly ocrService = new OcrService();
  private isDestroyed = false;

  constructor(private readonly taskDefinitions: DouyinTaskDefinition[] = DOUYIN_TASKS) {
    this.setupStateMachine();
    this.setupLogger();
  }

  public start() {
    toastLog('开始运行 [抖音商城] 数据化任务调度器');
    auto.waitFor();

    this.isDestroyed = false;
    while (!this.isDestroyed) {
      this.ensureAppLaunched();
      this.detectAndDispatchPage();
      this.handleGlobalPopups();
      this.handleTick();
      sleep(1500);
    }
  }

  public stop() {
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  public ocrContains(query: string | string[]) {
    return this.ocrService.ocrContains(query);
  }

  public findByOCR(query: string | string[]) {
    return this.ocrService.findByOCR(query);
  }

  private setupStateMachine() {
    this.action$
      .pipe(
        scan((state, action) => this.reducer(state, action), this.initialState()),
        takeUntil(this.destroy$)
      )
      .subscribe(this.state$);
  }

  private setupLogger() {
    this.state$.pipe(takeUntil(this.destroy$)).subscribe(s => {
      console.log(
        `[DouyinScheduler] page=${s.page} busy=${s.busy} currentTask=${s.currentTaskId || '-'} ` +
          `lost=${s.lostCount} retry=${s.retryCount} awaiting=${s.awaitingTaskReturn}`
      );
    });
  }

  private initialState(): DouyinState {
    return {
      page: 'UNKNOWN',
      currentTaskId: null,
      finishedTaskRuns: {},
      awaitingTaskReturn: false,
      busy: false,
      retryCount: 0,
      lostCount: 0,
      timestamp: Date.now()
    };
  }

  private dispatch(action: DouyinAction) {
    this.action$.next(action);
  }

  private reducer(state: DouyinState, action: DouyinAction): DouyinState {
    switch (action.type) {
      case 'PAGE_DETECTED':
        return { ...state, page: action.page, timestamp: Date.now() };
      case 'TASK_STARTED':
        return {
          ...state,
          currentTaskId: action.taskId,
          busy: true,
          awaitingTaskReturn: false,
          lostCount: 0,
          timestamp: Date.now()
        };
      case 'TASK_FINISHED': {
        const currentTaskId = state.currentTaskId;
        if (!currentTaskId) {
          return { ...state, busy: false, awaitingTaskReturn: false, timestamp: Date.now() };
        }
        const prev = state.finishedTaskRuns[currentTaskId] || 0;
        return {
          ...state,
          finishedTaskRuns: {
            ...state.finishedTaskRuns,
            [currentTaskId]: prev + 1
          },
          currentTaskId: null,
          busy: false,
          awaitingTaskReturn: false,
          lostCount: 0,
          timestamp: Date.now()
        };
      }
      case 'SET_AWAITING_RETURN':
        return { ...state, awaitingTaskReturn: action.value, timestamp: Date.now() };
      case 'SET_BUSY':
        return { ...state, busy: action.value, timestamp: Date.now() };
      case 'INC_RETRY':
        return { ...state, retryCount: state.retryCount + 1, timestamp: Date.now() };
      case 'INC_LOST':
        return { ...state, lostCount: state.lostCount + 1, timestamp: Date.now() };
      case 'RESET_LOST':
        return { ...state, lostCount: 0, timestamp: Date.now() };
      default:
        return state;
    }
  }

  private detectAndDispatchPage() {
    const activity = String(currentActivity() || '');

    let page: DouyinPage = 'UNKNOWN';
    const hasLotteryMask = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.lotteryMaskKeywords, { matchMode: 'all' });

    if (activity.indexOf(this.homeActivity) >= 0) {
      page = 'TASK_HOME';
    } else if (activity.indexOf('BulletContainerActivity') >= 0) {
      // 任务列表上方的遮罩层会盖住“做任务赚金币”文本，这里视为 TASK_LIST 以便优先清遮罩
      if (hasLotteryMask || this.ocrService.ocrContains(DOUYIN_UI_LEXICON.taskListMarker)) {
        page = 'TASK_LIST';
      } else {
        page = 'TASK_HOME';
      }
    } else if (activity.indexOf('ExcitingVideoActivity') >= 0) {
      page = 'AD_VIDEO';
    }

    this.dispatch({ type: 'PAGE_DETECTED', page });
  }

  private handleTick() {
    const state = this.state$.getValue();

    if (state.awaitingTaskReturn && state.page === 'TASK_LIST') {
      this.dispatch({ type: 'TASK_FINISHED' });
      return;
    }

    switch (state.page) {
      case 'TASK_HOME':
        this.openEarnCoinFromHome();
        return;
      case 'TASK_LIST':
        this.runTaskDispatcher(state);
        return;
      case 'AD_VIDEO':
        this.handleAdPage();
        return;
      case 'UNKNOWN':
      default:
        this.dispatch({ type: 'INC_LOST' });
        this.tryFallbackIfNeeded();
        return;
    }
  }

  private handleGlobalPopups() {
    const currentPage = this.state$.getValue().page;
    const shouldHandleSignInMask = currentPage === 'TASK_HOME' || currentPage === 'TASK_LIST';

    if (this.handleLotteryMask()) {
      return;
    }

    if (shouldHandleSignInMask) {
      const signInBtn = textContains('立即签到').findOnce() || textContains('签到领金币').findOnce();
      if (signInBtn) {
        signInBtn.clickBounds(10, 10);
        sleep(500);
        return;
      }

      const signMask = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.signInMaskKeywords);
      if (signMask) {
        click(signMask.entry.bounds.centerX(), signMask.entry.bounds.centerY());
        sleep(500);
        return;
      }
    }

    const close = text('以后再说').findOnce() || text('取消').findOnce();
    if (close) {
      close.click();
      return;
    }

    const popupOCR = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.commonPopups);
    if (popupOCR) {
      click(popupOCR.entry.bounds.centerX(), popupOCR.entry.bounds.centerY());
    }
  }

  private handleLotteryMask(): boolean {
    if (String(currentPackage() || '') !== this.appPackage) {
      return false;
    }

    const hasLotteryMask = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.lotteryMaskKeywords, { matchMode: 'all' });
    if (!hasLotteryMask) {
      return false;
    }

    const isBusy = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.lotteryBusyKeywords);
    if (isBusy) {
      const closeBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.closeKeywords);
      if (closeBtn) {
        click(closeBtn.entry.bounds.centerX(), closeBtn.entry.bounds.centerY());
        sleep(500);
        return true;
      }
    }

    const drawBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.lotteryDrawKeywords);
    if (drawBtn) {
      click(drawBtn.entry.bounds.centerX(), drawBtn.entry.bounds.centerY());
      sleep(500);
      return true;
    }

    const closeFallback = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.closeKeywords);
    if (closeFallback) {
      click(closeFallback.entry.bounds.centerX(), closeFallback.entry.bounds.centerY());
      sleep(500);
      return true;
    }

    return false;
  }

  private openEarnCoinFromHome() {
    const earnCoinBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.earnCoinEntry);
    if (earnCoinBtn) {
      click(earnCoinBtn.entry.bounds.centerX(), earnCoinBtn.entry.bounds.centerY());
      sleep(900);
      this.dispatch({ type: 'RESET_LOST' });
      return;
    }
    this.openTaskList();
  }

  private openTaskList() {
    const taskListBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.openAllTasks);
    if (!taskListBtn) {
      this.dispatch({ type: 'INC_LOST' });
      this.tryFallbackIfNeeded();
      return;
    }

    click(taskListBtn.entry.bounds.centerX(), taskListBtn.entry.bounds.centerY());
    sleep(800);
    this.dispatch({ type: 'RESET_LOST' });
  }

  private runTaskDispatcher(state: DouyinState) {
    this.dispatch({ type: 'RESET_LOST' });

    if (state.busy || state.currentTaskId) {
      return;
    }

    const next = this.pickVisibleTask(state.finishedTaskRuns);
    if (!next) {
      if (!this.hasPendingTasks(state.finishedTaskRuns)) {
        toastLog('抖音商城任务已全部执行完毕');
        this.stop();
        return;
      }

      this.dispatch({ type: 'INC_LOST' });
      this.scrollTaskList();
      this.tryFallbackIfNeeded();
      return;
    }

    const { task: nextTask, target } = next;
    click(target.entry.bounds.centerX(), target.entry.bounds.centerY());
    sleep(900);

    if (nextTask.actionType === 'CLICK_ONLY') {
      this.dispatch({ type: 'TASK_STARTED', taskId: nextTask.id });
      this.dispatch({ type: 'TASK_FINISHED' });
      return;
    }

    this.dispatch({ type: 'TASK_STARTED', taskId: nextTask.id });
  }

  private handleAdPage() {
    const state = this.state$.getValue();
    const currentTask = this.getTaskById(state.currentTaskId);
    if (currentTask) {
      const taskDone = this.ocrService.findByOCR(currentTask.completionKeywords);
      if (taskDone) {
        click(taskDone.entry.bounds.centerX(), taskDone.entry.bounds.centerY());
        sleep(600);
        this.dispatch({ type: 'SET_AWAITING_RETURN', value: true });
        this.dispatch({ type: 'RESET_LOST' });
        return;
      }
    }

    const continueBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.adContinueButtons);
    if (continueBtn) {
      click(continueBtn.entry.bounds.centerX(), continueBtn.entry.bounds.centerY());
      sleep(600);
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: false });
      this.dispatch({ type: 'RESET_LOST' });
      return;
    }

    const exitBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.adExitButtons);
    if (exitBtn) {
      click(exitBtn.entry.bounds.centerX(), exitBtn.entry.bounds.centerY());
      sleep(800);
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: true });
      this.dispatch({ type: 'RESET_LOST' });
      return;
    }

    this.dispatch({ type: 'INC_LOST' });
    this.tryFallbackIfNeeded();
  }

  private pickVisibleTask(
    finishedTaskRuns: { [taskId: string]: number }
  ): { task: DouyinTaskDefinition; target: OCRFindResult } | null {
    const enabledTasks = this.taskDefinitions
      .filter(task => task.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (let i = 0; i < enabledTasks.length; i++) {
      const task = enabledTasks[i];
      const finishedRuns = finishedTaskRuns[task.id] || 0;
      if (finishedRuns >= task.maxRuns) {
        continue;
      }
      const target = this.ocrService.findByOCR(task.entryKeywords);
      if (target) {
        return { task, target };
      }
    }

    return null;
  }

  private hasPendingTasks(finishedTaskRuns: { [taskId: string]: number }): boolean {
    for (let i = 0; i < this.taskDefinitions.length; i++) {
      const task = this.taskDefinitions[i];
      if (!task.enabled) {
        continue;
      }
      const finishedRuns = finishedTaskRuns[task.id] || 0;
      if (finishedRuns < task.maxRuns) {
        return true;
      }
    }
    return false;
  }

  private getTaskById(taskId: string | null): DouyinTaskDefinition | null {
    if (!taskId) {
      return null;
    }
    for (let i = 0; i < this.taskDefinitions.length; i++) {
      if (this.taskDefinitions[i].id === taskId) {
        return this.taskDefinitions[i];
      }
    }
    return null;
  }

  private scrollTaskList() {
    swipe(600, 1650, 600, 650, 300);
    sleep(500);
  }

  private ensureAppLaunched() {
    const pkg = String(currentPackage() || '');
    if (pkg === this.appPackage) {
      return;
    }

    toastLog(`正在启动 ${this.appName}`);
    launchApp(this.appName);
    sleep(2000);
  }

  private tryFallbackIfNeeded() {
    const state = this.state$.getValue();
    if (state.lostCount < 10) {
      return;
    }

    this.dispatch({ type: 'INC_RETRY' });
    back();
    sleep(800);
    this.dispatch({ type: 'RESET_LOST' });
    this.dispatch({ type: 'SET_BUSY', value: false });
    this.dispatch({ type: 'SET_AWAITING_RETURN', value: false });
  }
}
