export enum GlobalState {
  INIT = "INIT",
  APP_LAUNCHING = "APP_LAUNCHING",
  WELFARE_PAGE = "WELFARE_PAGE",
  SUBTASK_AD = "SUBTASK_AD",
  FALLBACK = "FALLBACK",
  FINISHED = "FINISHED",
}

export enum AdState {
  IDLE = "IDLE",
  WATCHING_AD = "WATCHING_AD",
  WAITING_FOR_REWARD = "WAITING_FOR_REWARD",
  DONE = "DONE",
}

export enum TaskRunStatus {
  IDLE = "未开始",
  RUNNING = "获取中",
  DONE = "已完成",
  ERROR = "异常中断",
}
