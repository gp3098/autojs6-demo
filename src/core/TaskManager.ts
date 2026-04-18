import { IAppTaskStrategy } from './IAppTaskStrategy';
import { TaskRunStatus } from './Enums';
import { PhoenixReadStrategy } from '../strategies/PhoenixReadStrategy';
import { DouyinMallStrategy } from '../strategies/DouyinMallStrategy';

export interface TaskRecord {
   id: string;
   appId: string;
   appName: string;
   taskName: string;
   isInfinite: boolean; // 是否无限执行任务（若是，则执行一次标记完成）
   maxCount: number;
   currentCount: number;
   status: TaskRunStatus;
   strategyClass: new () => IAppTaskStrategy;
}

export class TaskManager {
   public tasks: TaskRecord[] = [
      {
         id: 'p1', appId: 'phoenix', appName: '红果免费短剧', taskName: '自动福利全套挂机',
         isInfinite: true, maxCount: 1, currentCount: 0, status: TaskRunStatus.IDLE,
         strategyClass: PhoenixReadStrategy
      },
      {
         id: 'd1', appId: 'douyin_mall', appName: '抖音商城版', taskName: '看视频赚金币',
         isInfinite: true, maxCount: 1, currentCount: 0, status: TaskRunStatus.IDLE,
         strategyClass: DouyinMallStrategy
      }
   ];

   public getTasksForApp(appId: string) {
       if (appId === 'all') return this.tasks;
       return this.tasks.filter(t => t.appId === appId);
   }

   public updateTaskState(taskId: string, count: number, status: TaskRunStatus) {
       const t = this.tasks.find(x => x.id === taskId);
       if (t) {
           t.currentCount = count;
           t.status = status;
       }
   }
   
   public getApps() {
       return [
           { id: 'all', name: '全部任务' },
           { id: 'phoenix', name: '红果短剧' },
           { id: 'douyin_mall', name: '抖音商城' }
       ];
   }
}
