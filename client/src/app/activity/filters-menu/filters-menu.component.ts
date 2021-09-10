import { TasksAttributes } from './../activity-dashboard/activity-dashboard.component';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Infrastructure as InfrastructureDB, Floor as FloorDB, Device as DeviceDB, Area as AreaDB } from '@aitheon/smart-infrastructure';
import { Component, OnInit, Input, EventEmitter, Output, OnDestroy } from '@angular/core';

export class Floor extends FloorDB {
  isChecked?: boolean;
  areas?: [];
  isAreasOpen?: boolean;
}
export class Device extends DeviceDB {
  isChecked?: boolean;
}
export class Infrastructure extends InfrastructureDB {
  selectedFloors?: any[];
  allFloorsSelected?: boolean;
}
export class Area extends AreaDB {
  isChecked?: boolean;
}
@Component({
  selector: 'ai-filters-menu',
  templateUrl: './filters-menu.component.html',
  styleUrls: ['./filters-menu.component.scss']
})
export class FiltersMenuComponent implements OnInit, OnDestroy {
  private subscriptions$ = new Subscription();

  @Output() infrastructuresFilter: EventEmitter<Object> = new EventEmitter<Object>();
  @Output() subjectsFilter: EventEmitter<Object> = new EventEmitter<Object>();
  @Output() eventsFilter: EventEmitter<Object> = new EventEmitter<Object>();
  @Input() infrastructures: Infrastructure[];
  @Input() subjects: any[];
  @Input() events: any[];
  @Input() tasksAttributes: TasksAttributes;

  filteredInfrastructures: Infrastructure[];
  filteredSubjects: any[];
  filteredEvents: any[];

  serviceKey: any;
  organizationId: string;
  activeInfrastructure: any;
  activeSubjectItem: any = null;
  activeEventItem: any = null;
  floors: Floor[];
  infrastructuresSearchForm: FormGroup;
  subjectsSearchForm: FormGroup;
  eventsSearchForm: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.filteredInfrastructures = this.infrastructures;
    this.buildSearchForms(); 
  }

  buildSearchForms() {
    this.infrastructuresSearchForm = this.fb.group({
      search: ''
    });

    this.subjectsSearchForm = this.fb.group({
      search: ''
    });

    this.eventsSearchForm = this.fb.group({
      search: ''
    });

    this.infrastructuresSearchForm.get('search').valueChanges.subscribe(searchText => {
      this.filteredInfrastructures = this.infrastructures.filter(infrastructure => infrastructure.name.toLowerCase().includes(searchText.toLowerCase()))
    });

    this.subjectsSearchForm.get('search').valueChanges.subscribe(searchText => {
      this.filteredSubjects = this.activeSubjectItem.items.filter(subject => subject.name.toLowerCase().includes(searchText.toLowerCase()))
    });

    this.eventsSearchForm.get('search').valueChanges.subscribe(searchText => {
      this.filteredEvents = this.activeEventItem.items.filter(event => event?.name?.toLowerCase().includes(searchText.toLowerCase()))
    });
  }
  // !!!!!!!!!!!!!!!!!!! INFRASTRUCTURES !!!!!!!!!!!!!!!!!!!

  chooseInfrastructure(infrastructure: Infrastructure) {
    this.activeInfrastructure = infrastructure;
  }

  selectFloor(floor: Floor) {
    if (floor.isChecked) {
      floor.isChecked = false;
      floor?.areas?.forEach((area: Area) => {
        area.isChecked = false
      });
      floor.isAreasOpen = false;
    } else {
      floor.isChecked = true;
      floor?.areas?.forEach((area: Area) => {
        area.isChecked = true
      });
      floor.isAreasOpen = true;
    }
    this.infrastructuresFilter.emit(this.infrastructures);
  }

  selectTasksWithoutAreas(floor: Floor) {
    floor.isChecked = !floor.isChecked;
  }

  isSomeAreasChecked(floor: Floor) {
    return floor.areas?.some((area: Area) => area.isChecked);
  }

  selectArea(area: Area, i: Number) {
    if (area.isChecked) {
      area.isChecked = false;
    } else {
      area.isChecked = true;
    }
    this.infrastructuresFilter.emit(this.infrastructures);
  }

  openAreasList(event: Event, floor: Floor) {
    event.preventDefault();
    event.stopPropagation();

    floor.isAreasOpen = !floor.isAreasOpen;
  }

  selectAllFloors() {
    if (this.activeInfrastructure.allFloorsSelected) {
      this.infrastructures.map(infrastructure => {
        if (infrastructure._id === this.activeInfrastructure._id) {
          infrastructure.allFloorsSelected = false;
          infrastructure.floors.forEach((floor: Floor) => {
            floor.isChecked = false;
            floor.areas.forEach((area: Area) => {
              area.isChecked = false;
            });
          });
        }
      });
    } else {
      this.infrastructures.map(infrastructure => {
        if (infrastructure._id === this.activeInfrastructure._id) {
          infrastructure.allFloorsSelected = true;
          infrastructure.floors.forEach((floor: Floor) => {
            floor.isChecked = true;
            floor.areas.forEach((area: Area) => {
              area.isChecked = true;
            });
          })
        }
      });
    }
    this.infrastructuresFilter.emit(this.infrastructures);
  }

  isSomeChecked(infrastructure: Infrastructure) {
    return infrastructure.floors.some((floor: Floor) => floor.isChecked);
  }

  isSomeAreasCheckedInFloors(infrastructure: Infrastructure) {
    return infrastructure.floors.some((floor: Floor) => floor.areas.some((area: Area) => area.isChecked));
  }
  // !!!!!!!!!!!!!!!!!!! INFRASTRUCTURES !!!!!!!!!!!!!!!!!!!

  // !!!!!!!!!!!!!!!!!!! SUBJECTS !!!!!!!!!!!!!!!!!!!
  chooseSubjectItem(item) {
    this.activeSubjectItem = item;
    this.filteredSubjects = this.activeSubjectItem.items;
  }

  selectSubject(subject: Device) {
    if (subject.isChecked) {
      subject.isChecked = false;
    } else {
      subject.isChecked = true;
    }
    this.subjectsFilter.emit(this.subjects);
  }

  selectAllSubjects() {
    if (this.activeSubjectItem.allItemsSelected) {
      this.subjects.map(subject => {
        if (subject._id === this.activeSubjectItem._id) {
          subject.allItemsSelected = false;
          subject.items.forEach((item: Floor) => {
            item.isChecked = false;
          })
        }
      });
    } else {
      this.subjects.map(subject => {
        if (subject._id === this.activeSubjectItem._id) {
          subject.allItemsSelected = true;
          subject.items.forEach((item: Floor) => {
            item.isChecked = true;
          })
        }
      });
    }

    this.subjectsFilter.emit(this.subjects);
  }

  isSomeItemsSelected(subject) {
    return subject.items.some(item => item.isChecked);
  }
  // !!!!!!!!!!!!!!!!!!! SUBJECTS !!!!!!!!!!!!!!!!!!!

  // !!!!!!!!!!!!!!!!!!! EVENTS !!!!!!!!!!!!!!!!!!!
  selectEventItem(item: any) {
    this.activeEventItem = item;
    this.filteredEvents = this.activeEventItem.items;
  }
  
  selectEvent(item: any) {
    if (item.isChecked) {
      item.isChecked = false;
    } else {
      item.isChecked = true;
    }
    
    this.eventsFilter.emit(this.events);
  }

  selectAllEvents() {
    if (this.activeEventItem.allItemsSelected) {
      this.events.map(event => {
        if (event._id === this.activeEventItem._id) {
          event.allItemsSelected = false;
          event.items.forEach((item: Floor) => {
            item.isChecked = false;
          })
        }
      });
    } else {
      this.events.map(event => {
        if (event._id === this.activeEventItem._id) {
          event.allItemsSelected = true;
          event.items.forEach((item: Floor) => {
            item.isChecked = true;
          })
        }
      });
    }
    this.eventsFilter.emit(this.events);
  }

  isSomeEventItemsSelected(event) {
    return event.items.some(item => item.isChecked);
  }

  // !!!!!!!!!!!!!!!!!!! EVENTS !!!!!!!!!!!!!!!!!!!

  ngOnDestroy() {
    try {
      this.subscriptions$.unsubscribe();
    } catch (error) {}
  }
}