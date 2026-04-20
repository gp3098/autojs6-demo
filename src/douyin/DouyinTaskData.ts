import { OCRQuery } from './OcrService';

export type DouyinTaskActionType = 'CLICK_ONLY' | 'WATCH_AD';

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
  openAllTasks: OCRQuery;
  taskListMarker: OCRQuery;
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
  unsupportedTaskKeywords: OCRQuery;
  unsupportedPageKeywords: OCRQuery;
  commonPopups: OCRQuery;
}

export const DOUYIN_UI_LEXICON: DouyinUiLexicon = {
  earnCoinEntry: ['赚金币'],
  openAllTasks: ['全部任务', '做任务赚金币'],
  taskListMarker: ['做任务赚金币'],
  adExitButtons: ['领取成功', '领取奖励', '开心收下', '去提现', '关闭', '跳过', '跳过广告', 'X'],
  adContinueButtons: ['继续领奖励', '继续观看', '看广告翻开', '看广告重翻'],
  signInMaskKeywords: ['立即签到', '签到领金币', '每日签到', '金币到账'],
  lotteryMaskKeywords: ['天天抽奖', '今天抽奖明天领', '立即抽奖'],
  lotteryDrawKeywords: ['立即抽奖'],
  lotteryBusyKeywords: ['活动太火爆了', '请稍后再试'],
  closeKeywords: ['X', '关闭'],
  couponMaskKeywords: ['每日可兑', '元券待兑换', '平台券', '去看看'],
  signInRewardMaskKeywords: ['看广告视频再得', '金币到账+'],
  collectGoldKeywords: ['收金币'],
  collectingKeywords: ['收集中'],
  unsupportedTaskKeywords: ['逛精选频道赚金币'],
  unsupportedPageKeywords: ['逛精选频道赚金币', '精选频道'],
  commonPopups: ['以后再说', '取消', '我知道了']
};

export const DOUYIN_TASKS: DouyinTaskDefinition[] = [
  {
    id: 'daily_signin',
    title: '每日签到',
    actionType: 'CLICK_ONLY',
    entryKeywords: ['立即签到', '每日签到'],
    completionKeywords: ['金币到账', '看广告视频再得'],
    maxRuns: 1,
    priority: 10,
    enabled: true
  },
  {
    id: 'flip_card',
    title: '翻卡片领金币',
    actionType: 'WATCH_AD',
    entryKeywords: ['翻卡片领金币', '看广告翻开', '看广告重翻'],
    completionKeywords: ['领取成功', '开心收下'],
    maxRuns: 3,
    priority: 20,
    enabled: true
  },
  {
    id: 'split_red_packet',
    title: '天天拆红包',
    actionType: 'WATCH_AD',
    entryKeywords: ['看视频拆开红包', '看视频拆红包', '天天拆红包'],
    completionKeywords: ['领取成功', '今日第'],
    maxRuns: 5,
    priority: 30,
    enabled: true
  },
  {
    id: 'watch_video',
    title: '看视频赚金币',
    actionType: 'WATCH_AD',
    entryKeywords: ['看视频赚金币', '看广告视频'],
    completionKeywords: ['领取成功', '开心收下'],
    maxRuns: 8,
    priority: 40,
    enabled: true
  }
];
