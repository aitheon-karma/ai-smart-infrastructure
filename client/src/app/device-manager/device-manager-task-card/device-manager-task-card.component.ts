import { ModalService } from '@aitheon/core-client';
import { ToastrService } from 'ngx-toastr';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Floor, InfrastructureTask } from '@aitheon/smart-infrastructure';
import { InfrastructureTaskStatus } from '../../shared/enums';
import { TaskService } from './../../tasks/shared/task.service';

@Component({
  selector: 'ai-device-manager-task-card',
  templateUrl: './device-manager-task-card.component.html',
  styleUrls: ['./device-manager-task-card.component.scss']
})
export class DeviceManagerTaskCardComponent implements OnInit {

  @Input() task: InfrastructureTask;
  @Input() floor: Floor;
  @Input() actions: boolean;
  @Output() reloadTasks = new EventEmitter<boolean>();

  statusTaskColor = {};
  isActionsOpen = false;
  showInfo = false;
  workFloor: any;

  constructor(private taskService: TaskService,
              private modalService: ModalService,
              private toastr: ToastrService) { }

  ngOnInit(): void {
    this.statusTaskColor = {
      'status-label--aqua-blue': this.task.status === InfrastructureTaskStatus.ESTIMATING,
      'status-label--base-blue': this.task.status === InfrastructureTaskStatus.IN_PROGRESS,
      'status-label--base-violet': this.task.status === InfrastructureTaskStatus.PENDING,
      'status-label--base-orange': this.task.status === InfrastructureTaskStatus.CANCELED,
      'status-label--base-red': this.task.status === InfrastructureTaskStatus.FAILED || this.task.status.toString() === 'ERROR',
      'status-label--base-green': this.task.status === InfrastructureTaskStatus.COMPLETED
    };

    this.setWorkFloor();
  }

  editTask(task: InfrastructureTask) {

  }

  cancelTask(e: Event, taskId: string) {
    e.stopPropagation();
    e.preventDefault();

    this.modalService.openGenericConfirm({
      text: `You are sure that you want to cancel this task?`,
      headlineText: `Cancel Task`,
      confirmText: `Continue`,
      callback: (confirm) => {
        if (confirm) {
          this.taskService.onCancelTask(taskId).subscribe(() => {
            this.toastr.success('Task canceled');
            this.reloadTasks.emit(true);
          }, err => this.toastr.error('Could not cancel task'));
        }
      }
    });
  }

  closeTaskInfo(event: any) {
    event.stopPropagation();
    this.showInfo = false;
  }

  showTaskInfo(event: any) {
    event.stopPropagation();
    this.showInfo = true;
  }

  private setWorkFloor(): void {
    if (this.task.floor) {
      this.workFloor = this.task.infrastructure.floors.find(floor => floor._id === this.task.floor);
    }
  }
}
