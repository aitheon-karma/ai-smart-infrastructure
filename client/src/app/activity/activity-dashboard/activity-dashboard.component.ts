import { FormGroup, FormBuilder } from '@angular/forms';
import { InfrastructureTasksRestService, InfrastructureTask, InfrastructureRestService, AreasRestService, ActivityFilter, Task } from '@aitheon/smart-infrastructure';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { of, OperatorFunction, Subscription, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { InfrastructureService } from '../../infrastructures/infrastructure.service';
import * as moment from 'moment';
import { InfrastructureTaskType } from './../../shared/enums';

export interface TasksAttributes {
  floors: any[],
  areas: any[],
  devices: any[],
  types: any[]
}
@Component({
  selector: 'ai-activity-dashboard',
  templateUrl: './activity-dashboard.component.html',
  styleUrls: ['./activity-dashboard.component.scss']
})
export class ActivityDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('filterChips') filterChips: ElementRef;
  private subscriptions$ = new Subscription();
  public tasks: InfrastructureTask[];
  public selectedTask: InfrastructureTask;
  public isLoading: boolean = true;
  activeButton: string = 'TODAY';
  showFilters: boolean = true;
  activeFilter: string;
  infrastructures: any[];
  subjects: any[];
  events: any[];
  areas: any[];
  todayStartDay = moment().startOf('day').toDate();
  todayEndDay = moment().endOf('day').toDate();
  yesterdayStartDay = moment().subtract(1, 'days').startOf('day').toDate();
  yesterdayEndDay = moment().subtract(1, 'days').endOf('day').toDate();
  selectedInfrastructures = new Object();
  selectedSubjects = new Object();
  selectedEvents = new Object();
  tasksAttributes: TasksAttributes = {
    areas: [],
    floors: [],
    devices: [],
    types: []
  };
  filtersData: Object = new Object;
  dateForm: FormGroup;
  floorChips: any[] = [];
  areasChips: any[] = [];
  subjectChips: any[] = [];
  eventChips: any[] = [];
  showMoreButton: boolean = false;
  showAllFilters: boolean = false;
  observer: MutationObserver;
  showSubmitTooltip: boolean = false;

  constructor(
    private infrastructureTasksRestService: InfrastructureTasksRestService,
    private infrastructureService: InfrastructureService,
    private infrastructureRestService: InfrastructureRestService,
    private toastr: ToastrService,
    private areasRestService: AreasRestService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadTasks();
    this.mutationObserver();
  }

  buildForm() {
    this.dateForm = this.fb.group({
      startDate: this.todayStartDay,
      endDate: this.todayEndDay
    });

    this.dateForm.valueChanges.subscribe(() => {
      this.showSubmitTooltip = true;
      this.submitFilters('GET_TASKS_ATTRIBUTES');
    })
  }

  mutationObserver() {
    const labels = document.querySelector('.activity-dashboard__filters-labels');

    this.observer = new MutationObserver((mutations: any) => {
      if (mutations[0].target.clientHeight > 64) {
        this.showMoreButton = true;
      } else {
        this.showMoreButton = false;
        this.showAllFilters = false;
      }
    });

    this.observer.observe(labels, {
      childList: true
    });
  }

  private loadTasks(): void {
    this.isLoading = true;

    let allFilters = {
      floors: [],
      devices: [],
      areas: [],
      taskTypes: [],
      startDate: this.dateForm.get('startDate').value,
      endDate: this.dateForm.get('endDate').value,
    };

    this.subscriptions$.add(
      forkJoin([this.infrastructureTasksRestService.getFilterTaskActivity(allFilters),
                this.infrastructureRestService.list(),
                this.infrastructureRestService.searchDevices(),
                this.areasRestService.list()]).pipe(
        this.handleError('Unable to load tasks', [])).subscribe(([tasks, infrastructures, devices, areas]) => {
        this.isLoading = false;
        this.tasks = tasks.filter(task => task.status === 'COMPLETED');
        this.getTasksAttributes(this.tasks);
        this.getInfrastructures(infrastructures, areas);
        this.getSubjects(devices);
        this.getEvents();
        this.selectedTask = this.tasks[0];
        this.setInfrastructure();
    }));
  }

  getInfrastructures(infrastructures: any[], areas: any[]) {
    infrastructures.forEach(infrastructure => {
      infrastructure.allFloorsSelected = false;
      if (infrastructure.floors.length) {
        infrastructure.floors.forEach(floor => {
          let floorAreas = [];

          areas.forEach(area => {
            if (area.floor === floor._id) {
              area.isChecked = false;
              floorAreas.push(area);
            }
          });
          floor.isChecked = false;
          floor.areas = floorAreas;
        })
      }
    });
    this.infrastructures = infrastructures;
  }

  getSubjects(devices) {
    let robots = [];
    let otherDevices = [];
    devices.forEach(device => {
      device.isChecked = false;
      if (device.type && device.type.name === 'ROBOT') {
        robots.push(device);
      } else {
        otherDevices.push(device);
      }
    });
    this.subjects = [
      {
        name: 'Robots',
        _id: 'ROBOTS',
        items: [...robots],
        allItemsSelected: false
      },
      {
        name: 'Devices',
        _id: 'DEVICES',
        items: [...otherDevices],
        allItemsSelected: false
      },
      {
        name: 'Users',
        _id: 'USERS',
        items: [],
        allItemsSelected: false
      },
    ];    
  }

  getEvents() {
    this.events = [
      {
        name: 'Task types',
        _id: 'TASK_TYPES',
        items: [
          { name: InfrastructureTaskType.CHARGE.replace('_', ' '),
            _id: InfrastructureTaskType.CHARGE,
            isChecked: false
          },
          { name: InfrastructureTaskType.CLEAN.replace('_', ' '),
            _id: InfrastructureTaskType.CLEAN,
            isChecked: false
          },
          { name: InfrastructureTaskType.GO_TO.replace('_', ' '),
            _id: InfrastructureTaskType.GO_TO,
            isChecked: false
          }
        ]
      }
    ]
  }

  private setInfrastructure(): void {
    this.infrastructureService.setInfrastructureId(this.selectedTask?.infrastructure._id);
  }

  private handleError(message: string, defaultValue?: any): OperatorFunction<any, any> {
    return catchError(() => {
      this.toastr.error(message);
      return of(defaultValue);
    });
  }

  public onSelectTask(task: InfrastructureTask): void {
    this.selectedTask = task;
    this.setInfrastructure();
  }

  changeActiveButton(button: string) {
    this.activeButton = button;

    if (button === 'YESTERDAY') {
      this.dateForm.get('startDate').setValue(this.yesterdayStartDay);
      this.dateForm.get('endDate').setValue(this.yesterdayEndDay);
    } else {
      this.dateForm.get('startDate').setValue(this.todayStartDay);
      this.dateForm.get('endDate').setValue(this.todayEndDay);
    }
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
    this.activeFilter = null;
  }

  chooseFilter(filter: string) {
    if (this.activeFilter === filter) {
      this.activeFilter = null;
    } else {
      this.activeFilter = filter;
    }
  }

  getFiltersData(event: any, type: string) {
    let array = [];
    const result = [];
    this.showSubmitTooltip = true;

    switch (type) {
      case 'INFRASTRUCTURES':
        this.infrastructures = event;
        this.infrastructures.forEach(infrastructure => {
          infrastructure.floors.forEach((floor: any) => {
            if (floor.isChecked && !this.floorChips.some(f => f._id === floor._id)) {
              let f = {
                infrastructureName: infrastructure.name,
                floorName: floor.name,
                _id: floor._id
              }
              this.floorChips.push(f);
            } else if (!floor.isChecked && this.floorChips.some(f => f._id === floor._id)) {
              let i = this.floorChips.findIndex(f => f._id === floor._id);
              this.floorChips.splice(i, 1);
            }

            floor?.areas?.forEach(area => {
              if (area.isChecked && !this.areasChips.some(a => a._id === area._id)) {
                let a = {
                  floorName: floor.name,
                  areaName: area.name,
                  _id: area._id
                }
                this.areasChips.push(a);
              } else if (!area.isChecked && this.areasChips.some(a => a._id === area._id)) {
                let i = this.areasChips.findIndex(a => a._id === area._id);
                this.areasChips.splice(i, 1);
              }
            })
          })
        });
      break;

      case 'SUBJECTS':
        this.subjects = event;

        if (this.subjects.length) {
          this.subjects?.forEach(subject => {
            subject.items.forEach((item: any) => {
              if (item.isChecked && !this.subjectChips.some(i => i._id === item._id)) {
                let f = {
                  subjectName: subject.name,
                  name: item.name,
                  _id: item._id
                }
                this.subjectChips.push(f);
              } else if (!item.isChecked && this.subjectChips.some(i => i._id === item._id)) {
                let i = this.subjectChips.findIndex(i => i._id === item._id);
                this.subjectChips.splice(i, 1);
              }
            })
          });
        }
      break;

      case 'EVENTS':
        this.events = event;

        this.events?.forEach(event => {
          event.items.forEach((item: any) => {
            if (item.isChecked && !this.eventChips.some(i => i._id === item._id)) {
              let f = {
                eventName: event.name,
                name: item.name,
                _id: item._id
              }
              this.eventChips.push(f);
            } else if (!item.isChecked && this.eventChips.some(i => i._id === item._id)) {
              let i = this.eventChips.findIndex(i => i._id === item._id);
              this.eventChips.splice(i, 1);
            }
          })
        });
      break;
    }
  }

  clearAllFilters() {
    this.filtersData = new Object();
    this.activeFilter = null;
    this.showSubmitTooltip = false;
    
    this.infrastructures.forEach(infrastructure => {
      infrastructure.allFloorsSelected = false;
      infrastructure.floors.forEach(floor => {
        floor.isChecked = false;

        floor.areas?.forEach(area => {
          area.isChecked = false;
        })
      });
    });
    this.subjects.forEach(subject => {
      subject.allItemsSelected = false;
      subject.items.forEach(item => {
        item.isChecked = false;
      })
    });
    this.events.forEach(event => {
      event.allItemsSelected = false;
      event.items.forEach(item => {
        item.isChecked = false;
      })
    });
    this.floorChips = [];
    this.areasChips = [];
    this.subjectChips = [];
    this.eventChips = [];

    this.loadTasks();
  }

  removeItem(item: any, index: number, type: string) {
    this.showSubmitTooltip = true;
    switch (type) {
      case 'INFRASTRUCTURES':
        this.floorChips.splice(index, 1);
        this.infrastructures.forEach(infrastructure => {
          infrastructure.allFloorsSelected = false;
          infrastructure.floors.forEach(floor => {
            if (floor._id === item._id) {
              floor.isChecked = false;
            }
          })
        })
      break;

      case 'AREAS':
        this.areasChips.splice(index, 1);
        this.infrastructures.forEach(infrastructure => {
          infrastructure?.floors?.forEach(floor => {
            floor?.areas?.forEach(area => {
              if (area._id === item._id) {
                area.isChecked = false;
              }
            })
          })
        })
      break;

      case 'SUBJECTS':
        this.subjectChips.splice(index, 1);
        this.subjects.forEach(subject => {
          subject.allItemsSelected = false;
          subject.items.forEach(i => {
            if (i._id === item._id) {
              i.isChecked = false;
            }
          })
        })
      break;

      case 'EVENTS':
        this.eventChips.splice(index, 1);
        this.events.forEach(event => {
          event.allItemsSelected = false;
          event.items.forEach(i => {
            if (i._id === item._id) {
              i.isChecked = false;
            }
          })
        });
      break;
    }
  }

  submitFilters(type: string) {
    this.isLoading = true;
    this.activeFilter = null;
    const floors= [];
    const devices= [];
    const areas= [];
    const taskTypes= [];

    this.infrastructures.forEach(infrastructure => {
      infrastructure.floors.forEach(floor => {
        if (floor?.isChecked) {
          floors.push(floor._id);
        }
        
        floor.areas?.forEach(area => {
          if (area.isChecked) {
            areas.push(area._id);
          }
        })
      });
    });

    this.subjects.forEach(subject => {
      subject.items.forEach(device => {
        if (device.isChecked) {
          devices.push(device._id);
        }
      })
    });

    this.events.forEach(event => {
      if (event._id === 'AREAS') {
        event.items.forEach(item => {
          if (item.isChecked) {
            areas.push(item._id);
          }
        })
      } else if (event._id === 'TASK_TYPES') {
        event.items.forEach(item => {
          if (item.isChecked) {
            taskTypes.push(item._id);
          }
        })
      }
    });

    const allFilters = {
      floors,
      devices,
      areas,
      taskTypes,
      startDate: this.dateForm.get('startDate').value,
      endDate: this.dateForm.get('endDate').value,
    } as ActivityFilter;  

    if (type === 'ON_SUBMIT') {
      this.subscriptions$.add(
        this.infrastructureTasksRestService.getFilterTaskActivity(allFilters).subscribe((tasks: InfrastructureTask[]) => {
          this.tasks = tasks.filter(task => task.status === 'COMPLETED');
          this.getTasksAttributes(this.tasks);
          this.isLoading = false;
          this.showSubmitTooltip = false;
        })
      );
    } else if (type === 'GET_TASKS_ATTRIBUTES') {
      this.subscriptions$.add(
        this.infrastructureTasksRestService.getFilterTaskActivity(allFilters).subscribe((tasks: InfrastructureTask[]) => {
          this.getTasksAttributes(tasks.filter(task => task.status === 'COMPLETED'));
          this.isLoading = false;
        })
      );
    }
  }

  toggleMoreFilters() {
    this.showAllFilters = !this.showAllFilters
  }

  refreshTasksAttributes() {
    this.tasksAttributes.areas = [];
    this.tasksAttributes.floors = [];
    this.tasksAttributes.areas = [];
    this.tasksAttributes.devices = [];
  }

  getTasksAttributes(tasks: any[]) {
    this.refreshTasksAttributes();
    
    tasks.forEach(task => {
      if (!this.tasksAttributes.areas.includes(task?.area?._id)) {
        this.tasksAttributes.areas.push(task?.area?._id)
      }

      if (!this.tasksAttributes?.floors.includes(task?.floor)) {
        this.tasksAttributes?.floors.push(task?.floor)
      }

      if (!this.tasksAttributes.devices.includes(task.orchestratorTask?.assignedToDevice?._id)) {
        this.tasksAttributes.devices.push(task.orchestratorTask?.assignedToDevice?._id);
      }

      if (!this.tasksAttributes.types.includes(task?.type)) {
        this.tasksAttributes.types.push(task?.type);
      }
    });
  }

  ngOnDestroy(): void {
    try {
      this.subscriptions$.unsubscribe();
    } catch(e) {}
  }
}
