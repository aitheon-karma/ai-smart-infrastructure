import { SharedModule } from './../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TasksRoutingModule } from './tasks-routing.module';
import { TasksListComponent } from './tasks-list/tasks-list.component';
import { CoreClientModule } from '@aitheon/core-client';
import { InboundComponent } from './tasks-list/inbound/inbound.component';
import { OutboundComponent } from './tasks-list/outbound/outbound.component';
import { PickPackStationsComponent } from './tasks-list/pick-pack-stations/pick-pack-stations.component';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { NgxSmoothDnDModule } from 'ngx-smooth-dnd';

@NgModule({
  declarations: [TasksListComponent, InboundComponent, OutboundComponent, PickPackStationsComponent],
  imports: [
    CoreClientModule,
    CommonModule,
    TasksRoutingModule,
    SharedModule,
    TooltipModule.forRoot(),
    NgxSmoothDnDModule
  ]
})
export class TasksModule { }
