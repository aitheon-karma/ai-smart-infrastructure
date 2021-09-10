import { AreasService } from '../../infrastructure-map';
import { TaskService } from './../shared/task.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, Subscription, BehaviorSubject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { map, mergeMapTo, switchMap, tap, filter } from 'rxjs/operators';
import { InfrastructureTasksRestService, InfrastructureTask, InfrastructureRestService, Infrastructure } from '@aitheon/smart-infrastructure';
import { InfrastructureService } from 'src/app/infrastructures/infrastructure.service';
import { TaskModalService, TASK_MODAL_EVENTS, ModalService } from '@aitheon/core-client';
import { environment } from 'src/environments/environment';
import { getFormattedFloorNumber } from '../../shared/utils/formatted-names';

export interface DropResult {
  removedIndex: number | null;
  addedIndex: number | null;
  payload?: any;
  element?: HTMLElement;
}

enum TAB {
  SCHEDULED = 'SCHEDULED',
  QUEUE = 'QUEUE',
  HISTORY = 'HISTORY'
}

const STATUS = InfrastructureTask.StatusEnum;
const HTTP_POOLING_TIME = 2000;

@Component({
  selector: 'ai-tasks-list',
  templateUrl: './tasks-list.component.html',
  styleUrls: ['./tasks-list.component.scss']
})
export class TasksListComponent implements OnInit, OnDestroy {

  constructor(
    private toastr: ToastrService,
    private infrastructureService: InfrastructureService,
    private infrastructureRestService: InfrastructureRestService,
    private taskModalService: TaskModalService,
    private modalService: ModalService,
    private infrastructureTaskService: InfrastructureTasksRestService,
    private route: ActivatedRoute,
    private areasService: AreasService,
    private taskService: TaskService) {
  }

  STATUS = STATUS;
  searchFocus = false;
  filtersOpen = false;
  activeTab: TAB = TAB.QUEUE;
  loading = true;
  allTasks: InfrastructureTask[] = [];
  tasksToFilter: InfrastructureTask[] = [];
  scheduledTasks: InfrastructureTask[] = [];
  historyTasks: InfrastructureTask[] = [];
  infrastructureId: string;
  queueTasks: {
    inProgress: InfrastructureTask[],
    other: InfrastructureTask[]
  } = { inProgress: [], other: [] };
  historyStatuses = [STATUS.FAILED, STATUS.COMPLETED, STATUS.CANCELED];
  activeTabTasks: Observable<InfrastructureTask[]> = of([]);
  TAB = TAB;
  infrastructure$: Observable<Infrastructure>;
  infrastructure: Infrastructure;
  subscriptions: Subscription = new Subscription();
  loadSub = new BehaviorSubject<boolean>(true);
  interval: any;
  dragging = false;
  taskFiltersData: { locations: Array<{ name: string }>, robots: Array<{ name: string }> } = {
    locations: [],
    robots: []
  };
  filters: {
    location: Array<string> | null,
    robot: Array<string>,
    searchText: string | null,
    status: Array<string> | null,
    type: Array<string> | null
  } = {
    location: null,
    robot: null,
    searchText: '',
    status: null,
    type: null
  };

  demoMode = {
    title: 'Demo Mode on... Waiting for tasks',
    currentTaskCounter: 0,
    taskId: '',
    taskFound: false
  };
  isDemoMode = false;

  cssClasses = {
    'FAILED': 'tasks-list__item-status--red',
    'CANCELED': 'tasks-list__item-status--red',
    'COMPLETED': 'tasks-list__item-status--green',
    'PENDING': 'tasks-list__item-status--purple',
    'IN_QUEUE': 'tasks-list__item-status--purple',
    'SCHEDULED': 'tasks-list__item-status--turquoise',
    'IN_PROGRESS': 'tasks-list__item-status--blue'
  };

  ngOnInit() {
    this.loading = true;

    const { demoMode } = this.route.snapshot.queryParams;
    this.isDemoMode = Boolean(demoMode);

    this.infrastructure$ = this.infrastructureService.infrastructureId
      .pipe(tap(id => this.infrastructureId = id),
        switchMap(id => this.infrastructureRestService.getById(id)));
    this.initializeLoadTasks();
    this.listenTaskModalEvents();

    this.interval = setInterval(() => {
      if (!this.dragging) {
        this.loadSub.next(true);
      }
    }, HTTP_POOLING_TIME);
  }

  initializeLoadTasks() {
    const infrastructure$ = this.infrastructureService.infrastructureId
      .pipe(
        switchMap(id => this.infrastructureTaskService.listByInfrastructure(id)),
        map(tasks => {
          tasks.forEach(t => t.floor = t.infrastructure.floors.find((f: any) => f._id === t.floor));
          const inProgressTasks = tasks.filter(t => t.status === STATUS.IN_PROGRESS);
          const otherTasks = tasks.filter(t => t.status !== STATUS.IN_PROGRESS);
          return inProgressTasks.concat(otherTasks);
        }));

    const sub = this.loadSub
      .pipe(mergeMapTo(infrastructure$))
      .subscribe(allTasks => {
        if (!this.dragging) {
          this.allTasks = allTasks;
          this.filterTasks();
          this.splitTasksToTab();
          this.updateTaskFiltersData();
          this.loading = false;
          this.checkDemoMode();
        }
      }, (err => this.toastr.error(err.message)));
    this.subscriptions.add(sub);
  }

  onAddTask() {
    this.taskModalService.openModal({
      service: environment.service,
      smartInfrastructureTaskConfig: {
        infrastructure: this.infrastructureId
      }
    });
  }

  listenTaskModalEvents() {
    const sub = this.taskModalService.taskModalEvents$
      .pipe(filter(event => event.eventType === TASK_MODAL_EVENTS.CREATED))
      .subscribe(() => {
        this.loadSub.next(true);
      });
    this.subscriptions.add(sub);
  }

  splitTasksToTab() {
    this.scheduledTasks = this.tasksToFilter.filter(t => (t.scheduledDateTime && !this.historyStatuses.includes(t.status)));
    this.historyTasks = this.tasksToFilter.filter(t => (this.historyStatuses.includes(t.status)));
    this.queueTasks.inProgress = this.getQueueTasks(STATUS.IN_PROGRESS);
    this.queueTasks.other = this.getQueueTasks();
    this.queueTasks.other = this.queueTasks.other.sort((q1, q2) => q1.priority - q2.priority);
  }

  toggleFilters(status: boolean) {
    this.filtersOpen = status;
  }

  changeTab(tab: TAB) {
    this.activeTab = tab;
    this.splitTasksToTab();
  }

  onTaskDrop(dropResult: DropResult) {
    if (dropResult.removedIndex !== null || dropResult.addedIndex !== null) {
      this.dragging = false;
      const { addedIndex, removedIndex, payload } = dropResult;
      if (addedIndex === removedIndex) {
        return;
      }

      const [item] = this.queueTasks.other.splice(removedIndex, 1);
      this.queueTasks.other.splice(addedIndex, 0, item);
      const arr = this.queueTasks.other.map(task => task._id);

      this.infrastructureTaskService.updatePriority({ tasks: arr }).subscribe();
    }
  }

  getTaskDragData() {
    return (index: number) => this.queueTasks.other[index];
  }

  dragStart() {
    this.dragging = true;
  }

  logTaskId(task: string) {
  }

  ngOnDestroy() {
    clearInterval(this.interval);
    this.subscriptions.unsubscribe();
  }

  cancelTask(e: Event, task: InfrastructureTask) {
    e.stopPropagation();
    e.preventDefault();

    this.modalService.openGenericConfirm({
      text: `You are sure that you want to cancel this task?`,
      headlineText: `Cancel Task`,
      confirmText: `Continue`,
      callback: (confirm) => {
        if (confirm) {
          this.taskService.onCancelTask(task._id).subscribe(() => {
            this.clearTaskProgress(task);
            this.toastr.success('Task canceled');
            this.initializeLoadTasks();
          }, err => this.toastr.error('Could not cancel task'));
        }
      }
    });

  }

  clearTaskProgress(task: InfrastructureTask): void {
    if (task?.area) {
      this.areasService.setAreaOverlay(null, task.area?._id);
    }
  }

  onFilterDataChange(filterData: any): void {
    this.filters = filterData;
    this.filterTasks();
    this.splitTasksToTab();
  }

  private getQueueTasks(status?: string): InfrastructureTask[] {
    return this.tasksToFilter
      .filter(t => {
        const isNeededStatus = (status === STATUS.IN_PROGRESS) ? this.isTaskInProgress(t) : !this.isTaskInProgress(t);

        return isNeededStatus && this.hasTimeAndStatus(t);
      });
  }

  private isSearchTextInTask(task: InfrastructureTask, searchText: string): boolean {
    return task.taskNumber.toString().toLowerCase().includes(searchText) ||
      task.orchestratorTask.name.toLowerCase().includes(searchText);
  }

  private hasTimeAndStatus(task: InfrastructureTask): boolean {
    return !task.scheduledDateTime && !this.historyStatuses.includes(task.status);
  }

  private isTaskInProgress(task: InfrastructureTask): boolean {
    return task.status === STATUS.IN_PROGRESS;
  }

  private updateTaskFiltersData(): void {
    this.taskFiltersData = {
      locations: [],
      robots: []
    };

    this.allTasks.forEach((task) => {
      const location = { name: `${task?.floor?.name} ${this.getFloorNumber(task?.floor?.number)}/${task?.area?.name || ''}` || '' };
      const robot = { name: task?.orchestratorTask?.assignedToDevice?.name || '' };
      const isStatusMatch = this.activeTab === 'QUEUE'
        ? !this.historyStatuses.includes(task.status)
        : this.historyStatuses.includes(task.status);

      if (isStatusMatch && location.name.length && !this.taskFiltersData.locations.some(locItem => locItem.name === location.name)) {
        this.taskFiltersData.locations.push(location);
      }

      if (isStatusMatch && robot.name.length && !this.taskFiltersData.robots.some(robotItem => robotItem.name === robot.name)) {
        this.taskFiltersData.robots.push(robot);
      }
    });
  }

  private filterTasks(): void {
    this.tasksToFilter = this.getFilteredTasks();
  }

  private getFilteredTasks(): InfrastructureTask[] {
    return this.allTasks.filter(task => {
      let isMatchFilters = true;

      if (this.filters.searchText?.length) {
        isMatchFilters = isMatchFilters && this.isSearchTextInTask(task, this.filters.searchText);
      }

      if (this.filters.location?.length) {
        isMatchFilters = isMatchFilters && this.filters.location.some(location => this.isTaskLocation(task, location));
      }

      if (this.filters.robot?.length) {
        isMatchFilters = isMatchFilters && this.filters.robot.some(robot => this.isTaskRobot(task, robot));
      }

      if (this.filters.status?.length) {
        isMatchFilters = isMatchFilters && this.filters.status.some(status => task.status === status);
      }

      if (this.filters.type?.length) {
        isMatchFilters = isMatchFilters && this.filters.type.some(type => task.type === type);
      }

      return isMatchFilters;
    });

  }

  private isTaskLocation(task: InfrastructureTask, location: string): boolean {
    const taskLocation = `${task?.floor?.name} ${this.getFloorNumber(task?.floor?.number)}/${task?.area?.name || ''}`;

    return taskLocation === location;
  }

  private isTaskRobot(task: InfrastructureTask, robot: string): boolean {
    if (robot === 'Any available') {
      return !task.orchestratorTask.assignedToDevice;
    } else {
      return task.orchestratorTask.assignedToDevice?.name === robot;
    }
  }

  // TEMP DEMO MODE CODE

  checkDemoMode() {
    if (!this.isDemoMode || !this.scheduledTasks.length || this.demoMode.taskFound) {
      return;
    }
    if ((this.scheduledTasks.length - 1) === this.demoMode.currentTaskCounter) {
      const topTaskId = this.scheduledTasks[0]._id;
      this.demoMode.taskId = topTaskId;
      this.demoMode.taskFound = true;
      this.infrastructureTaskService.update(topTaskId, { status: 'IN_PROGRESS' }).subscribe();
    }
    this.demoMode.currentTaskCounter = this.scheduledTasks.length;
  }

  demoComplete() {
    this.demoMode.taskFound = false;
    this.infrastructureTaskService.update(this.demoMode.taskId, { status: 'COMPLETED' }).subscribe();
  }

  getFloorNumber(floorNumber: number): string {
    return getFormattedFloorNumber(floorNumber);
  }
}
