import { OCRQuery } from "./OcrService";

export type DouyinTaskActionType = "CLICK_ONLY" | "WATCH_AD";

export interface DouyinTaskDefinition {
  id: string;
  title: string;
  actionType: DouyinTaskActionType;
  entryKeywords: string[];
  completionKeywords: string[];
  maxRuns: number;
  priority: number;
  enabled: boolean;
}

export interface DouyinUiLexicon {
  earnCoinEntry: OCRQuery;
  taskPanelMarker: OCRQuery;
  openAllTasks: OCRQuery;
  taskListMarker: OCRQuery;
  taskListStructuralKeywords: OCRQuery;
  taskListTaskKeywords: OCRQuery;
  dailyCouponsMaskKeywords: OCRQuery;
  adExitButtons: OCRQuery;
  adContinueButtons: OCRQuery;
  signInMaskKeywords: OCRQuery;
  lotteryMaskKeywords: OCRQuery;
  lotteryDrawKeywords: OCRQuery;
  lotteryBusyKeywords: OCRQuery;
  closeKeywords: OCRQuery;
  couponMaskKeywords: OCRQuery;
  signInRewardMaskKeywords: OCRQuery;
  collectGoldKeywords: OCRQuery;
  collectingKeywords: OCRQuery;
  upgradingKeywords: OCRQuery;
  doneKeywords: OCRQuery;
  unsupportedTaskKeywords: OCRQuery;
  unsupportedPageKeywords: OCRQuery;
  flipCardMaskTitleKeywords: OCRQuery;
  flipCardActionKeywords: OCRQuery;
  adPlayingKeywords: OCRQuery;
  adConfirmKeywords: OCRQuery;
  adConfirmContinueKeywords: OCRQuery;
  adConfirmExitKeywords: OCRQuery;
  commonPopups: OCRQuery;
  luckyStrikeExclusiveBoundsKeywords: OCRQuery;
  luckyBoundsDrawKeywords: OCRQuery;
}

export const DOUYIN_UI_LEXICON: DouyinUiLexicon = {
  earnCoinEntry: ["赚金币"],
  taskPanelMarker: ["全部任务", "收金币", "收集中", "升级中"],
  openAllTasks: ["全部任务"],
  taskListMarker: ["做任务赚金币"],
  taskListStructuralKeywords: ["X", "关闭"],
  dailyCouponsMaskKeywords: ["每日可兑好券", "去看看"],
  taskListTaskKeywords: [
    "每日签到",
    "翻卡片领金币",
    "天天拆红包",
    "看视频赚金币",
    "已完成",
  ],
  adExitButtons: [
    "领取成功",
    "领取戌功",
    "开心收下",
    "去提现",
    "关闭",
    "跳过",
    "跳过广告",
    "X",
    "领取成功X",
    "领取戍功x",
    "领取戍功X",
    "领取戍功×",
  ],
  adContinueButtons: ["继续领奖励", "继续观看", "看广告翻开", "看广告重翻"],
  signInMaskKeywords: ["立即签到", "签到领金币", "每日签到", "金币到账"],
  lotteryMaskKeywords: ["天天抽奖", "今天抽奖明天领", "立即抽奖"],
  lotteryDrawKeywords: ["立即抽奖"],
  lotteryBusyKeywords: ["活动太火爆了", "请稍后再试"],
  closeKeywords: ["X", "关闭"],
  couponMaskKeywords: ["每日可兑", "元券待兑换", "平台券", "去看看"],
  signInRewardMaskKeywords: ["看广告视频再得", "金币到账+"],
  collectGoldKeywords: ["收金币"],
  collectingKeywords: ["收集中"],
  upgradingKeywords: ["升级中"],
  doneKeywords: ["已完成"],
  unsupportedTaskKeywords: ["逛精选频道赚金币"],
  unsupportedPageKeywords: ["逛精选频道赚金币", "精选频道"],
  flipCardMaskTitleKeywords: [
    "翻最后一张卡",
    "翻开加倍卡后将直接获得奖励",
    "继续翻开",
    "领更多金币",
    "看广告翻开百位数字",
  ],
  flipCardActionKeywords: ["看广告翻开加倍卡", "看广告翻开", "看广告重翻"],
  adPlayingKeywords: ["广告", "反馈"],
  adConfirmKeywords: [
    "继续观看",
    "坚持退出",
    "再看",
    "翻十位卡",
    "翻百位卡",
    "翻千位卡",
    "继续领奖励",
    "坚特退出",
  ],
  adConfirmContinueKeywords: ["继续观看", "再看", "继续领奖励", "再着"],
  adConfirmExitKeywords: ["坚持退出", "换一个", "坚特退出"],
  commonPopups: ["以后再说", "取消", "我知道了"],
  luckyStrikeExclusiveBoundsKeywords: ["拼手气翻今日专属补贴", "随机选一张"],
  luckyBoundsDrawKeywords: ["随机选一张"],
};

export const DOUYIN_TASKS: DouyinTaskDefinition[] = [
  {
    id: "daily_signin",
    title: "每日签到",
    actionType: "CLICK_ONLY",
    entryKeywords: ["立即签到", "每日签到"],
    completionKeywords: ["金币到账", "看广告视频再得"],
    maxRuns: 1,
    priority: 10,
    enabled: true,
  },
  {
    id: "flip_card",
    title: "翻卡片领金币",
    actionType: "WATCH_AD",
    entryKeywords: ["翻卡片领金币", "看广告翻开", "看广告重翻"],
    completionKeywords: ["领取成功", "开心收下", "领取戍功"],
    maxRuns: 3,
    priority: 20,
    enabled: true,
  },
  {
    id: "split_red_packet",
    title: "天天拆红包",
    actionType: "WATCH_AD",
    entryKeywords: ["看视频拆开红包", "看视频拆红包", "天天拆红包"],
    completionKeywords: ["领取成功", "今日第", "领取戍功"],
    maxRuns: 5,
    priority: 30,
    enabled: true,
  },
  {
    id: "watch_video",
    title: "看视频赚金币",
    actionType: "WATCH_AD",
    entryKeywords: ["看视频赚金币", "看广告视频"],
    completionKeywords: ["领取成功", "开心收下", "领取戍功"],
    maxRuns: 8,
    priority: 40,
    enabled: true,
  },
];
