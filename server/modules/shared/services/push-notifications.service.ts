import { Service, Inject, Container } from 'typedi';
import { Current } from '@aitheon/core-server';
import { RestService } from '../../core/rest.service';
import { environment } from '../../../environment';


export enum PM_SI_ACTIONS {
  TASK_IN_PROGRESS = 'TASK_IN_PROGRESS', // Smart Infrastructure: Task you created is now in progress.
  TASK_ERROR = 'TASK_ERROR',   // Smart Infrastructure: Task you created has an Error.
  TASK_COMPLETED = 'TASK_COMPLETED',      // Smart Infrastructure: Task you created was completed.
  TASK_FAILED = 'TASK_FAILED',       // Smart Infrastructure: Task you created Failed to be completed.
  ROBOT_CHARGE = 'ROBOT_CHARGE',       // Smart Infrastructure: Robot proceeded to charge. (Next release)
}

@Service()
export class PushNotificationsService {

  @Inject()
  restService: RestService;


  constructor() {

  }

  async sendPushNotification(notification: Notification, users: string[], action: string, organizationId: string): Promise<any> {
    const body = { users, notification, organization: organizationId, service: environment.service._id, action };
    return this.restService.post({
      uri: `${this.getUsersBaseUrl()}/api/push-subscriptions/notify`,
      body
    });
  }


  private getUsersBaseUrl() {
    return environment.production ? '/users' : '';
  }

}

