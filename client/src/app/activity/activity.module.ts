import { CoreClientModule } from '@aitheon/core-client';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { InfrastructureMapModule } from '../infrastructure-map';
import { SharedModule } from '../shared/shared.module';

import { ActivityRoutingModule } from './activity-routing.module';
import { ActivityDashboardComponent } from './activity-dashboard/activity-dashboard.component';
import { TasksListComponent } from './tasks-list/tasks-list.component';
import { TaskItemComponent } from './task-item/task-item.component';
import { ActivityMapComponent } from './activity-map/activity-map.component';
import { FiltersMenuComponent } from './filters-menu/filters-menu.component';


@NgModule({
  declarations: [ActivityDashboardComponent, TasksListComponent, TaskItemComponent, ActivityMapComponent, FiltersMenuComponent],
  imports: [
    CommonModule,
    SharedModule,
    ActivityRoutingModule,
    ReactiveFormsModule,
    CoreClientModule,
    InfrastructureMapModule
  ]
})
export class ActivityModule { }
