import { BehaviorSubject, Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { GlobalState, AdState } from "./Enums";
import { IAppTaskStrategy } from "./IAppTaskStrategy";

export class StateMachineEngine {
  public globalState$ = new BehaviorSubject<GlobalState>(GlobalState.INIT);
  public adState$ = new BehaviorSubject<AdState>(AdState.IDLE);
  private destroy$ = new Subject<void>();
  private isDestroyed = false;
  private lostCount = 0;

  constructor(private strategy: IAppTaskStrategy) {
    this.setupStateMachine();
  }

  public start() {
    if (this.strategy.runWithCustomEngine) {
      this.strategy.runWithCustomEngine();
      return;
    }

    toastLog(`开始运行 [${this.strategy.appName}]`);
    auto.waitFor();
    this.globalState$.next(GlobalState.APP_LAUNCHING);
    this.isDestroyed = false;

    // AutoJs Rhino 原生阻塞轮询
    while (!this.isDestroyed) {
      this.pollUIAndTransition();
      sleep(1500);
    }
  }

  public stop() {
    if (this.strategy.stopCustomEngine) {
      this.strategy.stopCustomEngine();
    }
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  private pollUIAndTransition() {
    try {
      const state = this.globalState$.getValue();

      // 全局弹窗由策略层处理
      if (this.strategy.handleGlobalPopups()) {
        return;
      }

      switch (state) {
        case GlobalState.APP_LAUNCHING:
          this.handleAppLaunching();
          break;
        case GlobalState.WELFARE_PAGE:
          this.handleWelfarePage();
          break;
        case GlobalState.SUBTASK_AD:
          this.pollAdSubTask();
          break;
        case GlobalState.FALLBACK:
          this.handleFallback();
          break;
        case GlobalState.FINISHED:
          this.stop();
          break;
      }
    } catch (error) {
      console.error("Error in pollUIAndTransition", error);
    }
  }

  private handleAppLaunching() {
    const success = this.strategy.handleAppLaunching();
    if (success) {
      this.globalState$.next(GlobalState.WELFARE_PAGE);
      this.lostCount = 0;
    } else {
      this.lostCount++;
      if (this.lostCount > 10) {
        log("启动页检测超时，尝试脱困回退");
        this.globalState$.next(GlobalState.FALLBACK);
      }
    }
  }

  private handleWelfarePage() {
    const res = this.strategy.handleWelfarePage();
    if (res === "TRIGGER_AD") {
      this.globalState$.next(GlobalState.SUBTASK_AD);
      this.adState$.next(AdState.WATCHING_AD);
      this.lostCount = 0;
    } else if (res === "FINISHED") {
      this.globalState$.next(GlobalState.FINISHED);
    } else {
      // WAITING - 没有找到任务，累加丢失次数
      this.lostCount++;
      if (this.lostCount > 10) {
        log("福利页连续检测不到任务图标，强制脱困");
        this.globalState$.next(GlobalState.FALLBACK);
      }
    }
  }

  private pollAdSubTask() {
    const s = this.adState$.getValue();
    const res = this.strategy.pollAdSubTask(s);

    // 策略请求强制脱困
    if (res.requestFallback) {
      log("广告子状态机请求 Fallback");
      this.globalState$.next(GlobalState.FALLBACK);
      this.adState$.next(AdState.IDLE);
      this.lostCount = 0;
      return;
    }

    if (res.nextState) {
      this.adState$.next(res.nextState);
      this.lostCount = 0;

      if (res.nextState === AdState.DONE) {
        this.globalState$.next(GlobalState.WELFARE_PAGE);
        this.adState$.next(AdState.IDLE);
      }
    } else {
      this.lostCount++;
      if (this.lostCount > 60) {
        log("看广告轮询卡死，触发脱困");
        this.globalState$.next(GlobalState.FALLBACK);
        this.adState$.next(AdState.IDLE);
        this.lostCount = 0;
      }
    }
  }

  private handleFallback() {
    toastLog(`[${this.strategy.appName}] 进入 Fallback，尝试返回操作...`);
    const backBtnApp = id("com.phoenix.read:id/dam").findOnce();
    if (backBtnApp) {
      backBtnApp.click();
    } else {
      back();
    }

    this.lostCount = 0;
    this.globalState$.next(GlobalState.APP_LAUNCHING);
  }

  private setupStateMachine() {
    this.globalState$.pipe(takeUntil(this.destroy$)).subscribe((s) => {
      console.log(`[${this.strategy.appName}] GlobalState => ${s}`);
    });
    this.adState$.pipe(takeUntil(this.destroy$)).subscribe((s) => {
      if (s !== AdState.IDLE) {
        console.log(`[${this.strategy.appName}] AdState => ${s}`);
      }
    });
  }
}
