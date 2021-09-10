import { InfrastructureTasksRestService, InfrastructureTask } from '@aitheon/smart-infrastructure';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private infrastructureTaskService: InfrastructureTasksRestService) { }

  onCancelTask(task) {
    return this.infrastructureTaskService.update(task, { status: InfrastructureTask.StatusEnum.CANCELED });
  }
}
