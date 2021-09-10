import { InfrastructureTask } from '@aitheon/smart-infrastructure';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

class Task extends InfrastructureTask {
  floorName?: string;
  floorNumber?: string;
}

@Component({
  selector: 'ai-task-item',
  templateUrl: './task-item.component.html',
  styleUrls: ['./task-item.component.scss']
})
export class TaskItemComponent implements OnInit {
  @Input() task: Task;
  @Input() selectedTask: Task;
  @Output() taskSelected = new EventEmitter<Task>();
  public taskStatuses = InfrastructureTask.StatusEnum;

  constructor() {}

  ngOnInit(): void {
    this.task.createdAt = new Date(this.task.createdAt) as any;
    this.setInfrastructureData();
  }

  public get taskStatus(): string {
    switch (this.task.status) {
      case this.taskStatuses.CANCELED:
      case this.taskStatuses.COMPLETED:
      case this.taskStatuses.ESTIMATING:
      case this.taskStatuses.FAILED:
      case this.taskStatuses.PAUSED:
      case this.taskStatuses.PENDING:
        return `${this.task.status.substr(0, 1) + this.task.status.substr(1).toLowerCase()} task`
      case this.taskStatuses.IN_PROGRESS:
        return 'In progress';
      case this.taskStatuses.ERROR:
        return 'Error';
      default:
        return null;
    }
  }

  private setInfrastructureData(): void {
    const floor = this.task.infrastructure?.floors?.find(({ _id }) => _id === this.task.floor);
    if (floor) {
      this.task.floorName = floor.name;
      this.task.floorNumber = floor.number;
    }
  }

  public onSelectTask(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    this.taskSelected.emit(this.task);
  }
}
