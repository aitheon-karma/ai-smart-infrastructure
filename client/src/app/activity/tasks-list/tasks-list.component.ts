import { InfrastructureTask } from '@aitheon/smart-infrastructure';
import { Component, OnInit, OnChanges, SimpleChanges, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ai-tasks-list',
  templateUrl: './tasks-list.component.html',
  styleUrls: ['./tasks-list.component.scss']
})
export class TasksListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() tasks: any[];
  @Input() selectedTask: InfrastructureTask;
  @Output() taskSelected = new EventEmitter<InfrastructureTask>();

  filteredTasks: any[];
  subscriptions$ = new Subscription();
  searchControl: FormControl;
  constructor() {}

  ngOnInit(): void {
    this.initTasksSearch();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.tasks?.currentValue) {
      this.filterTasks();
    }
  }

  initTasksSearch(): void {
    this.searchControl = new FormControl();
    this.subscriptions$.add(this.searchControl.valueChanges.subscribe(search => {
      this.filterTasks(search);
    }));
  }

  filterTasks(search?: string): void {
    if (!search) {
      this.filteredTasks = this.tasks;
      return;
    }
    this.filteredTasks = this.tasks.filter(task => task.name?.toLowerCase()?.includes(search?.toLowerCase()));
  }

  ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
  }
}
