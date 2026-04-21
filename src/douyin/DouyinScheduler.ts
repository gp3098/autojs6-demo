import { BehaviorSubject, Subject } from 'rxjs';
import { scan, takeUntil } from 'rxjs/operators';
import { DouyinTaskDefinition, DOUYIN_TASKS, DOUYIN_UI_LEXICON } from './DouyinTaskData';
import { OcrService, OCREntry, OCRFindResult } from './OcrService';

export type DouyinPage = 'UNKNOWN' | 'TASK_HOME' | 'TASK_PANEL' | 'TASK_LIST' | 'AD_VIDEO';
export type DouyinOverlay =
  | 'NONE'
  | 'LOTTERY_MASK'
  | 'FLIP_CARD_MASK'
  | 'COUPON_MASK'
  | 'SIGN_IN_MASK'
  | 'SIGN_IN_REWARD_MASK'
  | 'GENERIC_POPUP'
  | 'AD_CONFIRM_MASK';
export type DouyinSubPage = 'NONE' | 'MAIN_HOME' | 'TASK_PANEL' | 'TASK_LIST' | 'AD_FULLSCREEN' | 'OTHER';

export interface DouyinState {
  page: DouyinPage;
  overlay: DouyinOverlay;
  subPage: DouyinSubPage;
  currentTaskId: string | null;
  finishedTaskRuns: { [taskId: string]: number };
  awaitingTaskReturn: boolean;
  busy: boolean;
  retryCount: number;
  lostCount: number;
  timestamp: number;
}

type DouyinAction =
  | { type: 'PAGE_DETECTED'; page: DouyinPage; overlay: DouyinOverlay; subPage: DouyinSubPage }
  | { type: 'TASK_STARTED'; taskId: string }
  | { type: 'TASK_FINISHED' }
  | { type: 'TASK_ABORT' }
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
  private overlayStuckCount = 0;
  private lastOverlay: DouyinOverlay = 'NONE';
  private homeEntryClickTs = 0;
  private taskListExpandHintUntil = 0;
  private adPageEnterTs = 0;
  private adLastBlindTapTs = 0;
  private adConfirmBlindTapTs = 0;
  private busyTaskStuckLoops = 0;
  private busyTaskId: string | null = null;

  constructor(private readonly taskDefinitions: DouyinTaskDefinition[] = DOUYIN_TASKS) {
    this.setupStateMachine();
    this.setupLogger();
  }

  public start() {
    toastLog('开始运行 [抖音商城] 数据化任务调度器');
    auto.waitFor();

    this.isDestroyed = false;
    while (!this.isDestroyed) {
      this.ocrService.beginTick();
      try {
        this.ensureAppLaunched();
        this.detectAndDispatchPage();
        this.handleGlobalPopups();
        this.handleTick();
      } finally {
        this.ocrService.endTick();
      }
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
        `[DouyinScheduler] page=${s.page} subPage=${s.subPage} overlay=${s.overlay} ` +
        `busy=${s.busy} currentTask=${s.currentTaskId || '-'} ` +
        `lost=${s.lostCount} retry=${s.retryCount} awaiting=${s.awaitingTaskReturn}`
      );
    });
  }

  private initialState(): DouyinState {
    return {
      page: 'UNKNOWN',
      overlay: 'NONE',
      subPage: 'NONE',
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
        return { ...state, page: action.page, overlay: action.overlay, subPage: action.subPage, timestamp: Date.now() };
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
      case 'TASK_ABORT':
        return {
          ...state,
          currentTaskId: null,
          busy: false,
          awaitingTaskReturn: false,
          timestamp: Date.now()
        };
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
    let subPage: DouyinSubPage = 'OTHER';
    let overlay: DouyinOverlay = 'NONE';

    const hasLotteryMask = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.lotteryMaskKeywords, { matchMode: 'all' });
    const hasFlipCardAction = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.flipCardActionKeywords);
    const hasFlipCardTitle = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.flipCardMaskTitleKeywords);
    const hasSignInMask = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.signInMaskKeywords);
    const hasSignInRewardMask = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.signInRewardMaskKeywords);
    const hasCouponMask = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.couponMaskKeywords, { matchMode: 'all' });
    const hasAdConfirmMask = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.adConfirmKeywords);
    const hasGenericPopup =
      text('以后再说').findOnce() != null ||
      text('取消').findOnce() != null ||
      this.ocrService.ocrContains(DOUYIN_UI_LEXICON.commonPopups);

    if (activity.indexOf(this.homeActivity) >= 0) {
      page = 'TASK_HOME';
      subPage = 'MAIN_HOME';
    } else if (activity.indexOf('BulletContainerActivity') >= 0) {
      const inExpandHintWindow = Date.now() < this.taskListExpandHintUntil;
      const hasAllTasksEntry = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.openAllTasks);
      const hasTaskListTitle = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.taskListMarker);
      const hasTaskListStructure = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.taskListStructuralKeywords);
      const hasTaskItems = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.taskListTaskKeywords);
      const isTaskListExpanded = inExpandHintWindow || ((hasTaskListStructure || hasTaskListTitle) && hasTaskItems && !hasAllTasksEntry);
      if (isTaskListExpanded) {
        page = 'TASK_LIST';
        subPage = 'TASK_LIST';
      } else {
        page = 'TASK_PANEL';
        subPage = 'TASK_PANEL';
      }
    } else if (activity.indexOf('ExcitingVideoActivity') >= 0) {
      page = 'AD_VIDEO';
      subPage = 'AD_FULLSCREEN';
    } else {
      page = 'UNKNOWN';
      subPage = 'OTHER';
    }

    if (hasLotteryMask) {
      overlay = 'LOTTERY_MASK';
    } else if (hasFlipCardAction && hasFlipCardTitle) {
      overlay = 'FLIP_CARD_MASK';
    } else if (hasCouponMask) {
      overlay = 'COUPON_MASK';
    } else if (hasSignInRewardMask) {
      overlay = 'SIGN_IN_REWARD_MASK';
    } else if (hasSignInMask && (page === 'TASK_HOME' || page === 'TASK_PANEL' || page === 'TASK_LIST')) {
      overlay = 'SIGN_IN_MASK';
    } else if (hasAdConfirmMask && page === 'AD_VIDEO') {
      overlay = 'AD_CONFIRM_MASK';
    } else if (hasGenericPopup) {
      overlay = 'GENERIC_POPUP';
    }

    this.dispatch({ type: 'PAGE_DETECTED', page, overlay, subPage });
  }

  private handleTick() {
    const state = this.state$.getValue();

    if (state.page !== 'AD_VIDEO') {
      this.adPageEnterTs = 0;
      this.adLastBlindTapTs = 0;
      this.adConfirmBlindTapTs = 0;
    }

    if (state.overlay !== 'NONE') {
      return;
    }

    if (state.awaitingTaskReturn && (state.page === 'TASK_PANEL' || state.page === 'TASK_LIST')) {
      this.dispatch({ type: 'TASK_FINISHED' });
      return;
    }

    switch (state.page) {
      case 'TASK_HOME':
        if (this.handleUnsupportedPage(state)) {
          return;
        }
        if (state.subPage === 'MAIN_HOME') {
          this.openEarnCoinFromHome();
        } else {
          this.dispatch({ type: 'INC_LOST' });
        }
        return;
      case 'TASK_PANEL':
        this.handleTaskPanel();
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
    const state = this.state$.getValue();
    const shouldHandleSignInMask =
      currentPage === 'TASK_HOME' || currentPage === 'TASK_PANEL' || currentPage === 'TASK_LIST';

    let handled = false;

    if (state.overlay === 'LOTTERY_MASK') {
      handled = this.handleLotteryMask();
    } else if (state.overlay === 'FLIP_CARD_MASK') {
      handled = this.handleFlipCardMask();
    } else if (state.overlay === 'COUPON_MASK') {
      handled = this.closeByOCRX();
    } else if (state.overlay === 'SIGN_IN_REWARD_MASK') {
      handled = this.closeByOCRX();
    } else if (state.overlay === 'AD_CONFIRM_MASK') {
      handled = this.handleAdConfirmDialog();
    }
    if (handled) {
      this.resetOverlayStuckCounter(state.overlay);
      return;
    }

    if (state.overlay === 'SIGN_IN_MASK' && shouldHandleSignInMask) {
      const signInBtn = textContains('立即签到').findOnce() || textContains('签到领金币').findOnce();
      if (signInBtn) {
        signInBtn.clickBounds(10, 10);
        sleep(500);
        this.resetOverlayStuckCounter(state.overlay);
        return;
      }

      const signMask = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.signInMaskKeywords);
      if (signMask) {
        click(signMask.entry.bounds.centerX(), signMask.entry.bounds.centerY());
        sleep(500);
        this.resetOverlayStuckCounter(state.overlay);
        return;
      }
    }

    if (state.overlay !== 'GENERIC_POPUP') {
      this.bumpOverlayStuckCounter(state.overlay);
      return;
    }

    const close = text('以后再说').findOnce() || text('取消').findOnce();
    if (close) {
      close.click();
      this.resetOverlayStuckCounter(state.overlay);
      return;
    }

    const popupOCR = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.commonPopups);
    if (popupOCR) {
      click(popupOCR.entry.bounds.centerX(), popupOCR.entry.bounds.centerY());
      this.resetOverlayStuckCounter(state.overlay);
      return;
    }

    this.bumpOverlayStuckCounter(state.overlay);
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
      return this.closeByOCRX();
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
    if (this.isInHomeEntryCooldown()) {
      return;
    }

    const earnCoinBtn = this.findHomeEarnCoinEntry();
    if (earnCoinBtn) {
      console.log(`[DouyinScheduler] 点击首页入口: label=${earnCoinBtn.entry.label}`);
      click(earnCoinBtn.entry.bounds.centerX(), earnCoinBtn.entry.bounds.centerY());
      this.homeEntryClickTs = Date.now();
      sleep(900);
      this.dispatch({ type: 'RESET_LOST' });
      return;
    }
    console.log('[DouyinScheduler] 首页未识别到"赚金币"入口，等待下一轮');
    this.dispatch({ type: 'INC_LOST' });
  }

  private openTaskList() {
    const taskListBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.openAllTasks);
    if (!taskListBtn) {
      this.dispatch({ type: 'INC_LOST' });
      console.log('[DouyinScheduler] 任务面板未找到"全部任务"按钮');
      return;
    }

    console.log(`[DouyinScheduler] 点击任务面板入口: label=${taskListBtn.entry.label}`);
    click(taskListBtn.entry.bounds.centerX(), taskListBtn.entry.bounds.centerY());
    this.taskListExpandHintUntil = Date.now() + 5000;
    sleep(800);
    this.dispatch({ type: 'RESET_LOST' });
  }

  private handleTaskPanel() {
    if (this.handleCollectGoldAction()) {
      return;
    }
    this.openTaskList();
  }

  private runTaskDispatcher(state: DouyinState) {
    this.dispatch({ type: 'RESET_LOST' });

    if (state.busy || state.currentTaskId) {
      const progressed = this.handleCurrentTaskPendingAction(state.currentTaskId);
      if (progressed) {
        this.busyTaskStuckLoops = 0;
        this.busyTaskId = state.currentTaskId;
        console.log(`[DouyinScheduler] busy任务推进成功 task=${state.currentTaskId || '-'}`);
        return;
      }

      if (this.busyTaskId === state.currentTaskId) {
        this.busyTaskStuckLoops += 1;
      } else {
        this.busyTaskId = state.currentTaskId;
        this.busyTaskStuckLoops = 1;
      }
      console.log(
        `[DouyinScheduler] busy任务未推进 task=${state.currentTaskId || '-'} loops=${this.busyTaskStuckLoops}`
      );
      if (this.busyTaskStuckLoops >= 10) {
        console.log('[DouyinScheduler] busy任务卡住超时，执行TASK_ABORT');
        this.busyTaskStuckLoops = 0;
        this.busyTaskId = null;
        this.dispatch({ type: 'TASK_ABORT' });
      }
      return;
    }
    this.busyTaskStuckLoops = 0;
    this.busyTaskId = null;

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
    if (this.isUnsupportedTaskEntry(target.entry.label)) {
      this.scrollTaskList();
      return;
    }
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
    const now = Date.now();
    if (!this.adPageEnterTs) {
      this.adPageEnterTs = now;
    }

    const state = this.state$.getValue();

    // AD_CONFIRM_MASK overlay handling happens globally now.
    // If it falls through here, it means we didn't classify it as an overlay.

    // FIXME: 暂时关闭盲点功能，改用截图，直到修正截图功能为止
    /*
    // 二次确认框在图片层时，常规 OCR/text 可能无法命中；awaiting=true 时优先走专用盲点。
    if (state.awaitingTaskReturn && this.tryTapAdConfirmBlindArea(now)) {
      return;
    }
    */

    if (this.handleAdUiButtonsWithoutOCR()) {
      return;
    }

    const hasTaskContext = !!state.currentTaskId;
    const adStayMs = now - this.adPageEnterTs;
    const firstBlindTapThreshold = hasTaskContext ? 32000 : 45000;
    const forceCloseWhilePlayingMs = hasTaskContext ? 65000 : 80000;

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
      const label = exitBtn.entry.label;
      const isTimer = (/\d+[sS]/.test(label) || /\d+秒/.test(label) || label.indexOf('后可领') >= 0);
      const isSuccess = /领取成|领取戌/.test(label);

      // 过滤掉纯倒计时的伪退出按钮（例如 "09s后可领奖励 X"）。但如果包含成功字眼则依然可以提前关闭
      if (!isTimer || isSuccess) {
        click(exitBtn.entry.bounds.centerX(), exitBtn.entry.bounds.centerY());
        sleep(800);
        this.dispatch({ type: 'SET_AWAITING_RETURN', value: true });
        this.dispatch({ type: 'RESET_LOST' });
        this.adLastBlindTapTs = now;
        return;
      } else {
        console.log('[DouyinScheduler] Ignore fake exit button with countdown:', label);
      }
    }

    // 以上有效按钮均未被检测到的情况下，检查是否处于正常的广告播放阶段。
    // （有的广告播放完依然会在界面滞留“广告”水印，通过将有效按钮排在首位，可避免该水印卡死流程）
    const isAdPlaying = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.adPlayingKeywords);
    if (isAdPlaying && adStayMs < forceCloseWhilePlayingMs) {
      return;
    }

    // 无任务上下文时，由于不再阻挡有效的关闭按钮识别，其余盲点功能视情况提前返回
    if (!hasTaskContext) {
      /*
      // FIXME: 暂时关闭盲点功能
      if (adStayMs >= firstBlindTapThreshold && now - this.adLastBlindTapTs > 15000) {
        console.log('[DouyinScheduler] 广告页长时间停留，执行盲点关闭兜底');
        this.tapTopRightCloseArea();
        this.adLastBlindTapTs = now;
        sleep(700);
      }
      */
      return;
    }

    // OCR/text 都无法识别按钮时，按时序尝试右上角关闭，不再走 fallback 误触返回。
    /*
    // FIXME: 暂时关闭盲点功能
    if (adStayMs >= firstBlindTapThreshold && now - this.adLastBlindTapTs > 15000) {
      console.log('[DouyinScheduler] 广告按钮未识别，执行盲点关闭');
      this.tapTopRightCloseArea();
      this.adLastBlindTapTs = now;
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: true });
      sleep(700);
      return;
    }
    */
  }

  private handleAdConfirmDialog(): boolean {
    console.log('handleAdConfirmDialog start');

    // 解析屏幕上的金币数量以决定策略
    let coinAmount = -1;
    const entries = this.ocrService.detectEntries(true);
    for (let i = 0; i < entries.length; i++) {
      const label = entries[i].label;
      // 过滤掉长文本和带有倒计时的伪数字
      if (label.length < 15 && !/\d+[sS]/.test(label) && !/\d+秒/.test(label) && /\d{2,}/.test(label)) {
        const nums = label.match(/\d+/g);
        if (nums) {
          nums.forEach(n => {
            const val = parseInt(n, 10);
            if (val > coinAmount && val <= 10000) {
              coinAmount = Math.max(coinAmount, val);
            }
          });
        }
      }
    }
    console.log(`[DouyinScheduler] 二次确认弹窗检测到当前收益数值评估: ${coinAmount}`);

    const shouldExit = coinAmount > 0 && coinAmount < 100;

    if (shouldExit) {
      console.log('[DouyinScheduler] 收益小于100，选择坚持退出');
      const exitBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.adConfirmExitKeywords);
      if (exitBtn) {
        click(exitBtn.entry.bounds.centerX(), exitBtn.entry.bounds.centerY());
        sleep(600);
        this.dispatch({ type: 'SET_AWAITING_RETURN', value: true });
        this.dispatch({ type: 'RESET_LOST' });
        return true;
      }
    }

    // 常规节点寻找继续观看
    const continueUi = textContains('继续观看').findOnce() || textContains('再看').findOnce() || textContains('继续领奖励').findOnce();
    if (continueUi) {
      continueUi.clickBounds(10, 10);
      sleep(600);
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: false });
      this.dispatch({ type: 'RESET_LOST' });
      return true;
    }

    if (!this.ocrService.ocrContains(DOUYIN_UI_LEXICON.adConfirmKeywords)) {
      return false;
    }

    const exactRewardBtn = this.ocrService.findByOCR(['继续领奖励', '继续領奖励'], { exactMatch: true });
    if (exactRewardBtn) {
      click(exactRewardBtn.entry.bounds.centerX(), exactRewardBtn.entry.bounds.centerY());
      sleep(600);
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: false });
      this.dispatch({ type: 'RESET_LOST' });
      return true;
    }

    // 针对继续观看做模糊匹配兜底，但强制过滤掉大于8个字符的长标题（如“再看一个视频继续领奖励”）防止误触标题。
    let fallbackBtn: import('./OcrService').OCREntry | null = null;
    const continueKeywords = DOUYIN_UI_LEXICON.adConfirmContinueKeywords;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.label.length >= 8) continue; // 判定为标题或长文案，跳过
        for (let j = 0; j < continueKeywords.length; j++) {
            if (entry.label.includes(continueKeywords[j])) {
                fallbackBtn = entry;
                break;
            }
        }
        if (fallbackBtn) break;
    }

    if (fallbackBtn) {
      click(fallbackBtn.bounds.centerX(), fallbackBtn.bounds.centerY());
      sleep(600);
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: false });
      this.dispatch({ type: 'RESET_LOST' });
      return true;
    }

    // 默认兜底防止卡死（如果应该拒绝但没找到退出按钮，或者根本没找到继续观看按钮）
    const exitFallback = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.adConfirmExitKeywords);
    if (exitFallback) {
      click(exitFallback.entry.bounds.centerX(), exitFallback.entry.bounds.centerY());
      sleep(600);
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: true });
      this.dispatch({ type: 'RESET_LOST' });
      return true;
    }

    return false;
  }

  private tryTapAdConfirmBlindArea(now: number): boolean {
    // FIXME: 暂时关闭盲点功能，改用截图，直到修正截图功能为止
    return false;
    /*
    if (now - this.adConfirmBlindTapTs < 3500) {
      return false;
    }
    // 用户提供的二次确认按钮区域: [925,960,1003,1038]
    const x = 964;
    const y = 999;
    click(x, y);
    this.adConfirmBlindTapTs = now;
    console.log('[DouyinScheduler] 二次确认弹窗盲点点击');
    sleep(500);
    this.dispatch({ type: 'SET_AWAITING_RETURN', value: false });
    return true;
    */
  }

  private handleAdUiButtonsWithoutOCR(): boolean {
    const rewardUi =
      textContains('领取成功').findOnce() ||
      textContains('领取奖励').findOnce() ||
      textContains('开心收下').findOnce() ||
      textContains('去提现').findOnce();
    if (rewardUi) {
      rewardUi.clickBounds(10, 10);
      sleep(700);
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: true });
      this.dispatch({ type: 'RESET_LOST' });
      return true;
    }

    const closeUi = textContains('关闭').findOnce() || textContains('跳过').findOnce();
    if (closeUi) {
      closeUi.clickBounds(10, 10);
      sleep(700);
      this.dispatch({ type: 'SET_AWAITING_RETURN', value: true });
      this.dispatch({ type: 'RESET_LOST' });
      return true;
    }

    return false;
  }

  private pickVisibleTask(
    finishedTaskRuns: { [taskId: string]: number }
  ): { task: DouyinTaskDefinition; target: OCRFindResult } | null {
    const entries = this.ocrService.detectEntries(true);
    const doneEntries: OCREntry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const label = entries[i].label;
      if (label.indexOf('已完成') >= 0 || label.indexOf('明天来') >= 0 || /\d{2}:\d{2}/.test(label)) {
        doneEntries.push(entries[i]);
      }
    }

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
        if (this.isTaskDoneByRow(target.entry, doneEntries)) {
          console.log(`[DouyinScheduler] 跳过已完成任务 entry=${target.entry.label}`);
          continue;
        }
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

  private handleCollectGoldAction(): boolean {
    const upgrading = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.upgradingKeywords);
    if (upgrading) {
      return false;
    }

    const collecting = this.ocrService.ocrContains(DOUYIN_UI_LEXICON.collectingKeywords);
    if (collecting) {
      return false;
    }

    const collectBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.collectGoldKeywords);
    if (!collectBtn) {
      return false;
    }

    click(collectBtn.entry.bounds.centerX(), collectBtn.entry.bounds.centerY());
    sleep(600);
    return true;
  }

  private isTaskDoneByRow(taskEntry: OCREntry, doneEntries: OCREntry[]): boolean {
    for (let i = 0; i < doneEntries.length; i++) {
      const done = doneEntries[i];
      const sameRow = Math.abs(done.bounds.centerY() - taskEntry.bounds.centerY()) < 90;
      const rightSide = done.bounds.centerX() > taskEntry.bounds.centerX() + 120;
      if (sameRow && rightSide) {
        return true;
      }
    }
    return false;
  }

  private handleCurrentTaskPendingAction(taskId: string | null): boolean {
    if (!taskId) {
      return false;
    }
    if (taskId === 'flip_card') {
      return this.tapFlipCardAdButton();
    }
    if (taskId === 'split_red_packet') {
      return this.tapByKeywords(['看视频拆开红包', '看视频拆红包', '拆开红包']);
    }
    if (taskId === 'watch_video') {
      return this.tapByKeywords(['看视频赚金币', '看广告视频']);
    }
    return false;
  }

  private handleFlipCardMask(): boolean {
    const clicked = this.tapFlipCardAdButton();
    if (clicked) {
      return true;
    }
    return this.closeByOCRX();
  }

  private tapFlipCardAdButton(): boolean {
    const btn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.flipCardActionKeywords);
    if (!btn) {
      return false;
    }
    click(btn.entry.bounds.centerX(), btn.entry.bounds.centerY());
    sleep(700);
    return true;
  }

  private tapByKeywords(keywords: string[]): boolean {
    const hit = this.ocrService.findByOCR(keywords);
    if (!hit) {
      return false;
    }

    const entries = this.ocrService.detectEntries(true);
    const lockedEntries: OCREntry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const label = entries[i].label;
      if (label.indexOf('已完成') >= 0 || label.indexOf('明天来') >= 0 || /\d{2}:\d{2}/.test(label)) {
        lockedEntries.push(entries[i]);
      }
    }

    if (this.isTaskDoneByRow(hit.entry, lockedEntries)) {
      console.log(`[DouyinScheduler] 发现任务处于冷却或锁定状态，拒绝点击 label=${hit.entry.label}`);
      return false;
    }

    click(hit.entry.bounds.centerX(), hit.entry.bounds.centerY());
    console.log(`[DouyinScheduler] 点击关键词按钮 label=${hit.entry.label} query=${hit.query}`);
    sleep(700);
    return true;
  }

  private isUnsupportedTaskEntry(label: string): boolean {
    const normalized = String(label || '').toLowerCase();
    const keywords = Array.isArray(DOUYIN_UI_LEXICON.unsupportedTaskKeywords)
      ? DOUYIN_UI_LEXICON.unsupportedTaskKeywords
      : [DOUYIN_UI_LEXICON.unsupportedTaskKeywords];
    for (let i = 0; i < keywords.length; i++) {
      const key = String(keywords[i] || '').trim().toLowerCase();
      if (key && normalized.indexOf(key) >= 0) {
        return true;
      }
    }
    return false;
  }

  private handleUnsupportedPage(state: DouyinState): boolean {
    // 仅在首页分支且不是 MAIN_HOME 时，才做“未适配页面”回退，避免在任务列表误判。
    if (state.page !== 'TASK_HOME' || state.subPage === 'MAIN_HOME') {
      return false;
    }
    if (!this.ocrService.ocrContains(DOUYIN_UI_LEXICON.unsupportedPageKeywords)) {
      return false;
    }
    console.log('[DouyinScheduler] 检测到未适配页面关键词，执行返回');
    back();
    sleep(700);
    return true;
  }

  private isInHomeEntryCooldown(): boolean {
    if (this.homeEntryClickTs <= 0) {
      return false;
    }
    return Date.now() - this.homeEntryClickTs < 4000;
  }

  private findHomeEarnCoinEntry(): OCRFindResult | null {
    const entries = this.ocrService.detectEntries(true);
    if (!entries.length) {
      return null;
    }

    const h = Number((device as any)?.height || 0);
    const lowerBoundY = h > 0 ? h * 0.4 : 0;

    let best: OCREntry | null = null;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!this.isHomeEarnCoinLabel(entry.label)) {
        continue;
      }
      if (lowerBoundY > 0 && entry.bounds.centerY() < lowerBoundY && best) {
        continue;
      }
      if (!best || entry.bounds.centerY() > best.bounds.centerY()) {
        best = entry;
      }
    }

    if (!best) {
      return null;
    }

    return { query: '赚金币', entry: best };
  }

  private isHomeEarnCoinLabel(label: string): boolean {
    const text = String(label || '').replace(/\s/g, '');
    if (text.indexOf('赚金币') < 0) {
      return false;
    }
    if (text.indexOf('频道') >= 0 || text.indexOf('任务列表') >= 0 || text.indexOf('逛精选') >= 0) {
      return false;
    }
    return text.length <= 12;
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

  private closeByOCRX(): boolean {
    const closeBtn = this.ocrService.findByOCR(DOUYIN_UI_LEXICON.closeKeywords);
    if (closeBtn) {
      click(closeBtn.entry.bounds.centerX(), closeBtn.entry.bounds.centerY());
      sleep(500);
      return true;
    }
    return this.tapTopRightCloseArea();
  }

  private tapTopRightCloseArea(): boolean {
    // FIXME: 暂时关闭盲点功能，改用截图，直到修正截图功能为止
    return false;
    /*
    const w = Number((device as any)?.width || 0);
    const h = Number((device as any)?.height || 0);
    if (!w || !h) {
      return false;
    }
    const x = Math.floor(w * 0.93);
    const y = Math.floor(h * 0.08);
    click(x, y);
    sleep(350);
    return true;
    */
  }

  private resetOverlayStuckCounter(currentOverlay: DouyinOverlay) {
    this.lastOverlay = currentOverlay;
    this.overlayStuckCount = 0;
  }

  private bumpOverlayStuckCounter(currentOverlay: DouyinOverlay) {
    if (currentOverlay === 'NONE') {
      this.overlayStuckCount = 0;
      this.lastOverlay = 'NONE';
      return;
    }

    if (this.lastOverlay === currentOverlay) {
      this.overlayStuckCount += 1;
    } else {
      this.lastOverlay = currentOverlay;
      this.overlayStuckCount = 1;
    }

    if (this.overlayStuckCount >= 5) {
      this.closeByOCRX();
    }

    if (this.overlayStuckCount >= 10) {
      back();
      sleep(600);
      this.overlayStuckCount = 0;
    }
  }
}
