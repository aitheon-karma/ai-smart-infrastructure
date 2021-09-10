import { NgSelectComponent } from '@ng-select/ng-select';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  SimpleChanges,
  ChangeDetectorRef
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Infrastructure,
  InfrastructureTask
} from '@aitheon/smart-infrastructure';
import { InfrastructureService } from '../../../infrastructures/infrastructure.service';
import { InfrastructureTaskType } from '../../enums';
import { DeviceTypesRestService, DeviceType } from '@aitheon/device-manager';

@Component({
  selector: 'ai-filters-panel',
  templateUrl: './filters-panel.component.html',
  styleUrls: ['./filters-panel.component.scss']
})
export class FiltersPanelComponent implements OnInit {

  @Input() initialFiltersData: any;
  @Input() infrastructure: Infrastructure;
  @Input() epic: any;
  @Input() type: any;
  @Output() resetFilters: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() filtersOpen: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() filterData: EventEmitter<any> = new EventEmitter<any>();
  @Output() addTask: EventEmitter<any> = new EventEmitter<any>();
  @Output() openModal: EventEmitter<string> = new EventEmitter<string>();
  @Output() toggleFiltersEvent: EventEmitter<any> = new EventEmitter<boolean>();
  @Output() callAddDeviceModal: EventEmitter<boolean> = new EventEmitter<boolean>();
  @ViewChild('statusFilter') statusFilter: NgSelectComponent;
  @ViewChild('typeFilter') typeFilter: NgSelectComponent;
  @ViewChild('modelFilter') modelFilter: NgSelectComponent;

  searchForm: FormGroup;
  searchTasksForm: FormGroup;
  isFiltersOpen = false;
  typesList: Array<{ name: string, value: string, _id: string }> = [];
  statusList = [
    {
      name: 'Online',
      value: 'ONLINE'
    },
    {
      name: 'Need charging',
      value: 'NEED_CHARGING'
    },
    {
      name: 'Abstracted',
      value: 'ABSTRACTED'
    },
    {
      name: 'Lost',
      value: 'LOST'
    },
    {
      name: 'Offline',
      value: 'OFFLINE'
    },
    {
      name: 'Working',
      value: 'WORKING'
    },
    {
      name: 'Waiting',
      value: 'WAITING'
    }
  ];
  taskTypeList = [
    {
      name: 'Go To',
      value: InfrastructureTaskType.GO_TO
    },
    {
      name: 'Charge',
      value: InfrastructureTaskType.CHARGE
    },
    {
      name: 'Clean',
      value: InfrastructureTaskType.CLEAN
    }
  ];
  taskStatusList = [
    {
      name: 'In Progress',
      value: InfrastructureTask.StatusEnum.IN_PROGRESS
    },
    {
      name: 'Estimating',
      value: InfrastructureTask.StatusEnum.ESTIMATING
    },
    {
      name: 'Canceled',
      value: InfrastructureTask.StatusEnum.CANCELED
    },
    {
      name: 'Paused',
      value: InfrastructureTask.StatusEnum.PAUSED
    },
    {
      name: 'Pending',
      value: InfrastructureTask.StatusEnum.PENDING
    },
    {
      name: 'Failed',
      value: InfrastructureTask.StatusEnum.FAILED
    },
    {
      name: 'Completed',
      value: InfrastructureTask.StatusEnum.COMPLETED
    },
    {
      name: 'Error',
      value: InfrastructureTask.StatusEnum.ERROR
    }
  ];
  taskLocations: Array<string> = [];
  taskRobots: Array<string> = [];
  robots: Array<string> = [];
  showMore = false;
  activeFilters: number;
  formToCountFilters: any;
  searchAssigneesControl: FormControl;
  isAdmin = false;
  accessType: string;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private infrastructureService: InfrastructureService,
    private deviceTypesRestService: DeviceTypesRestService,
  ) {
  }

  ngOnInit() {
    this.activeFilters = 0;
    this.searchAssigneesControl = new FormControl();
    this.deviceTypesRestService.listAll().subscribe((types: DeviceType[]) => {
      this.typesList = types.map((type: DeviceType) => {
        return {
          value: type.name,
          name: this.infrastructureService.humanize(type.name),
          _id: type._id
        };
      });
    });
    this.buildForm();
    this.buildTasksForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    let newFiltersData = changes?.initialFiltersData?.currentValue;
    const isDeviceManager = newFiltersData?.title ? newFiltersData.title === 'Device Manager' : false;

    if (newFiltersData && !isDeviceManager) {
      this.taskLocations = newFiltersData.locations || this.taskLocations;
      this.taskRobots = [{name: 'Any available'}, ...newFiltersData?.robots] || this.taskRobots;
    }
  }

  resetSelect(type: any, elementRef: any) {
    if (this.type === 'TASKS') {
      this.searchTasksForm.get(type).patchValue(null);
    } else {
      this.searchForm.get(type).patchValue(null);
    }

    elementRef.close();
  }

  clearSearch(searchType?: string) {
    if (searchType && searchType === 'TASKS') {
      this.searchTasksForm.get('searchText').reset();
    } else {
      this.searchForm.get('name').reset();
    }
  }

  buildForm() {
    this.searchForm = this.fb.group({
      name: [''],
      // Temporary fix, need to be "types". Need rework after device types logic will be in db
      types: [null],
      statuses: [null],
      floors: [null]
    });

    this.searchForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((form: any) => {
        this.filterData.emit(form);
        this.formToCountFilters = form;
        this.calcActiveFilters(form);
        this.searchAssigneesControl.patchValue('');
      });
  }

  buildTasksForm() {
    this.searchTasksForm = this.fb.group({
      searchText: [''],
      location: [null],
      types: [null],
      robot: [null],
      status: [null],
      // repeat: [null],
    });

    this.searchTasksForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((form: any) => {
        this.filterData.emit(form);
      });
  }

  clearFilters() {
    this.activeFilters = 0;
    this.statusFilter.clearModel();
    this.typeFilter.clearModel();
    this.modelFilter.clearModel();
    this.searchForm.reset();
    this.resetFilters.emit(true);
  }

  toggleFilters() {
    this.isFiltersOpen = !this.isFiltersOpen;
    this.filtersOpen.emit(this.isFiltersOpen);
    this.showMore = false;

    setTimeout(() => {
      this.toggleFiltersEvent.emit();
    }, 10);
  }

  toggleMoreSection() {
    this.showMore = !this.showMore;
  }

  calcActiveFilters(form) {
    this.activeFilters = 0;
    const values = Object.values(form);

    values.shift();

    values.forEach((value: any | null) => {
      if (value) {
        value.forEach((v: Array<any> | null) => {
          this.activeFilters++;
        });
      }
    });
  }

  onDropdownOptionsChange(event, filterType: string): void {
    const allItems = this[filterType].items;
    const selectedItems = event;

    this.setStatusToItems(selectedItems, allItems);
  }

  private setStatusToItems(selectedItems: Array<any>, allItems: Array<any>): void {
    allItems.forEach(item => {
      const isAnyItemSelected = (selectedItems.length > 0);

      if (isAnyItemSelected) {
        const isItemSelected = this.isItemSelected(item, selectedItems);
        item.status = isItemSelected ? 'selected' : 'unselected';
      } else {
        item.status = undefined;
      }
    });
  }

  private isItemSelected(item, selectedItems): boolean {
    return selectedItems.some(selectedItem => selectedItem._id === item._id);
  }

  addDevice() {
    this.callAddDeviceModal.emit(true);
  }
}
